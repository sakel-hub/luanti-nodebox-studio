import { describe, it, expect } from 'vitest';
import { computeNodeBoxUVBuffer } from './uv-projection.utils';
import { AABB } from '../models/nodebox.model';

describe('uv-projection.utils', () => {
  it('returns a 48-element Float32Array for all 6 cube faces', () => {
    const fullNode: AABB = { minX: -0.5, minY: -0.5, minZ: -0.5, maxX: 0.5, maxY: 0.5, maxZ: 0.5 };
    const buffer = computeNodeBoxUVBuffer(fullNode);

    expect(buffer).toBeInstanceOf(Float32Array);
    expect(buffer.length).toBe(48);
  });

  it('maps a full 1x1x1 node box exactly to [0, 1] on all faces matching Luanti orientation', () => {
    const fullNode: AABB = { minX: -0.5, minY: -0.5, minZ: -0.5, maxX: 0.5, maxY: 0.5, maxZ: 0.5 };
    const buffer = computeNodeBoxUVBuffer(fullNode);

    // Face 1: Front (-Z) -> indices 8..15
    // v0(TR): u=1, v=0; v1(TL): u=0, v=0; v2(BL): u=0, v=1; v3(BR): u=1, v=1
    expect(buffer[8]).toBeCloseTo(1.0);  // v0 u
    expect(buffer[9]).toBeCloseTo(0.0);  // v0 v (top of texture)
    expect(buffer[10]).toBeCloseTo(0.0); // v1 u
    expect(buffer[11]).toBeCloseTo(0.0); // v1 v (top of texture)
    expect(buffer[12]).toBeCloseTo(0.0); // v2 u
    expect(buffer[13]).toBeCloseTo(1.0); // v2 v (bottom of texture)
    expect(buffer[14]).toBeCloseTo(1.0); // v3 u
    expect(buffer[15]).toBeCloseTo(1.0); // v3 v (bottom of texture)

    // Face 0: Back (+Z) -> indices 0..7
    expect(buffer[0]).toBeCloseTo(1.0);  // v0 u
    expect(buffer[1]).toBeCloseTo(0.0);  // v0 v
    expect(buffer[2]).toBeCloseTo(0.0);  // v1 u
    expect(buffer[3]).toBeCloseTo(0.0);  // v1 v
    expect(buffer[4]).toBeCloseTo(0.0);  // v2 u
    expect(buffer[5]).toBeCloseTo(1.0);  // v2 v
    expect(buffer[6]).toBeCloseTo(1.0);  // v3 u
    expect(buffer[7]).toBeCloseTo(1.0);  // v3 v

    // Face 4: Top (+Y) -> indices 32..39
    // North (+Z) is top of texture (v=0), South (-Z) is bottom of texture (v=1)
    expect(buffer[32]).toBeCloseTo(1.0); // v0 u (+X)
    expect(buffer[33]).toBeCloseTo(0.0); // v0 v (+Z, North)
    expect(buffer[34]).toBeCloseTo(0.0); // v1 u (-X)
    expect(buffer[35]).toBeCloseTo(0.0); // v1 v (+Z, North)
    expect(buffer[36]).toBeCloseTo(0.0); // v2 u (-X)
    expect(buffer[37]).toBeCloseTo(1.0); // v2 v (-Z, South)
    expect(buffer[38]).toBeCloseTo(1.0); // v3 u (+X)
    expect(buffer[39]).toBeCloseTo(1.0); // v3 v (-Z, South)

    // Face 5: Bottom (-Y) -> indices 40..47
    // South (-Z) is top of texture (v=0), North (+Z) is bottom of texture (v=1)
    expect(buffer[40]).toBeCloseTo(1.0); // v0 u (+X)
    expect(buffer[41]).toBeCloseTo(0.0); // v0 v (-Z, South)
    expect(buffer[42]).toBeCloseTo(0.0); // v1 u (-X)
    expect(buffer[43]).toBeCloseTo(0.0); // v1 v (-Z, South)
    expect(buffer[44]).toBeCloseTo(0.0); // v2 u (-X)
    expect(buffer[45]).toBeCloseTo(1.0); // v2 v (+Z, North)
    expect(buffer[46]).toBeCloseTo(1.0); // v3 u (+X)
    expect(buffer[47]).toBeCloseTo(1.0); // v3 v (+Z, North)
  });

  it('projects vertical slices of multi-tiered boxes contiguously across the node space', () => {
    // 3 tiered boxes representing a trophy or pedestal
    const base: AABB = { minX: -0.5, minY: -0.5, minZ: -0.5, maxX: 0.5, maxY: -0.25, maxZ: 0.5 };
    const column: AABB = { minX: -0.25, minY: -0.25, minZ: -0.25, maxX: 0.25, maxY: 0.25, maxZ: 0.25 };
    const capital: AABB = { minX: -0.375, minY: 0.25, minZ: -0.375, maxX: 0.375, maxY: 0.5, maxZ: 0.375 };

    const baseBuf = computeNodeBoxUVBuffer(base);
    const colBuf = computeNodeBoxUVBuffer(column);
    const capBuf = computeNodeBoxUVBuffer(capital);

    // Front Face (Face 1) V coordinates in image space (0 at top, 1 at bottom):
    // Capital (Y in [0.25, 0.5]) -> V in [0.0, 0.25]
    expect(capBuf[9]).toBeCloseTo(0.0);   // TR (top) v
    expect(capBuf[13]).toBeCloseTo(0.25); // BL (bottom) v

    // Column (Y in [-0.25, 0.25]) -> V in [0.25, 0.75]
    expect(colBuf[9]).toBeCloseTo(0.25);  // TR (top) v
    expect(colBuf[13]).toBeCloseTo(0.75); // BL (bottom) v

    // Base (Y in [-0.5, -0.25]) -> V in [0.75, 1.0]
    expect(baseBuf[9]).toBeCloseTo(0.75);  // TR (top) v
    expect(baseBuf[13]).toBeCloseTo(1.0);  // BL (bottom) v

    // Column U span: centered in X [-0.25, 0.25] -> U in [0.25, 0.75]
    expect(colBuf[10]).toBeCloseTo(0.25); // TL u
    expect(colBuf[8]).toBeCloseTo(0.75);  // TR u
  });

  it('handles side face projections accurately for Right (+X) and Left (-X)', () => {
    const halfZBox: AABB = { minX: -0.5, minY: -0.5, minZ: -0.5, maxX: 0.5, maxY: 0.5, maxZ: 0.0 };
    const buf = computeNodeBoxUVBuffer(halfZBox);

    // Right Face (Face 2): spans Z from -0.5 to 0.0 -> U in [0.0, 0.5]
    // v1(TL): u_min, v_min -> index 18, 19
    // v0(TR): u_max, v_min -> index 16, 17
    expect(buf[18]).toBeCloseTo(0.0);
    expect(buf[16]).toBeCloseTo(0.5);
  });

  it('matches Luanti C++ engine setupCuboidVertices formulas for all 24 vertices', () => {
    // Arbitrary asymmetric box
    const box: AABB = {
      minX: -0.3125, maxX: 0.1875,
      minY: -0.5, maxY: 0.125,
      minZ: -0.25, maxZ: 0.375
    };

    const buf = computeNodeBoxUVBuffer(box);

    // Luanti direct vertex math from src/client/content_mapblock.cpp:
    // Top (+Y): u = X + 0.5, v = 0.5 - Z
    // Face 4: v0=(maxX, maxZ), v1=(minX, maxZ), v2=(minX, minZ), v3=(maxX, minZ)
    expect(buf[32]).toBeCloseTo(box.maxX + 0.5);
    expect(buf[33]).toBeCloseTo(0.5 - box.maxZ);
    expect(buf[34]).toBeCloseTo(box.minX + 0.5);
    expect(buf[35]).toBeCloseTo(0.5 - box.maxZ);
    expect(buf[36]).toBeCloseTo(box.minX + 0.5);
    expect(buf[37]).toBeCloseTo(0.5 - box.minZ);
    expect(buf[38]).toBeCloseTo(box.maxX + 0.5);
    expect(buf[39]).toBeCloseTo(0.5 - box.minZ);
  });

  it('matches Luanti C++ engine coordinates across all 6 faces for randomized boxes', () => {
    function luantiUV(face: string, x: number, y: number, z: number): [number, number] {
      switch (face) {
        case 'top':    return [x + 0.5, 0.5 - z];
        case 'bottom': return [x + 0.5, z + 0.5];
        case 'right':  return [z + 0.5, 0.5 - y];
        case 'left':   return [0.5 - z, 0.5 - y];
        case 'back':   return [0.5 - x, 0.5 - y];
        case 'front':  return [x + 0.5, 0.5 - y];
        default:       return [0, 0];
      }
    }

    const faceNames = ['back', 'front', 'right', 'left', 'top', 'bottom'];

    for (let i = 0; i < 50; i++) {
      const x1 = Math.random() - 0.5, x2 = Math.random() - 0.5;
      const y1 = Math.random() - 0.5, y2 = Math.random() - 0.5;
      const z1 = Math.random() - 0.5, z2 = Math.random() - 0.5;
      const box: AABB = {
        minX: Math.min(x1, x2), maxX: Math.max(x1, x2),
        minY: Math.min(y1, y2), maxY: Math.max(y1, y2),
        minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2)
      };

      const buf = computeNodeBoxUVBuffer(box);

      const corners = [
        // Face 0: Back (+Z)
        [ [box.minX, box.maxY, box.maxZ], [box.maxX, box.maxY, box.maxZ], [box.maxX, box.minY, box.maxZ], [box.minX, box.minY, box.maxZ] ],
        // Face 1: Front (-Z)
        [ [box.maxX, box.maxY, box.minZ], [box.minX, box.maxY, box.minZ], [box.minX, box.minY, box.minZ], [box.maxX, box.minY, box.minZ] ],
        // Face 2: Right (+X)
        [ [box.maxX, box.maxY, box.maxZ], [box.maxX, box.maxY, box.minZ], [box.maxX, box.minY, box.minZ], [box.maxX, box.minY, box.maxZ] ],
        // Face 3: Left (-X)
        [ [box.minX, box.maxY, box.minZ], [box.minX, box.maxY, box.maxZ], [box.minX, box.minY, box.maxZ], [box.minX, box.minY, box.minZ] ],
        // Face 4: Top (+Y)
        [ [box.maxX, box.maxY, box.maxZ], [box.minX, box.maxY, box.maxZ], [box.minX, box.maxY, box.minZ], [box.maxX, box.maxY, box.minZ] ],
        // Face 5: Bottom (-Y)
        [ [box.maxX, box.minY, box.minZ], [box.minX, box.minY, box.minZ], [box.minX, box.minY, box.maxZ], [box.maxX, box.minY, box.maxZ] ]
      ];

      for (let f = 0; f < 6; f++) {
        for (let v = 0; v < 4; v++) {
          const [px, py, pz] = corners[f][v];
          const [expU, expV] = luantiUV(faceNames[f], px, py, pz);
          const actU = buf[(f * 4 + v) * 2];
          const actV = buf[(f * 4 + v) * 2 + 1];

          expect(actU).toBeCloseTo(expU, 5);
          expect(actV).toBeCloseTo(expV, 5);
        }
      }
    }
  });
});
