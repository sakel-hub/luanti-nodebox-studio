import { Injectable } from '@angular/core';
import { BOX_PALETTE, Box, FaceTextures, LUANTI_FACE_DIRECTIONS } from '../models/nodebox.model';
import { parseCoordinateString } from '../utils/fraction.utils';

export interface ParseResult {
  boxes: Box[];
  nodeName?: string;
  tiles?: string[];
  warnings: string[];
}

@Injectable({
  providedIn: 'root'
})
export class LuaParserService {
  /**
   * Safely evaluate a simple arithmetic expression (e.g. "-8/16", "5/16", "16/8", "-0.5")
   * without using eval().
   */
  private evaluateExpression(expr: string): number {
    const trimmed = expr.trim();
    if (!trimmed) return NaN;

    // Direct fraction or number
    const simple = parseCoordinateString(trimmed);
    if (!isNaN(simple)) return simple;

    // Tokenize numbers, +, -, *, /
    const tokens = trimmed.match(/([+-]?\d+(?:\.\d+)?|\+|\-|\*|\/)/g);
    if (!tokens || tokens.length === 0) return NaN;

    // Verify at least one number token exists
    if (!tokens.some(t => /^[+-]?\d+(?:\.\d+)?$/.test(t))) {
      return NaN;
    }

    try {
      // Basic precedence parser for +, -, *, /
      let values: number[] = [];
      let ops: string[] = [];

      let i = 0;
      while (i < tokens.length) {
        const token = tokens[i];
        if (/^[+-]?\d+(?:\.\d+)?$/.test(token)) {
          values.push(parseFloat(token));
        } else if (token === '*' || token === '/') {
          const nextToken = tokens[++i];
          const nextVal = parseFloat(nextToken);
          const prevVal = values.pop() ?? 0;
          if (token === '*') {
            values.push(prevVal * nextVal);
          } else {
            values.push(nextVal !== 0 ? prevVal / nextVal : 0);
          }
        } else if (token === '+' || token === '-') {
          ops.push(token);
        }
        i++;
      }

      let result = values[0] ?? 0;
      for (let j = 0; j < ops.length; j++) {
        const op = ops[j];
        const nextVal = values[j + 1] ?? 0;
        if (op === '+') result += nextVal;
        if (op === '-') result -= nextVal;
      }

      return isNaN(result) ? NaN : result;
    } catch {
      return NaN;
    }
  }

  /**
   * Strips multiline Lua block comments (--[[ ... ]]) while keeping single-line comments intact.
   */
  private stripBlockComments(luaCode: string): string {
    return luaCode.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, '');
  }

  /**
   * Extracts node name e.g. minetest.register_node("mod:name", ...), core.register_node, or Mod:register_node
   */
  private extractNodeName(code: string): string | undefined {
    const match = code.match(/(?:core|minetest|[a-zA-Z0-9_]+)[.:]register_node\s*\(\s*["']([^"']+)["']/);
    return match ? match[1] : undefined;
  }

  /**
   * Extracts texture tiles e.g. tiles = { "top.png", "bottom.png", ... } or tiles = "single.png"
   */
  private extractTiles(code: string): string[] | undefined {
    // Single string: tiles = "wood.png"
    const singleMatch = code.match(/tiles\s*=\s*["']([^"']+)["']/);
    if (singleMatch) {
      return [singleMatch[1]];
    }

    // Table: tiles = { "top.png", "bot.png", ... }
    const tableMatch = code.match(/tiles\s*=\s*\{([^}]+)\}/);
    if (tableMatch) {
      const inside = tableMatch[1];
      const stringMatches = inside.match(/["']([^"']+)["']/g);
      if (stringMatches) {
        return stringMatches.map(s => s.replace(/["']/g, '').trim());
      }
    }

    return undefined;
  }

  /**
   * Extracts the relevant block for box parsing (preferring node_box, then fixed, or falling back to full code).
   */
  private extractBoxTargetBlock(code: string): string {
    // 1. Look for node_box = { ... }
    const nodeBoxMatch = code.match(/node_box\s*=\s*\{/);
    if (nodeBoxMatch && nodeBoxMatch.index !== undefined) {
      const block = this.extractBalancedBraceBlock(code, nodeBoxMatch.index + nodeBoxMatch[0].length - 1);
      if (block) return block;
    }

    // 2. Look for fixed = { ... }
    const fixedMatch = code.match(/fixed\s*=\s*\{/);
    if (fixedMatch && fixedMatch.index !== undefined) {
      const block = this.extractBalancedBraceBlock(code, fixedMatch.index + fixedMatch[0].length - 1);
      if (block) return block;
    }

    // 3. Fallback to full code
    return code;
  }

  private extractBalancedBraceBlock(code: string, startBraceIdx: number): string | null {
    let depth = 0;
    for (let i = startBraceIdx; i < code.length; i++) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') {
        depth--;
        if (depth === 0) {
          return code.substring(startBraceIdx, i + 1);
        }
      }
    }
    return null;
  }

  /**
   * Parses Lua code and extracts all valid 6-coordinate boxes.
   */
  public parse(luaCode: string): ParseResult {
    const warnings: string[] = [];
    if (!luaCode || !luaCode.trim()) {
      return { boxes: [], warnings: ['Empty Lua code input'] };
    }

    const nodeName = this.extractNodeName(luaCode);
    const tiles = this.extractTiles(luaCode);

    // Strip multiline block comments, but preserve inline comments for box names
    const cleanCode = this.stripBlockComments(luaCode);
    const targetBlock = this.extractBoxTargetBlock(cleanCode);

    // Match 6-coordinate tuples: { num, num, num, num, num, num } followed optionally by a comma and inline comment
    const boxTupleRegex = /\{([^{}]+)\}\s*,?\s*(?:--[ \t]*([^\r\n]*))?/g;
    let match: RegExpExecArray | null;
    const rawBoxes: { coords: number[]; name?: string }[] = [];

    while ((match = boxTupleRegex.exec(targetBlock)) !== null) {
      const content = match[1].trim();
      const parts = content.split(',').map(p => p.trim()).filter(p => p.length > 0);

      // Check if this brace group has exactly 6 elements
      if (parts.length === 6) {
        const coords = parts.map(p => this.evaluateExpression(p));
        // Verify all 6 are valid numbers
        if (coords.every(c => !isNaN(c))) {
          const commentName = match[2]?.trim();
          rawBoxes.push({
            coords,
            name: commentName && commentName.length > 0 ? commentName : undefined
          });
        }
      }
    }

    if (rawBoxes.length === 0) {
      warnings.push('No 6-coordinate nodebox definitions {x1, y1, z1, x2, y2, z2} found in the provided code.');
    }

    // Convert raw tuples into Box entities
    const boxes: Box[] = rawBoxes.map((raw, idx) => {
      let [x1, y1, z1, x2, y2, z2] = raw.coords;

      // Ensure min is <= max
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      const minZ = Math.min(z1, z2);
      const maxZ = Math.max(z1, z2);

      if (x1 > x2 || y1 > y2 || z1 > z2) {
        warnings.push(`Box ${idx + 1} had inverted coordinates; auto-corrected min/max.`);
      }

      // Check if coordinates exceed standard [-0.5, 0.5]
      if (minX < -0.5 || minY < -0.5 || minZ < -0.5 || maxX > 0.5 || maxY > 0.5 || maxZ > 0.5) {
        warnings.push(`Box ${idx + 1} extends beyond standard Luanti node boundaries [-0.5, 0.5].`);
      }

      const color = BOX_PALETTE[idx % BOX_PALETTE.length];

      return {
        id: `box_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        name: raw.name || `Box ${idx + 1}`,
        minX,
        minY,
        minZ,
        maxX,
        maxY,
        maxZ,
        visible: true,
        locked: false,
        color
      };
    });

    return {
      boxes,
      nodeName,
      tiles,
      warnings: Array.from(new Set(warnings))
    };
  }
}
