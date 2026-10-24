import { describe, it, expect } from 'vitest';
import {
  extractSnappedAABB,
  extractAnchoredFaceAABB,
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

  it('enforces 1 grid unit minimum thickness by default (allowZeroThickness = false)', () => {
    const aabb = extractSnappedAABB(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      16
    );

    expect(aabb.maxX - aabb.minX).toBe(0.0625); // 1/16
    expect(aabb.maxY - aabb.minY).toBe(0.0625);
    expect(aabb.maxZ - aabb.minZ).toBe(0.0625);
    expect(aabb.minX).toBe(0);
    expect(aabb.maxX).toBe(0.0625);
  });

  it('allows 0 thickness (2D planes) when allowZeroThickness is true', () => {
    const aabb = extractSnappedAABB(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      16,
      true
    );

    expect(aabb.maxX - aabb.minX).toBe(0);
    expect(aabb.maxY - aabb.minY).toBe(0);
    expect(aabb.maxZ - aabb.minZ).toBe(0);
    expect(aabb.minX).toBe(0);
    expect(aabb.maxX).toBe(0);
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

    it('clamps 3D box at 1 grid unit minimum by default when shrinking down past 0', () => {
      const slab: AABB = {
        minX: -0.5,
        maxX: 0.5,
        minY: -0.5,
        maxY: -0.3125, // height = 3/16 = 0.1875
        minZ: -0.5,
        maxZ: 0.5
      };

      // Shrink by 1 unit per side (-0.0625) -> clamps to 1 grid unit (0.0625)
      const clamped = scaleSymmetricAABB(slab, 'y', -0.0625, 16);
      expect(clamped.maxY - clamped.minY).toBe(0.0625);

      // Attempt to shrink excessively past 0
      const clampedExcess = scaleSymmetricAABB(slab, 'y', -0.625, 16);
      expect(clampedExcess.maxY - clampedExcess.minY).toBe(0.0625);
    });

    it('allows collapsing to 0 thickness (2D plane) when allowZeroThickness is true', () => {
      const slab: AABB = {
        minX: -0.5,
        maxX: 0.5,
        minY: -0.5,
        maxY: -0.375, // height = 2/16 = 0.125, center = -0.4375
        minZ: -0.5,
        maxZ: 0.5
      };

      const zeroHeight = scaleSymmetricAABB(slab, 'y', -0.0625, 16, true);
      expect(zeroHeight.maxY - zeroHeight.minY).toBe(0);
      expect((zeroHeight.minY + zeroHeight.maxY) / 2).toBeCloseTo(-0.4375);

      const clamped = scaleSymmetricAABB(slab, 'y', -0.625, 16, true);
      expect(clamped.maxY - clamped.minY).toBe(0);
      expect((clamped.minY + clamped.maxY) / 2).toBeCloseTo(-0.4375);
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

  describe('extractAnchoredFaceAABB', () => {
    const initialBox: AABB = {
      minX: -0.5,
      maxX: 0.5,
      minY: -0.5,
      maxY: 0.5,
      minZ: -0.5,
      maxZ: 0.5
    };

    it('resizes right face (+X) while anchoring all other 5 faces strictly to initialBox', () => {
      // Mesh scaled to width 1.25, center moved to 0.125
      const resized = extractAnchoredFaceAABB(
        initialBox,
        'right',
        { x: 0.125, y: 0, z: 0 },
        { x: 1.25, y: 1, z: 1 },
        16
      );

      expect(resized.maxX).toBe(0.75); // 0.125 + 0.625 = 0.75
      // Untouched faces are 100% strictly anchored
      expect(resized.minX).toBe(-0.5);
      expect(resized.minY).toBe(-0.5);
      expect(resized.maxY).toBe(0.5);
      expect(resized.minZ).toBe(-0.5);
      expect(resized.maxZ).toBe(0.5);
    });

    it('clamps 3D box at 1 grid unit minimum to prevent collapsing into 0 thickness trap', () => {
      // Drag right face inward all the way to -0.5 on a 3D box
      const resized = extractAnchoredFaceAABB(
        initialBox,
        'right',
        { x: -0.5, y: 0, z: 0 },
        { x: 0.001, y: 1, z: 1 },
        16
      );

      expect(resized.minX).toBe(-0.5);
      expect(resized.maxX).toBe(-0.4375); // clamped to 1 grid unit (-0.5 + 1/16)
      expect(resized.maxX - resized.minX).toBe(0.0625);
    });

    it('collapses right face down to minX to produce 0-thickness 2D plane when allowZeroThickness is true', () => {
      const resized = extractAnchoredFaceAABB(
        initialBox,
        'right',
        { x: -0.5, y: 0, z: 0 },
        { x: 0.001, y: 1, z: 1 },
        16,
        true
      );

      expect(resized.minX).toBe(-0.5);
      expect(resized.maxX).toBe(-0.5);
      expect(resized.maxX - resized.minX).toBe(0);
    });

    it('expands existing 2D plane when dragged outward and stays at 0 when dragged inward', () => {
      const planeBox: AABB = {
        minX: -0.5,
        maxX: 0.5,
        minY: -0.5,
        maxY: -0.5, // 0 thickness 2D plane
        minZ: -0.5,
        maxZ: 0.5
      };

      // Drag top face outward/upward to -0.375 (+2 grid units)
      const expanded = extractAnchoredFaceAABB(
        planeBox,
        'top',
        { x: 0, y: -0.4375, z: 0 },
        { x: 1, y: 0.125, z: 1 },
        16
      );
      expect(expanded.minY).toBe(-0.5);
      expect(expanded.maxY).toBe(-0.375); // expands into 3D!

      // Drag top face inward/downward past 0
      const inward = extractAnchoredFaceAABB(
        planeBox,
        'top',
        { x: 0, y: -0.6, z: 0 },
        { x: 1, y: 0.001, z: 1 },
        16
      );
      expect(inward.minY).toBe(-0.5);
      expect(inward.maxY).toBe(-0.5); // stays clamped at 0 thickness
    });

    it('clamps right face at 1 grid unit even if dragged past opposite face', () => {
      // Drag right face past left face to -0.7
      const resized = extractAnchoredFaceAABB(
        initialBox,
        'right',
        { x: -0.7, y: 0, z: 0 },
        { x: 0.001, y: 1, z: 1 },
        16
      );

      expect(resized.minX).toBe(-0.5);
      expect(resized.maxX).toBe(-0.4375);
    });

    it('resizes left face (-X) while anchoring maxX and Y/Z faces', () => {
      const resized = extractAnchoredFaceAABB(
        initialBox,
        'left',
        { x: 0.125, y: 0, z: 0 },
        { x: 0.75, y: 1, z: 1 },
        16
      );

      expect(resized.minX).toBe(-0.25);
      expect(resized.maxX).toBe(0.5);
      expect(resized.minY).toBe(-0.5);
      expect(resized.maxY).toBe(0.5);
    });

    it('resizes top face (+Y) and allows collapsing to 0-thickness floor plate when allowZeroThickness is true', () => {
      const flat = extractAnchoredFaceAABB(
        initialBox,
        'top',
        { x: 0, y: -0.5, z: 0 },
        { x: 1, y: 0.001, z: 1 },
        16,
        true
      );

      expect(flat.minY).toBe(-0.5);
      expect(flat.maxY).toBe(-0.5);
      expect(flat.maxY - flat.minY).toBe(0);
    });

    it('resizes bottom face (-Y) and allows collapsing to 0-thickness ceiling plate when allowZeroThickness is true', () => {
      const flat = extractAnchoredFaceAABB(
        initialBox,
        'bottom',
        { x: 0, y: 0.5, z: 0 },
        { x: 1, y: 0.001, z: 1 },
        16,
        true
      );

      expect(flat.minY).toBe(0.5);
      expect(flat.maxY).toBe(0.5);
      expect(flat.maxY - flat.minY).toBe(0);
    });

    it('resizes back face (+Z) and front face (-Z) and allows 0-thickness wall plates when allowZeroThickness is true', () => {
      const backFlat = extractAnchoredFaceAABB(
        initialBox,
        'back',
        { x: 0, y: 0, z: -0.5 },
        { x: 1, y: 1, z: 0.001 },
        16,
        true
      );
      expect(backFlat.minZ).toBe(-0.5);
      expect(backFlat.maxZ).toBe(-0.5);

      const frontFlat = extractAnchoredFaceAABB(
        initialBox,
        'front',
        { x: 0, y: 0, z: 0.5 },
        { x: 1, y: 1, z: 0.001 },
        16,
        true
      );
      expect(frontFlat.minZ).toBe(0.5);
      expect(frontFlat.maxZ).toBe(0.5);
    });
  });
});


