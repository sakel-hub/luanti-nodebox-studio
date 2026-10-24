import { AABB, FaceTextures } from '../models/nodebox.model';

export type AABBBox = AABB;

/**
 * Rotates an Axis-Aligned Bounding Box by 90 degrees around an axis.
 * Maintains strict AABB alignment with exact float snapping.
 */
export function rotateAABB90(
  box: AABBBox,
  axis: 'x' | 'y' | 'z',
  direction: 1 | -1, // 1 for +90 deg, -1 for -90 deg
  origin: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
  snapResolution = 16
): AABBBox {
  const snap = (v: number) => Math.round(v * snapResolution) / snapResolution;

  // Relative to rotation origin
  const x1 = box.minX - origin.x;
  const x2 = box.maxX - origin.x;
  const y1 = box.minY - origin.y;
  const y2 = box.maxY - origin.y;
  const z1 = box.minZ - origin.z;
  const z2 = box.maxZ - origin.z;

  let rx1 = x1, rx2 = x2;
  let ry1 = y1, ry2 = y2;
  let rz1 = z1, rz2 = z2;

  if (axis === 'y') {
    if (direction === 1) {
      // +90 deg CW: (x, z) -> (z, -x)
      rx1 = z1;
      rx2 = z2;
      rz1 = -x2;
      rz2 = -x1;
    } else {
      // -90 deg CCW: (x, z) -> (-z, x)
      rx1 = -z2;
      rx2 = -z1;
      rz1 = x1;
      rz2 = x2;
    }
  } else if (axis === 'x') {
    if (direction === 1) {
      // +90 deg: (y, z) -> (z, -y)
      ry1 = z1;
      ry2 = z2;
      rz1 = -y2;
      rz2 = -y1;
    } else {
      // -90 deg: (y, z) -> (-z, y)
      ry1 = -z2;
      ry2 = -z1;
      rz1 = y1;
      rz2 = y2;
    }
  } else if (axis === 'z') {
    if (direction === 1) {
      // +90 deg: (x, y) -> (y, -x)
      rx1 = y1;
      rx2 = y2;
      ry1 = -x2;
      ry2 = -x1;
    } else {
      // -90 deg: (x, y) -> (-y, x)
      rx1 = -y2;
      rx2 = -y1;
      ry1 = x1;
      ry2 = x2;
    }
  }

  return {
    minX: snap(Math.min(rx1, rx2) + origin.x),
    maxX: snap(Math.max(rx1, rx2) + origin.x),
    minY: snap(Math.min(ry1, ry2) + origin.y),
    maxY: snap(Math.max(ry1, ry2) + origin.y),
    minZ: snap(Math.min(rz1, rz2) + origin.z),
    maxZ: snap(Math.max(rz1, rz2) + origin.z)
  };
}

/**
 * Rotates face texture mappings by 90 degrees around an axis.
 */
export function rotateFaceTextures90(
  textures: FaceTextures | undefined,
  axis: 'x' | 'y' | 'z',
  direction: 1 | -1
): FaceTextures | undefined {
  if (!textures) return undefined;

  const res: FaceTextures = { ...textures };

  if (axis === 'y') {
    if (direction === 1) {
      res.front = textures.right;
      res.left = textures.front;
      res.back = textures.left;
      res.right = textures.back;
    } else {
      res.right = textures.front;
      res.back = textures.right;
      res.left = textures.back;
      res.front = textures.left;
    }
  } else if (axis === 'x') {
    if (direction === 1) {
      res.front = textures.top;
      res.bottom = textures.front;
      res.back = textures.bottom;
      res.top = textures.back;
    } else {
      res.top = textures.front;
      res.back = textures.top;
      res.bottom = textures.back;
      res.front = textures.bottom;
    }
  } else if (axis === 'z') {
    if (direction === 1) {
      res.left = textures.top;
      res.bottom = textures.left;
      res.right = textures.bottom;
      res.top = textures.right;
    } else {
      res.top = textures.left;
      res.right = textures.top;
      res.bottom = textures.right;
      res.left = textures.bottom;
    }
  }

  return res;
}
