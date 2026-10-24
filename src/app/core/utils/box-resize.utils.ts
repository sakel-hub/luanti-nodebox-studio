import { AABB, FaceDirection } from '../models/nodebox.model';

export type { AABB };

/**
 * Computes axis-aligned bounding box coordinates from a center position
 * and scaling vector, strictly snapped to the given grid resolution.
 * By default (allowZeroThickness = false), enforces a minimum thickness
 * of 1 grid unit (1 / resolution) to prevent falling into gizmo scale traps.
 */
export function extractSnappedAABB(
  position: { x: number; y: number; z: number },
  scaling: { x: number; y: number; z: number },
  resolution: number,
  allowZeroThickness: boolean = false
): AABB {
  const snap = (v: number) => {
    const rounded = Math.round(v * resolution) / resolution;
    return Object.is(rounded, -0) ? 0 : rounded;
  };
  const minDim = allowZeroThickness ? 0 : 1 / resolution;
  const halfW = scaling.x / 2;
  const halfH = scaling.y / 2;
  const halfD = scaling.z / 2;

  let minX = snap(position.x - halfW);
  let maxX = snap(position.x + halfW);
  if (maxX - minX < minDim) maxX = snap(minX + minDim);

  let minY = snap(position.y - halfH);
  let maxY = snap(position.y + halfH);
  if (maxY - minY < minDim) maxY = snap(minY + minDim);

  let minZ = snap(position.z - halfD);
  let maxZ = snap(position.z + halfD);
  if (maxZ - minZ < minDim) maxZ = snap(minZ + minDim);

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

/**
 * Computes snapped AABB when resizing a specific face of a box,
 * strictly anchoring all untouched faces to their initial values.
 * If the initial box already has 0 thickness on the dragged axis,
 * allows expanding it outward or remaining at 0 inward.
 * If the initial box was 3D, clamps at 1 grid unit minimum to prevent collapsing to 0.
 */
export function extractAnchoredFaceAABB(
  initialBox: AABB,
  face: FaceDirection,
  meshPosition: { x: number; y: number; z: number },
  meshScaling: { x: number; y: number; z: number },
  resolution: number,
  allowZeroThickness: boolean = false
): AABB {
  const snap = (v: number) => {
    const rounded = Math.round(v * resolution) / resolution;
    return Object.is(rounded, -0) ? 0 : rounded;
  };

  const isPlane =
    (face === 'right' || face === 'left') ? initialBox.maxX === initialBox.minX :
    (face === 'top' || face === 'bottom') ? initialBox.maxY === initialBox.minY :
    initialBox.maxZ === initialBox.minZ;

  const minDim = (isPlane || allowZeroThickness) ? 0 : 1 / resolution;

  const result: AABB = { ...initialBox };

  switch (face) {
    case 'right': { // +X
      const rightWorldX = meshPosition.x + meshScaling.x / 2;
      result.maxX = Math.max(snap(initialBox.minX + minDim), snap(rightWorldX));
      break;
    }
    case 'left': { // -X
      const leftWorldX = meshPosition.x - meshScaling.x / 2;
      result.minX = Math.min(snap(initialBox.maxX - minDim), snap(leftWorldX));
      break;
    }
    case 'top': { // +Y
      const topWorldY = meshPosition.y + meshScaling.y / 2;
      result.maxY = Math.max(snap(initialBox.minY + minDim), snap(topWorldY));
      break;
    }
    case 'bottom': { // -Y
      const bottomWorldY = meshPosition.y - meshScaling.y / 2;
      result.minY = Math.min(snap(initialBox.maxY - minDim), snap(bottomWorldY));
      break;
    }
    case 'back': { // +Z
      const backWorldZ = meshPosition.z + meshScaling.z / 2;
      result.maxZ = Math.max(snap(initialBox.minZ + minDim), snap(backWorldZ));
      break;
    }
    case 'front': { // -Z
      const frontWorldZ = meshPosition.z - meshScaling.z / 2;
      result.minZ = Math.min(snap(initialBox.maxZ - minDim), snap(frontWorldZ));
      break;
    }
  }

  return result;
}

/**
 * Scales an AABB symmetrically from its center along a specified axis ('x' | 'y' | 'z')
 * by a given world drag distance, strictly snapped to the grid resolution.
 *
 * Symmetrical expansion subtracts deltaPerSide from min and adds deltaPerSide to max,
 * which mathematically guarantees that the center point ((min + max) / 2) remains
 * 100% invariant with zero drift across multiple scaling iterations.
 *
 * When allowZeroThickness is false, stops at 1 grid unit minimum.
 */
export function scaleSymmetricAABB(
  box: AABB,
  axis: 'x' | 'y' | 'z',
  dragDistance: number,
  resolution: number,
  allowZeroThickness: boolean = false
): AABB {
  const snap = (v: number) => {
    const rounded = Math.round(v * resolution) / resolution;
    return Object.is(rounded, -0) ? 0 : rounded;
  };

  const isPlane =
    axis === 'x' ? box.maxX === box.minX :
    axis === 'y' ? box.maxY === box.minY :
    box.maxZ === box.minZ;

  const minDim = (isPlane || allowZeroThickness) ? 0 : 1 / resolution;
  const steps = Math.round(dragDistance * resolution);
  const result: AABB = { ...box };

  if (axis === 'x') {
    const initDim = box.maxX - box.minX;
    const minSteps = (isPlane || allowZeroThickness)
      ? Math.ceil(-Math.round(initDim * resolution) / 2)
      : Math.ceil((-Math.round(initDim * resolution) + 1) / 2);
    const clampedSteps = Math.max(minSteps, steps);
    const deltaPerSide = clampedSteps / resolution;
    result.minX = snap(box.minX - deltaPerSide);
    result.maxX = snap(box.maxX + deltaPerSide);
    if (result.maxX - result.minX < minDim) {
      if (minDim === 0) {
        const center = (box.minX + box.maxX) / 2;
        result.minX = snap(center);
        result.maxX = snap(center);
      } else {
        result.maxX = snap(result.minX + minDim);
      }
    }
  } else if (axis === 'y') {
    const initDim = box.maxY - box.minY;
    const minSteps = (isPlane || allowZeroThickness)
      ? Math.ceil(-Math.round(initDim * resolution) / 2)
      : Math.ceil((-Math.round(initDim * resolution) + 1) / 2);
    const clampedSteps = Math.max(minSteps, steps);
    const deltaPerSide = clampedSteps / resolution;
    result.minY = snap(box.minY - deltaPerSide);
    result.maxY = snap(box.maxY + deltaPerSide);
    if (result.maxY - result.minY < minDim) {
      if (minDim === 0) {
        const center = (box.minY + box.maxY) / 2;
        result.minY = snap(center);
        result.maxY = snap(center);
      } else {
        result.maxY = snap(result.minY + minDim);
      }
    }
  } else if (axis === 'z') {
    const initDim = box.maxZ - box.minZ;
    const minSteps = (isPlane || allowZeroThickness)
      ? Math.ceil(-Math.round(initDim * resolution) / 2)
      : Math.ceil((-Math.round(initDim * resolution) + 1) / 2);
    const clampedSteps = Math.max(minSteps, steps);
    const deltaPerSide = clampedSteps / resolution;
    result.minZ = snap(box.minZ - deltaPerSide);
    result.maxZ = snap(box.maxZ + deltaPerSide);
    if (result.maxZ - result.minZ < minDim) {
      if (minDim === 0) {
        const center = (box.minZ + box.maxZ) / 2;
        result.minZ = snap(center);
        result.maxZ = snap(center);
      } else {
        result.maxZ = snap(result.minZ + minDim);
      }
    }
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

