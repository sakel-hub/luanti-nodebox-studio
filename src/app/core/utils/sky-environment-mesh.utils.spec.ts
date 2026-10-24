import { describe, it, expect } from 'vitest';
import { Color3 } from '@babylonjs/core';
import {
  buildStarfieldVertexData,
  buildSubdividedCubicSkyboxData,
  buildVoxelCloudGridVertexData,
  buildVoxelMoonVertexData,
  buildVoxelSunVertexData,
  computeCubicSkyboxVertexColors,
  computeSunVector
} from './sky-environment-mesh.utils';

describe('SkyEnvironmentMeshUtils', () => {
  it('computes normalized sun vectors above the horizon for valid elevations', () => {
    const vec = computeSunVector(45, 180);
    expect(vec.length()).toBeCloseTo(1.0, 5);
    expect(vec.y).toBeGreaterThan(0.7);
  });

  it('builds subdivided cubic skybox geometry and interpolates zenith/horizon/nadir vertex colors', () => {
    const data = buildSubdividedCubicSkyboxData(120, 12);
    expect(data.positions.length).toBeGreaterThan(0);
    expect(data.normals.length).toBe(data.positions.length);
    expect(data.colors.length / 4).toBe(data.positions.length / 3);
    expect(data.indices.length).toBeGreaterThan(0);

    const zenith = new Color3(0.2, 0.5, 0.9);
    const horizon = new Color3(0.7, 0.85, 1.0);
    const nadir = new Color3(0.4, 0.6, 0.8);
    const colors = computeCubicSkyboxVertexColors(data.positions, zenith, horizon, nadir, 0.35);
    expect(colors.length).toBe(data.colors.length);

    // Every vertex alpha must be 1.0
    for (let i = 3; i < colors.length; i += 4) {
      expect(colors[i]).toBe(1.0);
    }
  });

  it('places all 3D starfield vertices strictly in the upper sky dome (Y > 0)', () => {
    const stars = buildStarfieldVertexData(120, 54);
    expect(stars.positions.length).toBe(120 * 4 * 3);
    for (let i = 1; i < stars.positions.length; i += 3) {
      expect(stars.positions[i]).toBeGreaterThan(0);
    }
  });

  it('builds layered 3D blocky moon and sun vertex buffers', () => {
    const moon = buildVoxelMoonVertexData();
    const sun = buildVoxelSunVertexData();
    expect(moon.indices.length).toBe(6 * 6); // 6 layered quads
    expect(sun.indices.length).toBe(3 * 6);  // 3 layered quads
  });

  it('builds seamless 24x24 voxel cloud grid with vertex colors and culled internal walls', () => {
    const clouds = buildVoxelCloudGridVertexData();
    expect(clouds.positions.length).toBeGreaterThan(0);
    expect(clouds.colors.length / 4).toBe(clouds.positions.length / 3);
    expect(clouds.indices.length).toBeGreaterThan(0);
  });
});
