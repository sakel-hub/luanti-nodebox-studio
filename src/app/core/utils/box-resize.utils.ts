import { AABB, FaceDirection } from '../models/nodebox.model';

export type { AABB };

/**
 * Computes axis-aligned bounding box coordinates from a center position
 * and scaling vector, strictly snapped to the given grid resolution.
 * Enforces a minimum thickness of 1 grid unit (1 / resolution).
 */
export function extractSnappedAABB(
  position: { x: number; y: number; z: number },
  scaling: { x: number; y: number; z: number },
  resolution: number
): AABB {
  const snap = (v: number) => {
    const rounded = Math.round(v * resolution) / resolution;
    return Object.is(rounded, -0) ? 0 : rounded;
  };
  const halfW = scaling.x / 2;
  const halfH = scaling.y / 2;
  const halfD = scaling.z / 2;

  let minX = snap(position.x - halfW);
  let maxX = snap(position.x + halfW);
  if (maxX <= minX) maxX = snap(minX + 1 / resolution);

  let minY = snap(position.y - halfH);
  let maxY = snap(position.y + halfH);
  if (maxY <= minY) maxY = snap(minY + 1 / resolution);

  let minZ = snap(position.z - halfD);
  let maxZ = snap(position.z + halfD);
  if (maxZ <= minZ) maxZ = snap(minZ + 1 / resolution);

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

/**
 * Scales an AABB symmetrically from its center along a specified axis ('x' | 'y' | 'z')
 * by a given world drag distance, strictly snapped to the grid resolution.
 *
 * Symmetrical expansion subtracts deltaPerSide from min and adds deltaPerSide to max,
 * which mathematically guarantees that the center point ((min + max) / 2) remains
 * 100% invariant with zero drift across multiple scaling iterations.
 *
 * Minimum dimension is clamped to 1 grid unit (1 / resolution) to prevent collapse or inversion.
 */
export function scaleSymmetricAABB(
  box: AABB,
  axis: 'x' | 'y' | 'z',
  dragDistance: number,
  resolution: number
): AABB {
  const snap = (v: number) => {
    const rounded = Math.round(v * resolution) / resolution;
    return Object.is(rounded, -0) ? 0 : rounded;
  };

  const steps = Math.round(dragDistance * resolution);
  const result: AABB = { ...box };

  if (axis === 'x') {
    const initDim = box.maxX - box.minX;
    const minSteps = Math.ceil((1 - Math.round(initDim * resolution)) / 2);
    const clampedSteps = Math.max(minSteps, steps);
    const deltaPerSide = clampedSteps / resolution;
    result.minX = snap(box.minX - deltaPerSide);
    result.maxX = snap(box.maxX + deltaPerSide);
  } else if (axis === 'y') {
    const initDim = box.maxY - box.minY;
    const minSteps = Math.ceil((1 - Math.round(initDim * resolution)) / 2);
    const clampedSteps = Math.max(minSteps, steps);
    const deltaPerSide = clampedSteps / resolution;
    result.minY = snap(box.minY - deltaPerSide);
    result.maxY = snap(box.maxY + deltaPerSide);
  } else if (axis === 'z') {
    const initDim = box.maxZ - box.minZ;
    const minSteps = Math.ceil((1 - Math.round(initDim * resolution)) / 2);
    const clampedSteps = Math.max(minSteps, steps);
    const deltaPerSide = clampedSteps / resolution;
    result.minZ = snap(box.minZ - deltaPerSide);
    result.maxZ = snap(box.maxZ + deltaPerSide);
  }

  return result;
}

/**
 * Maps a 3D drag axis or handle normal vector to a Luanti FaceDirection.
 * Returns null if the axis represents a corner or multi-axis diagonal.
 */
export function getFaceDirectionFromDragAxis(axis: { x: number; y: number; z: number }): FaceDirection | null {
  const absX = Math.abs(axis.x);
  const absY = Math.abs(axis.y);
  const absZ = Math.abs(axis.z);

  // Pure face handles have exactly one dominant non-zero component (> 0.5)
  if (absY > 0.5 && absX < 0.5 && absZ < 0.5) {
    return axis.y > 0 ? 'top' : 'bottom';
  }
  if (absX > 0.5 && absY < 0.5 && absZ < 0.5) {
    return axis.x > 0 ? 'right' : 'left';
  }
  if (absZ > 0.5 && absX < 0.5 && absY < 0.5) {
    return axis.z > 0 ? 'back' : 'front';
  }
  return null;
}

/**
 * Returns human-readable label and orientation for a Luanti face direction.
 */
export function getFaceAxisDescription(face: FaceDirection): string {
  switch (face) {
    case 'top': return '+Y (Up)';
    case 'bottom': return '-Y (Down)';
    case 'right': return '+X (East)';
    case 'left': return '-X (West)';
    case 'back': return '+Z (North)';
    case 'front': return '-Z (South)';
  }
}

