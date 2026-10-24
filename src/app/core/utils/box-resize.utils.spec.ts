import { describe, it, expect } from 'vitest';
import {
  extractSnappedAABB,
  scaleSymmetricAABB,
  getFaceDirectionFromDragAxis,
  getFaceAxisDescription,
  AABB
} from './box-resize.utils';

describe('box-resize.utils', () => {
  it('correctly calculates AABB from standard centered unit cube at resolution 16', () => {
    const aabb = extractSnappedAABB(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 },
      16
    );

    expect(aabb.minX).toBe(-0.5);
    expect(aabb.maxX).toBe(0.5);
    expect(aabb.minY).toBe(-0.5);
    expect(aabb.maxY).toBe(0.5);
    expect(aabb.minZ).toBe(-0.5);
    expect(aabb.maxZ).toBe(0.5);
  });

  it('correctly reflects extending only the +X face while keeping -X anchored', () => {
    // Initial box: minX: -0.5, maxX: 0.5 (center: 0, width: 1)
    // +X face dragged outward by 0.25 (to maxX: 0.75):
    // New width: 1.25, new center X: 0.125
    const aabb = extractSnappedAABB(
      { x: 0.125, y: 0, z: 0 },
      { x: 1.25, y: 1, z: 1 },
      16
    );

    expect(aabb.minX).toBe(-0.5);
    expect(aabb.maxX).toBe(0.75);
    expect(aabb.minY).toBe(-0.5);
    expect(aabb.maxY).toBe(0.5);
  });

  it('correctly reflects moving only the -X face while keeping +X anchored', () => {
    // Initial box: minX: -0.5, maxX: 0.5
    // -X face dragged inward by 0.25 (to minX: -0.25):
    // New width: 0.75, new center X: 0.125
    const aabb = extractSnappedAABB(
      { x: 0.125, y: 0, z: 0 },
      { x: 0.75, y: 1, z: 1 },
      16
    );

    expect(aabb.minX).toBe(-0.25);
    expect(aabb.maxX).toBe(0.5);
  });

  it('snaps coordinates to grid resolution', () => {
    // Floating values that have slight drag inaccuracies
    const aabb = extractSnappedAABB(
      { x: 0.0624999, y: 0.2499999, z: -0.1250001 },
      { x: 0.3750002, y: 0.5, z: 0.25 },
      16
    );

    expect(aabb.minX).toBe(-0.125); // -2/16
    expect(aabb.maxX).toBe(0.25);   // +4/16
    expect(aabb.minY).toBe(0);      // 0
    expect(aabb.maxY).toBe(0.5);    // 8/16
    expect(aabb.minZ).toBe(-0.25);  // -4/16
    expect(aabb.maxZ).toBe(0);      // 0
  });

  it('enforces minimum thickness of 1/res when box collapses past 0 width', () => {
    const aabb = extractSnappedAABB(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      16
    );

    expect(aabb.maxX - aabb.minX).toBeCloseTo(1 / 16);
    expect(aabb.maxY - aabb.minY).toBeCloseTo(1 / 16);
    expect(aabb.maxZ - aabb.minZ).toBeCloseTo(1 / 16);
  });

  describe('scaleSymmetricAABB (Scale Center zero-drift math)', () => {
    it('scales symmetrically in Y preserving exact center with ZERO drift', () => {
      // Slab box: minY: -0.5, maxY: 0.0 (center: -0.25, height: 0.5)
      const slab: AABB = {
        minX: -0.5,
        maxX: 0.5,
        minY: -0.5,
        maxY: 0.0,
        minZ: -0.5,
        maxZ: 0.5
      };

      const initialCenterY = (slab.minY + slab.maxY) / 2; // -0.25
      expect(initialCenterY).toBe(-0.25);

      // Drag +Y handle outward by +2 grid units (2 / 16 = 0.125)
      const scaledUp = scaleSymmetricAABB(slab, 'y', 0.125, 16);
      expect(scaledUp.minY).toBe(-0.625); // -10/16
      expect(scaledUp.maxY).toBe(0.125);  // +2/16
      const centerUp = (scaledUp.minY + scaledUp.maxY) / 2;
      expect(centerUp).toBe(-0.25); // STRICTLY EQUAL ZERO DRIFT!

      // Drag +Y handle inward by -1 grid unit (-1 / 16 = -0.0625)
      const scaledDown = scaleSymmetricAABB(slab, 'y', -0.0625, 16);
      expect(scaledDown.minY).toBe(-0.4375); // -7/16
      expect(scaledDown.maxY).toBe(-0.0625); // -1/16
      const centerDown = (scaledDown.minY + scaledDown.maxY) / 2;
      expect(centerDown).toBe(-0.25); // STRICTLY EQUAL ZERO DRIFT!
    });

    it('preserves center coordinate across 10 sequential scale operations without upward crawl', () => {
      let current: AABB = {
        minX: -0.5,
        maxX: 0.5,
        minY: -0.5,
        maxY: 0.0,
        minZ: -0.5,
        maxZ: 0.5
      };

      const initialCenterY = (current.minY + current.maxY) / 2;
      const dragDeltas = [0.125, -0.0625, 0.25, -0.125, 0.0625, -0.0625, 0.1875, -0.25, 0.0625, -0.0625];

      for (const delta of dragDeltas) {
        current = scaleSymmetricAABB(current, 'y', delta, 16);
        const centerY = (current.minY + current.maxY) / 2;
        expect(centerY).toBe(initialCenterY);
      }
    });

    it('enforces minimum thickness of 1 grid unit when shrinking excessively', () => {
      const slab: AABB = {
        minX: -0.5,
        maxX: 0.5,
        minY: -0.5,
        maxY: -0.375, // height = 2/16 = 0.125
        minZ: -0.5,
        maxZ: 0.5
      };

      // Attempt to shrink by -10 grid units
      const clamped = scaleSymmetricAABB(slab, 'y', -0.625, 16);
      const height = clamped.maxY - clamped.minY;
      expect(height).toBeGreaterThanOrEqual(1 / 16);
      expect(clamped.minY).toBe(-0.5);
      expect(clamped.maxY).toBe(-0.375);
    });

    it('scales symmetrically in X and Z axes with zero drift', () => {
      const box: AABB = {
        minX: 0.125,
        maxX: 0.375, // center: 0.25, width: 0.25
        minY: -0.5,
        maxY: 0.5,
        minZ: -0.25,
        maxZ: 0.25   // center: 0, depth: 0.5
      };

      const scaledX = scaleSymmetricAABB(box, 'x', 0.125, 16);
      expect((scaledX.minX + scaledX.maxX) / 2).toBe(0.25);
      expect(scaledX.maxX - scaledX.minX).toBe(0.5);

      const scaledZ = scaleSymmetricAABB(box, 'z', 0.0625, 16);
      expect((scaledZ.minZ + scaledZ.maxZ) / 2).toBe(0);
      expect(scaledZ.maxZ - scaledZ.minZ).toBe(0.625);
    });
  });

  describe('face direction mapping utilities', () => {
    it('correctly maps 3D handle vectors to Luanti FaceDirections', () => {
      expect(getFaceDirectionFromDragAxis({ x: 0, y: 1, z: 0 })).toBe('top');
      expect(getFaceDirectionFromDragAxis({ x: 0, y: -1, z: 0 })).toBe('bottom');
      expect(getFaceDirectionFromDragAxis({ x: 1, y: 0, z: 0 })).toBe('right');
      expect(getFaceDirectionFromDragAxis({ x: -1, y: 0, z: 0 })).toBe('left');
      expect(getFaceDirectionFromDragAxis({ x: 0, y: 0, z: 1 })).toBe('back');
      expect(getFaceDirectionFromDragAxis({ x: 0, y: 0, z: -1 })).toBe('front');

      // Corner handle (multiple non-zero components) returns null
      expect(getFaceDirectionFromDragAxis({ x: 1, y: 1, z: 1 })).toBeNull();
      expect(getFaceDirectionFromDragAxis({ x: 1, y: 0, z: 1 })).toBeNull();

      // Descriptions
      expect(getFaceAxisDescription('top')).toBe('+Y (Up)');
      expect(getFaceAxisDescription('bottom')).toBe('-Y (Down)');
      expect(getFaceAxisDescription('right')).toBe('+X (East)');
      expect(getFaceAxisDescription('left')).toBe('-X (West)');
      expect(getFaceAxisDescription('back')).toBe('+Z (North)');
      expect(getFaceAxisDescription('front')).toBe('-Z (South)');
    });
  });
});

