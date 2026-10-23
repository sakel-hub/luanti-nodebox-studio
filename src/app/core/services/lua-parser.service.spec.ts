import { describe, it, expect, beforeEach } from 'vitest';
import { LuaParserService } from './lua-parser.service';
import { LuaGeneratorService } from './lua-generator.service';
import { NodeboxProject } from '../models/nodebox.model';

describe('LuaParserService & LuaGeneratorService', () => {
  let parser: LuaParserService;
  let generator: LuaGeneratorService;

  beforeEach(() => {
    parser = new LuaParserService();
    generator = new LuaGeneratorService();
  });

  it('parses full register_node with fractions and comments', () => {
    const luaCode = `
      -- Sample luanti slab definition
      minetest.register_node("stairs:slab_wood", {
          description = "Wooden Slab",
          tiles = {"default_wood.png"},
          drawtype = "nodebox",
          node_box = {
              type = "fixed",
              fixed = {
                  {-8/16, -8/16, -8/16, 8/16, 0, 8/16}, -- base slab
                  {-4/16, 0, -4/16, 4/16, 8/16, 4/16}  -- center pillar
              }
          }
      })
    `;

    const result = parser.parse(luaCode);
    expect(result.nodeName).toBe('stairs:slab_wood');
    expect(result.tiles).toEqual(['default_wood.png']);
    expect(result.boxes.length).toBe(2);

    // Box 1: {-0.5, -0.5, -0.5, 0.5, 0, 0.5}
    expect(result.boxes[0].minX).toBe(-0.5);
    expect(result.boxes[0].minY).toBe(-0.5);
    expect(result.boxes[0].minZ).toBe(-0.5);
    expect(result.boxes[0].maxX).toBe(0.5);
    expect(result.boxes[0].maxY).toBe(0);
    expect(result.boxes[0].maxZ).toBe(0.5);

    // Box 2: {-0.25, 0, -0.25, 0.25, 0.5, 0.25}
    expect(result.boxes[1].minX).toBe(-0.25);
    expect(result.boxes[1].minY).toBe(0);
    expect(result.boxes[1].maxX).toBe(0.25);
    expect(result.boxes[1].maxY).toBe(0.5);
  });

  it('parses divisible syntax expressions like 16/8 and decimals', () => {
    const luaCode = `
      fixed = {
        {-8/16, -0.5, -4/8, 16/8, 0.5, 8/16}
      }
    `;

    const result = parser.parse(luaCode);
    expect(result.boxes.length).toBe(1);
    expect(result.boxes[0].minX).toBe(-0.5);
    expect(result.boxes[0].minY).toBe(-0.5);
    expect(result.boxes[0].minZ).toBe(-0.5);
    expect(result.boxes[0].maxX).toBe(2.0); // 16/8 = 2
    expect(result.boxes[0].maxY).toBe(0.5);
    expect(result.boxes[0].maxZ).toBe(0.5);
  });

  it('generates formatted Lua with aligned columns and 16ths format', () => {
    const project: NodeboxProject = {
      id: 'test',
      name: 'Custom Chair',
      nodeName: 'mymod:chair',
      format: 'fractions_16',
      exportTemplate: 'fixed_only',
      snapResolution: 16,
      updatedAt: Date.now(),
      globalTextures: {
        top: 'default_wood.png',
        bottom: 'default_wood.png',
        right: 'default_wood.png',
        left: 'default_wood.png',
        back: 'default_wood.png',
        front: 'default_wood.png'
      },
      boxes: [
        {
          id: 'b1',
          name: 'Seat',
          minX: -0.5,
          minY: -0.25,
          minZ: -0.5,
          maxX: 0.5,
          maxY: -0.125,
          maxZ: 0.5,
          visible: true,
          locked: false,
          color: '#38bdf8'
        }
      ]
    };

    const lua = generator.generate(project);
    expect(lua).toContain('fixed = {');
    expect(lua).toContain('-8/16');
    expect(lua).toContain('-4/16');
    expect(lua).toContain('-2/16');
    expect(lua).toContain('Seat');
  });

  it('generates divisible 16/8 format properly', () => {
    const project: NodeboxProject = {
      id: 'test',
      name: 'Custom Node',
      nodeName: 'mymod:test',
      format: 'divisible_16_8',
      exportTemplate: 'fixed_only',
      snapResolution: 16,
      updatedAt: Date.now(),
      globalTextures: {
        top: 'default_wood.png',
        bottom: 'default_wood.png',
        right: 'default_wood.png',
        left: 'default_wood.png',
        back: 'default_wood.png',
        front: 'default_wood.png'
      },
      boxes: [
        {
          id: 'b1',
          name: 'Base',
          minX: -0.5,
          minY: -0.5,
          minZ: -0.5,
          maxX: 0.5,
          maxY: -0.3125, // -5/16
          maxZ: 0.5,
          visible: true,
          locked: false,
          color: '#38bdf8'
        }
      ]
    };

    const lua = generator.generate(project);
    expect(lua).toContain('-4/8');
    expect(lua).toContain('-5/16');
  });
});
