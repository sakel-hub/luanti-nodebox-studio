import { Injectable } from '@angular/core';
import {
  BOX_PALETTE,
  Box,
  CONNECTED_SLOTS,
  FaceTextures,
  LUANTI_FACE_DIRECTIONS,
  NodeboxSlot,
  NodeboxType,
  TextureAnimationConfig,
  WALLMOUNTED_SLOTS
} from '../models/nodebox.model';
import { parseCoordinateString } from '../utils/fraction.utils';

export interface ParsedTileItem {
  name: string;
  animation?: TextureAnimationConfig;
  backfaceCulling?: boolean;
}

export interface ParseResult {
  boxes: Box[];
  nodeName?: string;
  nodeboxType?: NodeboxType;
  connectsTo?: string[];
  tiles?: string[];
  parsedTiles?: ParsedTileItem[];
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
        if (op === '-') result += nextVal;
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
   * Extracts node name e.g. core.register_node("mod:name", ...), legacy minetest.register_node, or Mod:register_node
   */
  private extractNodeName(code: string): string | undefined {
    const match = code.match(/(?:core|minetest|[a-zA-Z0-9_]+)[.:]register_node\s*\(\s*["']([^"']+)["']/);
    return match ? match[1] : undefined;
  }

  /**
   * Extracts texture tiles e.g. tiles = { "top.png", "bottom.png", ... } or tiles = "single.png"
   * Supports both simple strings and Luanti animation tables:
   *   { name = "flame.png", animation = { type = "vertical_frames", aspect_w = 16, aspect_h = 16, length = 1.0 } }
   */
  private extractTiles(code: string): { tiles: string[]; parsedTiles: ParsedTileItem[] } | undefined {
    // Single string: tiles = "wood.png"
    const singleMatch = code.match(/tiles\s*=\s*["']([^"']+)["']/);
    if (singleMatch) {
      return {
        tiles: [singleMatch[1]],
        parsedTiles: [{ name: singleMatch[1] }]
      };
    }

    // Table: tiles = { ... }
    const tilesMatch = code.match(/tiles\s*=\s*\{/);
    if (!tilesMatch || tilesMatch.index === undefined) {
      return undefined;
    }

    const startBrace = tilesMatch.index + tilesMatch[0].length - 1;
    const block = this.extractBalancedBraceBlock(code, startBrace);
    if (!block) return undefined;

    // Inside the outer braces { ... }
    const inner = block.slice(1, -1).trim();
    const tiles: string[] = [];
    const parsedTiles: ParsedTileItem[] = [];

    // Parse elements: each element can be a string ("foo.png") or a table ({ name = "...", animation = { ... } })
    let pos = 0;
    while (pos < inner.length) {
      // Skip whitespace and commas
      while (pos < inner.length && /[\s,]/.test(inner[pos])) {
        pos++;
      }
      if (pos >= inner.length) break;

      // Skip single line comments -- ...
      if (inner.slice(pos, pos + 2) === '--') {
        const nextLine = inner.indexOf('\n', pos);
        pos = nextLine === -1 ? inner.length : nextLine + 1;
        continue;
      }

      // Check if item is a table: { ... }
      if (inner[pos] === '{') {
        const itemBlock = this.extractBalancedBraceBlock(inner, pos);
        if (itemBlock) {
          pos += itemBlock.length;
          // Extract name = "..."
          const nameMatch = itemBlock.match(/name\s*=\s*["']([^"']+)["']/);
          if (nameMatch) {
            const name = nameMatch[1];
            let animation: TextureAnimationConfig | undefined;
            const animMatch = itemBlock.match(/animation\s*=\s*\{/);
            if (animMatch && animMatch.index !== undefined) {
              const animStart = animMatch.index + animMatch[0].length - 1;
              const animBlock = this.extractBalancedBraceBlock(itemBlock, animStart);
              if (animBlock) {
                const typeMatch = animBlock.match(/type\s*=\s*["']([^"']+)["']/);
                const wMatch = animBlock.match(/aspect_w\s*=\s*(\d+)/);
                const hMatch = animBlock.match(/aspect_h\s*=\s*(\d+)/);
                const lenMatch = animBlock.match(/length\s*=\s*([0-9.]+)/);
                if (typeMatch && typeMatch[1] === 'vertical_frames') {
                  animation = {
                    type: 'vertical_frames',
                    aspect_w: wMatch ? parseInt(wMatch[1], 10) : 16,
                    aspect_h: hMatch ? parseInt(hMatch[1], 10) : 16,
                    length: lenMatch ? parseFloat(lenMatch[1]) : 1.0
                  };
                }
              }
            }

            let backfaceCulling: boolean | undefined;
            const cullingMatch = itemBlock.match(/backface_culling\s*=\s*(true|false)/);
            if (cullingMatch) {
              backfaceCulling = cullingMatch[1] === 'true';
            }

            tiles.push(name);
            parsedTiles.push({ name, animation, backfaceCulling });
          }
          continue;
        }
      }

      // Check if item is a quoted string: "..." or '...'
      if (inner[pos] === '"' || inner[pos] === "'") {
        const quoteChar = inner[pos];
        const endQuote = inner.indexOf(quoteChar, pos + 1);
        if (endQuote !== -1) {
          const str = inner.slice(pos + 1, endQuote).trim();
          tiles.push(str);
          parsedTiles.push({ name: str });
          pos = endQuote + 1;
          continue;
        }
      }

      pos++;
    }

    if (tiles.length > 0) {
      return { tiles, parsedTiles };
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

  private extractNodeboxType(targetBlock: string): NodeboxType {
    const typeMatch = targetBlock.match(/type\s*=\s*["']([^"']+)["']/i);
    if (typeMatch) {
      const val = typeMatch[1].toLowerCase();
      if (val === 'connected' || val === 'wallmounted' || val === 'leveled' || val === 'regular') {
        return val as NodeboxType;
      }
    }
    return 'fixed';
  }

  private extractConnectsTo(code: string): string[] | undefined {
    const match = code.match(/connects_to\s*=\s*\{/i);
    if (!match || match.index === undefined) return undefined;
    const block = this.extractBalancedBraceBlock(code, match.index + match[0].length - 1);
    if (!block) return undefined;
    const inner = block.slice(1, -1);
    const items = inner.match(/["']([^"']+)["']/g);
    if (items) {
      return items.map(s => s.slice(1, -1));
    }
    return undefined;
  }

  private extractSlotBoxes(
    targetBlock: string,
    slotKeys: readonly NodeboxSlot[]
  ): { slot: NodeboxSlot; coords: number[]; name?: string }[] {
    const result: { slot: NodeboxSlot; coords: number[]; name?: string }[] = [];
    const boxTupleRegex = /\{([^{}]+)\}\s*,?\s*(?:--[ \t]*([^\r\n]*))?/g;

    for (const slot of slotKeys) {
      const regex = new RegExp(`\\b${slot}\\s*=\\s*\\{`, 'i');
      const match = targetBlock.match(regex);
      if (match && match.index !== undefined) {
        const startBrace = match.index + match[0].length - 1;
        const block = this.extractBalancedBraceBlock(targetBlock, startBrace);
        if (block) {
          const inner = block.slice(1, -1).trim();
          // Check if it's a single tuple directly: { -0.1, 0, -0.5, 0.1, 0.2, -0.1 }
          if (!inner.includes('{')) {
            const parts = inner.split(',').map(p => p.trim()).filter(p => p.length > 0);
            if (parts.length === 6) {
              const coords = parts.map(p => this.evaluateExpression(p));
              if (coords.every(c => !isNaN(c))) {
                result.push({ slot, coords, name: `${slot}` });
                continue;
              }
            }
          }

          // Otherwise parse list of box tuples: { { ... }, { ... } }
          let tupleMatch: RegExpExecArray | null;
          boxTupleRegex.lastIndex = 0;
          while ((tupleMatch = boxTupleRegex.exec(block)) !== null) {
            const content = tupleMatch[1].trim();
            const parts = content.split(',').map(p => p.trim()).filter(p => p.length > 0);
            if (parts.length === 6) {
              const coords = parts.map(p => this.evaluateExpression(p));
              if (coords.every(c => !isNaN(c))) {
                const commentName = tupleMatch[2]?.trim();
                result.push({
                  slot,
                  coords,
                  name: commentName && commentName.length > 0 ? commentName : undefined
                });
              }
            }
          }
        }
      }
    }
    return result;
  }

  /**
   * Parses Lua code and extracts all valid 6-coordinate boxes with nodebox types and slots.
   */
  public parse(luaCode: string): ParseResult {
    const warnings: string[] = [];
    if (!luaCode || !luaCode.trim()) {
      return { boxes: [], warnings: ['Empty Lua code input'] };
    }

    const nodeName = this.extractNodeName(luaCode);
    const tilesResult = this.extractTiles(luaCode);
    const tiles = tilesResult?.tiles;
    const parsedTiles = tilesResult?.parsedTiles;
    const connectsTo = this.extractConnectsTo(luaCode);

    // Strip multiline block comments, but preserve inline comments for box names
    const cleanCode = this.stripBlockComments(luaCode);
    const targetBlock = this.extractBoxTargetBlock(cleanCode);
    const nodeboxType = this.extractNodeboxType(targetBlock);

    let rawBoxes: { coords: number[]; name?: string; slot?: NodeboxSlot }[] = [];

    if (nodeboxType === 'connected') {
      rawBoxes = this.extractSlotBoxes(targetBlock, CONNECTED_SLOTS);
    } else if (nodeboxType === 'wallmounted') {
      rawBoxes = this.extractSlotBoxes(targetBlock, WALLMOUNTED_SLOTS);
    }

    // Fallback: If not slot-based or no slot boxes found, parse general 6-tuples as fixed slot
    if (rawBoxes.length === 0) {
      const boxTupleRegex = /\{([^{}]+)\}\s*,?\s*(?:--[ \t]*([^\r\n]*))?/g;
      let match: RegExpExecArray | null;

      while ((match = boxTupleRegex.exec(targetBlock)) !== null) {
        const content = match[1].trim();
        const parts = content.split(',').map(p => p.trim()).filter(p => p.length > 0);

        if (parts.length === 6) {
          const coords = parts.map(p => this.evaluateExpression(p));
          if (coords.every(c => !isNaN(c))) {
            const commentName = match[2]?.trim();
            rawBoxes.push({
              coords,
              name: commentName && commentName.length > 0 ? commentName : undefined,
              slot: 'fixed'
            });
          }
        }
      }
    }

    // If regular cube and no explicit boxes were defined
    if (nodeboxType === 'regular' && rawBoxes.length === 0) {
      rawBoxes.push({
        coords: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
        name: 'Full Cube',
        slot: 'fixed'
      });
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
        slot: raw.slot || 'fixed',
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
      nodeboxType,
      connectsTo,
      tiles,
      parsedTiles,
      warnings: Array.from(new Set(warnings))
    };
  }
}
