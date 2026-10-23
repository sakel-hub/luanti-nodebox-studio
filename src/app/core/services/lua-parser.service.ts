import { Injectable } from '@angular/core';
import { Box, FaceTextures, LUANTI_FACE_DIRECTIONS } from '../models/nodebox.model';
import { parseCoordinateString } from '../utils/fraction.utils';

export interface ParseResult {
  boxes: Box[];
  nodeName?: string;
  tiles?: string[];
  warnings: string[];
}

const BOX_PALETTE = [
  '#38bdf8', // sky
  '#f59e0b', // amber
  '#10b981', // emerald
  '#a855f7', // purple
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6'  // teal
];

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
    if (!trimmed) return 0;

    // Direct fraction or number
    const simple = parseCoordinateString(trimmed);
    if (!isNaN(simple)) return simple;

    // Tokenize numbers, +, -, *, /
    const tokens = trimmed.match(/([+-]?\d+(?:\.\d+)?|\+|\-|\*|\/)/g);
    if (!tokens) return 0;

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

      return isNaN(result) ? 0 : result;
    } catch {
      return 0;
    }
  }

  /**
   * Strips Lua block and line comments.
   */
  private stripComments(luaCode: string): string {
    return luaCode
      .replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, '') // Multiline comments --[[ ... ]]
      .replace(/--.*$/gm, '');                  // Single line comments -- ...
  }

  /**
   * Extracts node name e.g. minetest.register_node("mod:name", ...)
   */
  private extractNodeName(code: string): string | undefined {
    const match = code.match(/(?:core|minetest)\.register_node\s*\(\s*["']([^"']+)["']/);
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
   * Parses Lua code and extracts all valid 6-coordinate boxes.
   */
  public parse(luaCode: string): ParseResult {
    const warnings: string[] = [];
    if (!luaCode || !luaCode.trim()) {
      return { boxes: [], warnings: ['Empty Lua code input'] };
    }

    const nodeName = this.extractNodeName(luaCode);
    const tiles = this.extractTiles(luaCode);
    const cleanCode = this.stripComments(luaCode);

    // Find all curly brace groups that could be box definitions: { num, num, num, num, num, num }
    // Handles nested spaces, signs, fractions (e.g. -8/16)
    const braceRegex = /\{([^{}]+)\}/g;
    let match: RegExpExecArray | null;
    const rawBoxes: number[][] = [];

    while ((match = braceRegex.exec(cleanCode)) !== null) {
      const content = match[1].trim();
      const parts = content.split(',').map(p => p.trim()).filter(p => p.length > 0);

      // Check if this brace group has exactly 6 elements
      if (parts.length === 6) {
        const coords = parts.map(p => this.evaluateExpression(p));
        // Verify all 6 are valid numbers
        if (coords.every(c => !isNaN(c))) {
          rawBoxes.push(coords);
        }
      }
    }

    if (rawBoxes.length === 0) {
      warnings.push('No 6-coordinate nodebox definitions {x1, y1, z1, x2, y2, z2} found in the provided code.');
    }

    // Convert raw tuples into Box entities
    const boxes: Box[] = rawBoxes.map((coords, idx) => {
      let [x1, y1, z1, x2, y2, z2] = coords;

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

      // Assign tiles if available
      let faceTextures: FaceTextures | undefined = undefined;
      if (tiles && tiles.length > 0) {
        faceTextures = {};
        LUANTI_FACE_DIRECTIONS.forEach((dir, dirIdx) => {
          const tile = tiles[dirIdx] ?? tiles[0];
          faceTextures![dir] = tile;
        });
      }

      return {
        id: `box_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        name: `Box ${idx + 1}`,
        minX,
        minY,
        minZ,
        maxX,
        maxY,
        maxZ,
        visible: true,
        locked: false,
        color,
        textures: faceTextures
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
