import { describe, it, expect } from 'vitest';
import {
  buildExtrudedBoxGeometry,
  getExtrusionDepthScale
} from './pixel-extrusion-mesh.utils';
import { DEFAULT_PIXEL_DEPTH_CONFIG, DecodedTextureRgba } from './pixel-normal-generator.utils';

describe('PixelExtrusionMeshUtils', () => {
  it('returns increasing depth scales for subtle, medium, and deep', () => {
    const subtle = getExtrusionDepthScale('subtle');
    const medium = getExtrusionDepthScale('medium');
    const deep = getExtrusionDepthScale('deep');
    expect(subtle).toBeGreaterThan(0);
    expect(medium).toBeGreaterThan(subtle);
    expect(deep).toBeGreaterThan(medium);
  });

  it('builds 6 subMeshes and omits geometry for transparent cutout texels', () => {
    // 2x2 texture with 1 opaque bright texel at (0,0) and 3 transparent texels
    const cutoutTex: DecodedTextureRgba = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        255, 255, 255, 255,   0, 0, 0, 0,
        0,   0,   0,   0,     0, 0, 0, 0
      ])
    };

    const box = {
      minX: -0.5,
      maxX: 0.5,
      minY: -0.5,
      maxY: 0.5,
      minZ: -0.5,
      maxZ: 0.5
    };

    const faceInputs = Array.from({ length: 6 }, () => ({ decoded: cutoutTex }));
    const geo = buildExtrudedBoxGeometry(box, faceInputs, {
      ...DEFAULT_PIXEL_DEPTH_CONFIG,
      enabled: true,
      extrudePixels: true,
      intensity: 'medium'
    });

    expect(geo.subMeshes.length).toBe(6);
    // Each face has 1 opaque cell -> 1 front quad + 1 back quad + 4 step walls = 6 quads = 36 indices per face
    for (let f = 0; f < 6; f++) {
      expect(geo.subMeshes[f].materialIndex).toBe(f);
      expect(geo.subMeshes[f].indexCount).toBe(36);
    }
    expect(geo.indices.length).toBe(36 * 6);
    expect(geo.positions.length / 3).toBe((geo.indices.length / 6) * 4);
    expect(geo.normals.length).toBe(geo.positions.length);
    expect(geo.uvs.length / 2).toBe(geo.positions.length / 3);
  });

  it('greedy-meshes uniform opaque faces into a single flat quad with zero side walls', () => {
    // 4x4 uniform solid texture
    const solidData = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < 16; i++) {
      solidData[i * 4] = 120;
      solidData[i * 4 + 1] = 120;
      solidData[i * 4 + 2] = 120;
      solidData[i * 4 + 3] = 255;
    }
    const solidTex: DecodedTextureRgba = { width: 4, height: 4, data: solidData };

    const box = {
      minX: -0.5,
      maxX: 0.5,
      minY: -0.5,
      maxY: 0.5,
      minZ: -0.5,
      maxZ: 0.5
    };

    const faceInputs = Array.from({ length: 6 }, () => ({ decoded: solidTex }));
    const geo = buildExtrudedBoxGeometry(box, faceInputs, {
      ...DEFAULT_PIXEL_DEPTH_CONFIG,
      enabled: true,
      extrudePixels: true
    });

    // Uniform opaque texture has h=0 everywhere and greedy-meshes into 1 quad (6 indices) per face
    for (let f = 0; f < 6; f++) {
      expect(geo.subMeshes[f].indexCount).toBe(6);
    }
    expect(geo.indices.length).toBe(36);
  });

  it('extrudes 2D cutout planes into solid 3D voxel geometry while skipping degenerate edge faces', () => {
    const planeTex: DecodedTextureRgba = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        255, 255, 255, 255,   100, 200, 255, 255,
        0,   0,   0,   0,     0,   0,   0,   0
      ])
    };

    // 2D plane along Z (minZ === maxZ === 0)
    const planeBox = {
      minX: -0.5,
      maxX: 0.5,
      minY: -0.5,
      maxY: 0.5,
      minZ: 0,
      maxZ: 0
    };

    const faceInputs = Array.from({ length: 6 }, () => ({ decoded: planeTex }));
    const geo = buildExtrudedBoxGeometry(planeBox, faceInputs, {
      ...DEFAULT_PIXEL_DEPTH_CONFIG,
      enabled: true,
      extrudePixels: true,
      intensity: 'deep'
    });

    // Faces 0 (back +Z) and 1 (front -Z) have geometry; degenerate edge faces 2,3,4,5 have 0 indices
    expect(geo.subMeshes[0].indexCount).toBeGreaterThan(0);
    expect(geo.subMeshes[1].indexCount).toBeGreaterThan(0);
    expect(geo.subMeshes[2].indexCount).toBe(0);
    expect(geo.subMeshes[3].indexCount).toBe(0);
    expect(geo.subMeshes[4].indexCount).toBe(0);
    expect(geo.subMeshes[5].indexCount).toBe(0);
  });
});
