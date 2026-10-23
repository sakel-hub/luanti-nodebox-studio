import { describe, it, expect } from 'vitest';
import { rotateAABB90, rotateFaceTextures90 } from './rotation.utils';

describe('Rotation Utilities', () => {
  it('rotates box around node origin by 90 degrees around Y (CW)', () => {
    // Front slab: x: [-0.5, 0.5], z: [-0.5, 0]
    const box = {
      minX: -0.5,
      minY: -0.5,
      minZ: -0.5,
      maxX: 0.5,
      maxY: 0.0,
      maxZ: 0.0
    };

    // +90 deg CW around Y
    const rotated = rotateAABB90(box, 'y', 1, { x: 0, y: 0, z: 0 });
    // Should now face Right/East: x: [-0.5, 0], z: [-0.5, 0.5]
    expect(rotated.minX).toBe(-0.5);
    expect(rotated.maxX).toBe(0.0);
    expect(rotated.minZ).toBe(-0.5);
    expect(rotated.maxZ).toBe(0.5);
    expect(rotated.minY).toBe(-0.5);
    expect(rotated.maxY).toBe(0.0);
  });

  it('rotates box around its own center without translating', () => {
    // Long beam on X axis centered at (0.25, 0, 0.25): width 0.5, depth 0.25
    const box = {
      minX: 0.0,
      minY: 0.0,
      minZ: 0.125,
      maxX: 0.5,
      maxY: 0.25,
      maxZ: 0.375
    };
    const center = {
      x: (box.minX + box.maxX) / 2, // 0.25
      y: (box.minY + box.maxY) / 2, // 0.125
      z: (box.minZ + box.maxZ) / 2  // 0.25
    };

    const rotated = rotateAABB90(box, 'y', 1, center);
    // Center must stay unchanged:
    expect((rotated.minX + rotated.maxX) / 2).toBeCloseTo(0.25, 4);
    expect((rotated.minZ + rotated.maxZ) / 2).toBeCloseTo(0.25, 4);
    // Width and Depth must swap: width was 0.5, depth was 0.25
    expect(rotated.maxX - rotated.minX).toBeCloseTo(0.25, 4);
    expect(rotated.maxZ - rotated.minZ).toBeCloseTo(0.5, 4);
  });

  it('rotates 4 times by 90 degrees back to original', () => {
    const original = {
      minX: -0.25,
      minY: -0.5,
      minZ: 0.0,
      maxX: 0.5,
      maxY: 0.25,
      maxZ: 0.375
    };

    let b = { ...original };
    for (let i = 0; i < 4; i++) {
      b = rotateAABB90(b, 'y', 1, { x: 0, y: 0, z: 0 });
    }

    expect(b.minX).toBeCloseTo(original.minX, 4);
    expect(b.maxX).toBeCloseTo(original.maxX, 4);
    expect(b.minZ).toBeCloseTo(original.minZ, 4);
    expect(b.maxZ).toBeCloseTo(original.maxZ, 4);
  });

  it('rotates face textures correctly', () => {
    const textures = {
      top: 'top.png',
      bottom: 'bot.png',
      right: 'right.png',
      left: 'left.png',
      back: 'back.png',
      front: 'front.png'
    };

    const rotated = rotateFaceTextures90(textures, 'y', 1);
    expect(rotated?.top).toBe('top.png');
    expect(rotated?.bottom).toBe('bot.png');
    expect(rotated?.front).toBe('right.png');
    expect(rotated?.left).toBe('front.png');
    expect(rotated?.back).toBe('left.png');
    expect(rotated?.right).toBe('back.png');
  });
});
