import { describe, it, expect, beforeEach } from 'vitest';
import { LuaParserService } from './lua-parser.service';
import { LuaGeneratorService } from './lua-generator.service';
import { TextureService } from './texture.service';
import { NodeboxProject } from '../models/nodebox.model';

describe('LuaParserService & LuaGeneratorService', () => {
  let parser: LuaParserService;
  let generator: LuaGeneratorService;

  beforeEach(() => {
    parser = new LuaParserService();
    generator = new LuaGeneratorService();
  });

  it('parses modern core.register_node with fractions and comments', () => {
    const luaCode = `
      -- Modern Luanti core.register_node definition
      core.register_node("stairs:slab_wood", {
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

  it('parses legacy minetest.register_node for backward compatibility', () => {
    const luaCode = `
      minetest.register_node("legacy:stone_slab", {
          tiles = {"default_stone.png"},
          node_box = {
              type = "fixed",
              fixed = {
                  {-0.5, -0.5, -0.5, 0.5, 0, 0.5}
              }
          }
      })
    `;

    const result = parser.parse(luaCode);
    expect(result.nodeName).toBe('legacy:stone_slab');
    expect(result.boxes.length).toBe(1);
    expect(result.boxes[0].minX).toBe(-0.5);
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

  it('generates core.register_node template', () => {
    const project: NodeboxProject = {
      id: 'test',
      name: 'Custom Block',
      nodeName: 'mymod:custom_block',
      format: 'fractions_16',
      exportTemplate: 'register_node',
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
          maxY: 0,
          maxZ: 0.5,
          visible: true,
          locked: false,
          color: '#38bdf8'
        }
      ]
    };

    const lua = generator.generate(project);
    expect(lua).toContain('core.register_node("mymod:custom_block", {');
    expect(lua).not.toContain('minetest.register_node');
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

  it('parses and generates tiles with ^[transformFX modifier', () => {
    const luaCode = `
      CustomMod:register_node('custom_mod:crystal_lantern', {
          tiles = {
              'custom_crystal_top.png',
              'custom_crystal_bottom.png',
              'custom_crystal_side_x.png',
              'custom_crystal_side_x.png^[transformFX',
              'custom_crystal_side_z.png^[transformFX',
              'custom_crystal_side_z.png',
          },
          node_box = {
              type = 'fixed',
              fixed = {
                  {-0.3125, -0.5, -0.3125, -0.25, 0.0, -0.25}
              }
          }
      })
    `;

    const result = parser.parse(luaCode);
    expect(result.tiles).toBeDefined();
    expect(result.tiles?.length).toBe(6);
    expect(result.tiles?.[3]).toBe('custom_crystal_side_x.png^[transformFX');
    expect(result.tiles?.[4]).toBe('custom_crystal_side_z.png^[transformFX');

    const project: NodeboxProject = {
      id: 'crystal',
      name: 'Crystal Lantern',
      nodeName: 'custom_mod:crystal_lantern',
      format: 'fractions_16',
      exportTemplate: 'register_node',
      snapResolution: 16,
      updatedAt: Date.now(),
      globalTextures: {
        top: result.tiles![0],
        bottom: result.tiles![1],
        right: result.tiles![2],
        left: result.tiles![3],
        back: result.tiles![4],
        front: result.tiles![5]
      },
      boxes: result.boxes
    };

    const exported = generator.generate(project);
    expect(exported).toContain('"custom_crystal_side_x.png^[transformFX", -- left');
    expect(exported).toContain('"custom_crystal_side_z.png^[transformFX", -- back');
  });

  it('correctly imports complex multi-box definition with 14 boxes, comment names, and ignores selection_box and tiles', () => {
    const complexLua = `
CustomMod:register_node('custom_mod:complex_plant', {
    description = S('Complex Plant'),
    short_description = S('Complex Plant'),
    drawtype = 'nodebox',
    tiles = {
        'custom_plant_top.png',
        'custom_plant_bottom.png',
        'custom_plant_side_x.png',
        'custom_plant_side_x.png^[transformFX',
        'custom_plant_side_z.png^[transformFX',
        'custom_plant_side_z.png',
    },
    use_texture_alpha = 'clip',
    selection_box = {
        type = 'fixed',
        fixed = { -8 / 16, -8 / 16, -8 / 16, 8 / 16, 2 / 16, 8 / 16 },
    },
    node_box = {
        type = 'fixed',
        fixed = {
            { -0.3125, -0.5000, -0.3125, -0.2500, 0.000, -0.2500 }, -- stem 1
            { -0.5000, 0.000, -0.5000, -0.06250, 0.06250, -0.06250 }, -- branch 1 A
            { -0.4375, 0.06250, -0.4375, -0.1250, 0.1250, -0.1250 }, -- branch 1 B
            { 0.3125, -0.3125, -0.2500, 0.5000, -0.2500, -0.06250 }, -- branch 2 top
            { 0.3750, -0.5000, -0.1875, 0.4375, -0.3125, -0.1250 }, -- branch 2 stem
            { 0.06250, -0.3750, -0.5000, 0.2500, -0.3125, -0.3125 }, -- branch 3 top
            { 0.1250, -0.5000, -0.4375, 0.1875, -0.3750, -0.3750 }, -- branch 3 stem
            { 0.06250, -0.1875, 0.06250, 0.5000, -0.1250, 0.5000 }, -- branch 4 top A
            { 0.1250, -0.1250, 0.1250, 0.4375, -0.06250, 0.4375 }, -- branch 4 top B
            { 0.2500, -0.5000, 0.2500, 0.3125, -0.1875, 0.3125 }, -- branch 4 stem
            { -0.2500, -0.3125, 0.000, 0.000, -0.2500, 0.2500 }, -- branch 5 top
            { -0.1875, -0.5000, 0.06250, -0.06250, -0.2500, 0.1875 }, -- branch 5 stem
            { -0.5000, -0.2500, 0.3125, -0.3125, -0.1875, 0.5000 }, -- branch 6 top
            { -0.4375, -0.5000, 0.3750, -0.3750, -0.2500, 0.4375 }, -- branch 6 stem
        }
    }
})
    `;

    const result = parser.parse(complexLua);
    expect(result.nodeName).toBe('custom_mod:complex_plant');
    expect(result.tiles?.length).toBe(6);

    // Exactly 14 boxes must be extracted (no 0,0,0 and no selection_box)
    expect(result.boxes.length).toBe(14);

    // Verify box names come from author's inline comments
    expect(result.boxes[0].name).toBe('stem 1');
    expect(result.boxes[1].name).toBe('branch 1 A');
    expect(result.boxes[2].name).toBe('branch 1 B');
    expect(result.boxes[3].name).toBe('branch 2 top');
    expect(result.boxes[4].name).toBe('branch 2 stem');
    expect(result.boxes[5].name).toBe('branch 3 top');
    expect(result.boxes[6].name).toBe('branch 3 stem');
    expect(result.boxes[7].name).toBe('branch 4 top A');
    expect(result.boxes[8].name).toBe('branch 4 top B');
    expect(result.boxes[9].name).toBe('branch 4 stem');
    expect(result.boxes[10].name).toBe('branch 5 top');
    expect(result.boxes[11].name).toBe('branch 5 stem');
    expect(result.boxes[12].name).toBe('branch 6 top');
    expect(result.boxes[13].name).toBe('branch 6 stem');

    // Verify coordinates of the first box
    expect(result.boxes[0].minX).toBe(-0.3125);
    expect(result.boxes[0].minY).toBe(-0.5);
    expect(result.boxes[0].minZ).toBe(-0.3125);
    expect(result.boxes[0].maxX).toBe(-0.25);
    expect(result.boxes[0].maxY).toBe(0.0);
    expect(result.boxes[0].maxZ).toBe(-0.25);

    // Ensure selection box was not added (selection box spans -0.5 to 0.5 in X and Z)
    const hasSelectionBox = result.boxes.some(b => b.minX === -0.5 && b.maxX === 0.5 && b.minZ === -0.5 && b.maxZ === 0.5);
    expect(hasSelectionBox).toBe(false);

    // Ensure 0,0,0 box from tiles was not added
    const hasZeroBox = result.boxes.some(b => b.minX === 0 && b.maxX === 0 && b.minY === 0 && b.maxY === 0);
    expect(hasZeroBox).toBe(false);
  });

  it('parses animated vertical frame sheet tiles with backface culling and animation config', () => {
    const pyreLua = `
core.register_node("custom_mod:brazier_fire", {
    description = "Brazier Fire",
    tiles = {
        "custom_brazier_top.png",
        "custom_brazier_top.png",
        "custom_brazier_side.png",
        "custom_brazier_side.png",
        "custom_brazier_side.png",
        {
            name = "custom_brazier_flame_animated.png",
            animation = {
                type = "vertical_frames",
                aspect_w = 16,
                aspect_h = 16,
                length = 1.5,
            },
            backface_culling = false,
        },
    },
    drawtype = "nodebox",
    paramtype = "light",
    paramtype2 = "facedir",
    node_box = {
        type = "fixed",
        fixed = {
            {-0.5, -0.5, -0.5, 0.5, -0.3125, 0.5}, -- stone base
            {-0.0625, -0.3125, -0.0625, 0.0625, 0.5, 0.0625}, -- flame pillar
        }
    }
})
    `;

    const result = parser.parse(pyreLua);
    expect(result.nodeName).toBe('custom_mod:brazier_fire');
    expect(result.tiles?.length).toBe(6);
    expect(result.tiles?.[5]).toBe('custom_brazier_flame_animated.png');

    // Verify parsedTiles rich metadata
    expect(result.parsedTiles).toBeDefined();
    expect(result.parsedTiles?.length).toBe(6);
    const animatedTile = result.parsedTiles?.[5];
    expect(animatedTile?.name).toBe('custom_brazier_flame_animated.png');
    expect(animatedTile?.animation).toBeDefined();
    expect(animatedTile?.animation?.type).toBe('vertical_frames');
    expect(animatedTile?.animation?.aspect_w).toBe(16);
    expect(animatedTile?.animation?.aspect_h).toBe(16);
    expect(animatedTile?.animation?.length).toBe(1.5);
    expect(animatedTile?.backfaceCulling).toBe(false);

    // Verify boxes
    expect(result.boxes.length).toBe(2);
    expect(result.boxes[0].name).toBe('stone base');
    expect(result.boxes[1].name).toBe('flame pillar');
  });

  it('generates Luanti table tile definitions for animated textures with vertical_frames', () => {
    const textureService = new TextureService();
    textureService.addCustomTexture('custom_flame.png', 'data:image/png;base64,flame');
    textureService.updateTextureProperties('custom_flame.png', {
      animation: {
        type: 'vertical_frames',
        aspect_w: 16,
        aspect_h: 16,
        length: 2.0
      },
      backfaceCulling: false
    });

    const customGen = new LuaGeneratorService(textureService);
    const testProject: NodeboxProject = {
      id: 'test-anim',
      name: 'Animated Flame Project',
      nodeName: 'test:animated_flame',
      format: 'decimal',
      exportTemplate: 'register_node',
      snapResolution: 16,
      updatedAt: Date.now(),
      globalTextures: {
        top: 'default_stone.png',
        bottom: 'default_stone.png',
        right: 'default_stone.png',
        left: 'default_stone.png',
        back: 'default_stone.png',
        front: 'custom_flame.png'
      },
      boxes: [
        {
          id: 'box-1',
          name: 'Flame Box',
          minX: -0.5,
          minY: -0.5,
          minZ: -0.5,
          maxX: 0.5,
          maxY: 0.5,
          maxZ: 0.5,
          color: '#ffaa00',
          visible: true,
          locked: false
        }
      ]
    };

    const lua = customGen.generate(testProject);
    expect(lua).toContain('core.register_node("test:animated_flame"');
    expect(lua).toContain('"default_stone.png", -- top');
    expect(lua).toContain('name = "custom_flame.png"');
    expect(lua).toContain('type = "vertical_frames"');
    expect(lua).toContain('aspect_w = 16');
    expect(lua).toContain('aspect_h = 16');
    expect(lua).toContain('length = 2');
    expect(lua).toContain('backface_culling = false');
  });

  it('parses connected nodebox with slot-tagged boxes and connects_to', () => {
    const luaCode = `
      core.register_node("default:fence_wood", {
          description = "Apple Wood Fence",
          drawtype = "nodebox",
          connects_to = {"group:fence", "group:wood"},
          node_box = {
              type = "connected",
              fixed = {
                  {-2/16, -8/16, -2/16, 2/16, 8/16, 2/16}, -- Center Post
              },
              connect_front = {
                  {-1/16, 3/16, -8/16, 1/16, 5/16, -2/16}, -- Top Rail
                  {-1/16, -5/16, -8/16, 1/16, -3/16, -2/16}, -- Bottom Rail
              },
              connect_back = {
                  {-1/16, 3/16, 2/16, 1/16, 5/16, 8/16},
              }
          }
      })
    `;

    const result = parser.parse(luaCode);
    expect(result.nodeName).toBe('default:fence_wood');
    expect(result.nodeboxType).toBe('connected');
    expect(result.connectsTo).toEqual(['group:fence', 'group:wood']);
    expect(result.boxes.length).toBe(4);

    const post = result.boxes.find(b => b.name === 'Center Post')!;
    expect(post).toBeDefined();
    expect(post.slot).toBe('fixed');

    const frontBoxes = result.boxes.filter(b => b.slot === 'connect_front');
    expect(frontBoxes.length).toBe(2);

    const backBoxes = result.boxes.filter(b => b.slot === 'connect_back');
    expect(backBoxes.length).toBe(1);
  });

  it('parses wallmounted nodebox with floor, ceiling, and wall slots', () => {
    const luaCode = `
      core.register_node("default:torch", {
          description = "Torch",
          drawtype = "nodebox",
          paramtype2 = "wallmounted",
          node_box = {
              type = "wallmounted",
              wall_top = {-1/16, 0.25, -1/16, 1/16, 0.5, 1/16},
              wall_bottom = {-1/16, -0.5, -1/16, 1/16, -0.25, 1/16},
              wall_side = {-0.5, -0.25, -1/16, -0.25, 0.25, 1/16}
          }
      })
    `;

    const result = parser.parse(luaCode);
    expect(result.nodeName).toBe('default:torch');
    expect(result.nodeboxType).toBe('wallmounted');
    expect(result.boxes.length).toBe(3);

    expect(result.boxes.some(b => b.slot === 'wall_top')).toBe(true);
    expect(result.boxes.some(b => b.slot === 'wall_bottom')).toBe(true);
    expect(result.boxes.some(b => b.slot === 'wall_side')).toBe(true);
  });

  it('parses regular nodebox and synthesizes default unit cube when empty', () => {
    const luaCode = `
      core.register_node("default:stone", {
          drawtype = "nodebox",
          node_box = {
              type = "regular"
          }
      })
    `;

    const result = parser.parse(luaCode);
    expect(result.nodeboxType).toBe('regular');
    expect(result.boxes.length).toBe(1);
    expect(result.boxes[0].minX).toBe(-0.5);
    expect(result.boxes[0].maxX).toBe(0.5);
  });
});



