import { describe, it, expect, beforeEach } from 'vitest';
import { LuaGeneratorService } from './lua-generator.service';
import { NodeboxProject } from '../models/nodebox.model';

describe('LuaGeneratorService', () => {
  let service: LuaGeneratorService;

  const baseProject: NodeboxProject = {
    id: 'test_p',
    name: 'Test Node',
    nodeName: 'test:node',
    boxes: [
      {
        id: 'b1',
        name: 'Post',
        slot: 'fixed',
        minX: -0.125,
        minY: -0.5,
        minZ: -0.125,
        maxX: 0.125,
        maxY: 0.5,
        maxZ: 0.125,
        visible: true,
        locked: false,
        color: '#38bdf8'
      }
    ],
    globalTextures: {
      top: 'default_wood.png',
      bottom: 'default_wood.png',
      right: 'default_wood.png',
      left: 'default_wood.png',
      back: 'default_wood.png',
      front: 'default_wood.png'
    },
    format: 'fractions_16',
    exportTemplate: 'register_node',
    snapResolution: 16,
    updatedAt: Date.now()
  };

  beforeEach(() => {
    service = new LuaGeneratorService();
  });

  it('generates standard fixed nodebox registration', () => {
    const code = service.generate(baseProject);
    expect(code).toContain('core.register_node("test:node"');
    expect(code).toContain('type = "fixed"');
    expect(code).toContain('{-2/16, -8/16, -2/16, 2/16, 8/16, 2/16}, -- Post');
  });

  it('generates connected nodebox registration with slots and connects_to', () => {
    const connectedProject: NodeboxProject = {
      ...baseProject,
      nodeboxType: 'connected',
      connectsTo: ['group:fence', 'group:wood'],
      boxes: [
        baseProject.boxes[0],
        {
          id: 'b2',
          name: 'Front Rail',
          slot: 'connect_front',
          minX: -0.0625,
          minY: 0.1875,
          minZ: -0.5,
          maxX: 0.0625,
          maxY: 0.3125,
          maxZ: -0.125,
          visible: true,
          locked: false,
          color: '#f59e0b'
        }
      ]
    };

    const code = service.generate(connectedProject);
    expect(code).toContain('type = "connected"');
    expect(code).toContain('connects_to = { "group:fence", "group:wood" }');
    expect(code).toContain('fixed = {');
    expect(code).toContain('connect_front = {');
    expect(code).toContain('-- Front Rail');
  });

  it('generates wallmounted nodebox registration with paramtype2 = "wallmounted"', () => {
    const wallmountedProject: NodeboxProject = {
      ...baseProject,
      nodeboxType: 'wallmounted',
      boxes: [
        {
          id: 'w1',
          name: 'Torch Floor',
          slot: 'wall_bottom',
          minX: -0.0625,
          minY: -0.5,
          minZ: -0.0625,
          maxX: 0.0625,
          maxY: 0.25,
          maxZ: 0.0625,
          visible: true,
          locked: false,
          color: '#b47a46'
        },
        {
          id: 'w2',
          name: 'Torch Wall',
          slot: 'wall_side',
          minX: -0.5,
          minY: -0.25,
          minZ: -0.0625,
          maxX: -0.25,
          maxY: 0.375,
          maxZ: 0.0625,
          visible: true,
          locked: false,
          color: '#b47a46'
        }
      ]
    };

    const code = service.generate(wallmountedProject);
    expect(code).toContain('type = "wallmounted"');
    expect(code).toContain('paramtype2 = "wallmounted"');
    expect(code).toContain('wall_bottom = {');
    expect(code).toContain('wall_side = {');
  });

  it('generates leveled nodebox registration with paramtype2 = "leveled"', () => {
    const leveledProject: NodeboxProject = {
      ...baseProject,
      nodeboxType: 'leveled'
    };

    const code = service.generate(leveledProject);
    expect(code).toContain('type = "leveled"');
    expect(code).toContain('paramtype2 = "leveled"');
    expect(code).toContain('fixed = {');
  });

  it('generates regular nodebox registration with type = "regular"', () => {
    const regularProject: NodeboxProject = {
      ...baseProject,
      nodeboxType: 'regular'
    };

    const code = service.generate(regularProject);
    expect(code).toContain('type = "regular"');
    expect(code).not.toContain('fixed = {');
  });
});
