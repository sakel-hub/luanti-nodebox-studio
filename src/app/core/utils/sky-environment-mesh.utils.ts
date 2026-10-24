import { Color3, Vector3 } from '@babylonjs/core';

export type SceneSky = 'studio' | 'minetest_day' | 'minetest_sunset' | 'minetest_night';

export interface SkyAtmosphereConfig {
  preset: SceneSky;
  sunElevation: number;   // 2..88 degrees above horizon
  sunAzimuth: number;     // 0..360 degrees around Y axis
  turbidity: number;      // 1..12 atmospheric haze / horizon glow spread
  cloudsEnabled: boolean; // Toggle 3D blocky Luanti clouds
  horizonFog: boolean;    // Toggle exponential horizon fog fade
}

export const SKY_PRESET_DEFAULTS: Record<SceneSky, SkyAtmosphereConfig> = {
  studio: {
    preset: 'studio',
    sunElevation: 58,
    sunAzimuth: 215,
    turbidity: 2.0,
    cloudsEnabled: false,
    horizonFog: false
  },
  minetest_day: {
    preset: 'minetest_day',
    sunElevation: 45,
    sunAzimuth: 145,
    turbidity: 2.2,
    cloudsEnabled: true,
    horizonFog: true
  },
  minetest_sunset: {
    preset: 'minetest_sunset',
    sunElevation: 9,
    sunAzimuth: 140,
    turbidity: 7.5,
    cloudsEnabled: true,
    horizonFog: true
  },
  minetest_night: {
    preset: 'minetest_night',
    sunElevation: 18,
    sunAzimuth: 140,
    turbidity: 2.0,
    cloudsEnabled: true,
    horizonFog: true
  }
};

export interface ProceduralMeshBuffers {
  positions: number[];
  normals: number[];
  colors: number[];
  indices: number[];
}

/**
 * Computes a normalized 3D unit vector pointing toward the sun/moon at the given elevation and azimuth.
 */
export function computeSunVector(elevationDeg: number, azimuthDeg: number): Vector3 {
  const elevRad = Math.max(2, Math.min(88, elevationDeg)) * (Math.PI / 180);
  const azimRad = (azimuthDeg % 360) * (Math.PI / 180);
  const cosElev = Math.cos(elevRad);
  return new Vector3(
    cosElev * Math.cos(azimRad),
    Math.sin(elevRad),
    cosElev * Math.sin(azimRad)
  );
}

/**
 * Builds vertex buffers for a vertically-subdivided cubic skybox so zenith, horizon, and nadir
 * colors interpolate smoothly along the vertical walls without spherical polar pinching.
 */
export function buildSubdividedCubicSkyboxData(
  size: number,
  subdivisions: number
): ProceduralMeshBuffers {
  const half = size * 0.5;
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const pushFaceGrid = (
    origin: [number, number, number],
    uVec: [number, number, number],
    vVec: [number, number, number],
    nx: number,
    ny: number,
    nz: number,
    stepsU: number,
    stepsV: number
  ) => {
    const baseVertex = positions.length / 3;
    for (let iv = 0; iv <= stepsV; iv++) {
      const fv = iv / stepsV;
      for (let iu = 0; iu <= stepsU; iu++) {
        const fu = iu / stepsU;
        positions.push(
          origin[0] + fu * uVec[0] + fv * vVec[0],
          origin[1] + fu * uVec[1] + fv * vVec[1],
          origin[2] + fu * uVec[2] + fv * vVec[2]
        );
        normals.push(nx, ny, nz);
        colors.push(1, 1, 1, 1);
      }
    }
    const stride = stepsU + 1;
    for (let iv = 0; iv < stepsV; iv++) {
      for (let iu = 0; iu < stepsU; iu++) {
        const v00 = baseVertex + iv * stride + iu;
        const v10 = v00 + 1;
        const v01 = baseVertex + (iv + 1) * stride + iu;
        const v11 = v01 + 1;
        indices.push(v00, v10, v11, v00, v11, v01);
      }
    }
  };

  // 4 Vertical Walls (subdivided vertically for smooth horizon-to-zenith gradient)
  pushFaceGrid([-half, -half, half], [size, 0, 0], [0, size, 0], 0, 0, -1, 2, subdivisions);
  pushFaceGrid([half, -half, -half], [-size, 0, 0], [0, size, 0], 0, 0, 1, 2, subdivisions);
  pushFaceGrid([half, -half, half], [0, 0, -size], [0, size, 0], -1, 0, 0, 2, subdivisions);
  pushFaceGrid([-half, -half, -half], [0, 0, size], [0, size, 0], 1, 0, 0, 2, subdivisions);

  // Top (+Y) & Bottom (-Y) Caps
  pushFaceGrid([-half, half, half], [size, 0, 0], [0, 0, -size], 0, -1, 0, 2, 2);
  pushFaceGrid([-half, -half, -half], [size, 0, 0], [0, 0, size], 0, 1, 0, 2, 2);

  return { positions, normals, colors, indices };
}

/**
 * Computes RGBA vertex colors for a cubic skybox given zenith, horizon, and nadir colors.
 */
export function computeCubicSkyboxVertexColors(
  positions: ArrayLike<number>,
  zenith: Color3,
  horizon: Color3,
  nadir: Color3 = zenith,
  hazeSpread = 0.35
): Float32Array {
  const halfSize = 60.0;
  const vertexCount = Math.floor(positions.length / 3);
  const colors = new Float32Array(vertexCount * 4);
  const exponent = Math.max(0.35, 1.15 - hazeSpread * 0.65);

  for (let i = 0; i < vertexCount; i++) {
    const y = positions[i * 3 + 1];
    const normY = Math.max(-1, Math.min(1, y / halfSize));
    let c: Color3;
    if (normY >= 0) {
      const t = Math.pow(normY, exponent);
      c = Color3.Lerp(horizon, zenith, t);
    } else {
      const t = Math.pow(-normY, 0.75);
      c = Color3.Lerp(horizon, nadir, t);
    }
    colors[i * 4] = c.r;
    colors[i * 4 + 1] = c.g;
    colors[i * 4 + 2] = c.b;
    colors[i * 4 + 3] = 1.0;
  }

  return colors;
}

/**
 * Builds 3D voxel star quads strictly in the upper hemisphere (Y > 0) so stars never appear below the horizon.
 */
export function buildStarfieldVertexData(starCount = 320, radius = 54): ProceduralMeshBuffers {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < starCount; i++) {
    const theta = rand() * Math.PI * 2;
    const u = rand();
    // Strictly positive elevation in [0.025, 0.96] -> ~1.5° to 86° above the horizon
    const sinElev = 0.025 + Math.pow(u, 0.85) * 0.935;
    const cosElev = Math.sqrt(Math.max(0, 1 - sinElev * sinElev));

    const dirX = cosElev * Math.cos(theta);
    const dirY = sinElev;
    const dirZ = cosElev * Math.sin(theta);

    const cx = dirX * radius;
    const cy = dirY * radius;
    const cz = dirZ * radius;

    const halfSize = i % 11 === 0 ? 0.22 : (i % 4 === 0 ? 0.15 : 0.10);

    // Local tangent basis facing inward toward (0,0,0)
    const rightX = -Math.sin(theta);
    const rightY = 0;
    const rightZ = Math.cos(theta);

    const upX = -sinElev * Math.cos(theta);
    const upY = cosElev;
    const upZ = -sinElev * Math.sin(theta);

    const base = positions.length / 3;
    const corners = [
      [-halfSize, -halfSize],
      [halfSize, -halfSize],
      [halfSize, halfSize],
      [-halfSize, halfSize]
    ];

    let r = 1.0;
    let g = 1.0;
    let b = 1.0;
    if (i % 7 === 0) {
      r = 0.78; g = 0.89; b = 1.0; // Cool blue-white star
    } else if (i % 13 === 0) {
      r = 1.0; g = 0.91; b = 0.72; // Warm gold-white star
    } else {
      const brightness = 0.7 + rand() * 0.3;
      r = brightness; g = brightness; b = Math.min(1.0, brightness + 0.05);
    }

    for (const [du, dv] of corners) {
      positions.push(
        cx + rightX * du + upX * dv,
        cy + rightY * du + upY * dv,
        cz + rightZ * du + upZ * dv
      );
      normals.push(-dirX, -dirY, -dirZ);
      colors.push(r, g, b, 1.0);
    }

    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  return { positions, normals, colors, indices };
}

function addCelestialLayerQuad(
  buf: ProceduralMeshBuffers,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  zOffset: number,
  r: number,
  g: number,
  b: number
): void {
  const base = buf.positions.length / 3;
  buf.positions.push(
    x0, y0, zOffset,
    x1, y0, zOffset,
    x1, y1, zOffset,
    x0, y1, zOffset
  );
  for (let i = 0; i < 4; i++) {
    buf.normals.push(0, 0, -1);
    buf.colors.push(r, g, b, 1.0);
  }
  buf.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

/**
 * Builds vertex buffers for a 3D blocky pixel-art Luanti Moon with lunar craters.
 */
export function buildVoxelMoonVertexData(): ProceduralMeshBuffers {
  const buf: ProceduralMeshBuffers = { positions: [], normals: [], colors: [], indices: [] };

  // Outer glow, inner halo, main ivory lunar body, and 3 pixel-art craters
  addCelestialLayerQuad(buf, -4.4, -4.4, 4.4, 4.4, 0.25, 0.14, 0.22, 0.42);
  addCelestialLayerQuad(buf, -3.1, -3.1, 3.1, 3.1, 0.12, 0.32, 0.44, 0.70);
  addCelestialLayerQuad(buf, -2.1, -2.1, 2.1, 2.1, 0.0, 0.96, 0.98, 1.0);
  addCelestialLayerQuad(buf, -1.3, 0.2, -0.2, 1.3, -0.05, 0.80, 0.85, 0.94);
  addCelestialLayerQuad(buf, 0.3, -1.2, 1.3, -0.2, -0.05, 0.80, 0.85, 0.94);
  addCelestialLayerQuad(buf, -0.8, -1.3, -0.1, -0.6, -0.05, 0.84, 0.88, 0.96);

  return buf;
}

/**
 * Builds vertex buffers for a 3D blocky pixel-art Luanti Sun with solar corona.
 */
export function buildVoxelSunVertexData(): ProceduralMeshBuffers {
  const buf: ProceduralMeshBuffers = { positions: [], normals: [], colors: [], indices: [] };

  // Outer golden glow, warm amber corona, and bright yellow-white core
  addCelestialLayerQuad(buf, -5.0, -5.0, 5.0, 5.0, 0.25, 0.95, 0.68, 0.35);
  addCelestialLayerQuad(buf, -3.5, -3.5, 3.5, 3.5, 0.12, 1.0, 0.85, 0.52);
  addCelestialLayerQuad(buf, -2.3, -2.3, 2.3, 2.3, 0.0, 1.0, 0.98, 0.86);

  return buf;
}

/**
 * Builds a seamless 24x24 3D Luanti cloud voxel grid where adjacent filled cells share no internal walls,
 * with outward-facing triangle winding and smooth vertical gradient vertex colors.
 */
export function buildVoxelCloudGridVertexData(): ProceduralMeshBuffers {
  const gridW = 24;
  const gridD = 24;
  const cellSize = 3.5;
  const halfSpanX = (gridW * cellSize) * 0.5;
  const halfSpanZ = (gridD * cellSize) * 0.5;
  const minY = 11.0;
  const maxY = 12.1;

  const filled = new Uint8Array(gridW * gridD);
  const fillRect = (gx0: number, gz0: number, w: number, d: number) => {
    for (let dz = 0; dz < d; dz++) {
      for (let dx = 0; dx < w; dx++) {
        const x = gx0 + dx;
        const z = gz0 + dz;
        if (x >= 0 && x < gridW && z >= 0 && z < gridD) {
          filled[z * gridW + x] = 1;
        }
      }
    }
  };

  // Organic multi-cell Luanti cloud formations (overlapping rects merge into stepped L/T/cumulus shapes)
  fillRect(1, 2, 4, 2);
  fillRect(2, 1, 2, 4);

  fillRect(8, 1, 5, 2);
  fillRect(9, 2, 4, 2);

  fillRect(16, 2, 4, 3);
  fillRect(15, 3, 3, 2);

  fillRect(2, 8, 5, 2);
  fillRect(3, 7, 3, 4);

  fillRect(9, 9, 4, 3);
  fillRect(11, 8, 4, 3);

  fillRect(18, 8, 4, 2);
  fillRect(19, 7, 3, 4);

  fillRect(1, 15, 4, 3);
  fillRect(3, 16, 4, 2);

  fillRect(9, 15, 5, 2);
  fillRect(10, 14, 3, 4);

  fillRect(17, 15, 5, 3);
  fillRect(18, 14, 3, 4);

  fillRect(4, 20, 5, 2);
  fillRect(13, 20, 4, 3);

  const isFilled = (gx: number, gz: number): boolean => {
    if (gx < 0 || gx >= gridW || gz < 0 || gz >= gridD) return false;
    return filled[gz * gridW + gx] === 1;
  };

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const pushColoredQuad = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    nx: number,
    ny: number,
    nz: number,
    c0: [number, number, number],
    c1: [number, number, number],
    c2: [number, number, number],
    c3: [number, number, number]
  ) => {
    const base = positions.length / 3;
    positions.push(...p0, ...p1, ...p2, ...p3);
    for (let i = 0; i < 4; i++) {
      normals.push(nx, ny, nz);
    }
    colors.push(
      c0[0], c0[1], c0[2], 1.0,
      c1[0], c1[1], c1[2], 1.0,
      c2[0], c2[1], c2[2], 1.0,
      c3[0], c3[1], c3[2], 1.0
    );
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  const topCol: [number, number, number] = [1.0, 1.0, 1.0];
  const botCol: [number, number, number] = [0.86, 0.89, 0.95];
  const sideTopCol: [number, number, number] = [0.99, 0.99, 1.0];
  const sideBotCol: [number, number, number] = [0.90, 0.92, 0.96];

  for (let gz = 0; gz < gridD; gz++) {
    for (let gx = 0; gx < gridW; gx++) {
      if (!isFilled(gx, gz)) continue;

      const x0 = -halfSpanX + gx * cellSize;
      const x1 = x0 + cellSize;
      const z0 = -halfSpanZ + gz * cellSize;
      const z1 = z0 + cellSize;

      // Top (+Y) outward quad
      pushColoredQuad(
        [x1, maxY, z1],
        [x0, maxY, z1],
        [x0, maxY, z0],
        [x1, maxY, z0],
        0, 1, 0,
        topCol, topCol, topCol, topCol
      );

      // Bottom (-Y) outward quad
      pushColoredQuad(
        [x1, minY, z0],
        [x0, minY, z0],
        [x0, minY, z1],
        [x1, minY, z1],
        0, -1, 0,
        botCol, botCol, botCol, botCol
      );

      // Exposed Back (+Z) side wall
      if (!isFilled(gx, gz + 1)) {
        pushColoredQuad(
          [x0, maxY, z1],
          [x1, maxY, z1],
          [x1, minY, z1],
          [x0, minY, z1],
          0, 0, 1,
          sideTopCol, sideTopCol, sideBotCol, sideBotCol
        );
      }

      // Exposed Front (-Z) side wall
      if (!isFilled(gx, gz - 1)) {
        pushColoredQuad(
          [x1, maxY, z0],
          [x0, maxY, z0],
          [x0, minY, z0],
          [x1, minY, z0],
          0, 0, -1,
          sideTopCol, sideTopCol, sideBotCol, sideBotCol
        );
      }

      // Exposed Right (+X) side wall
      if (!isFilled(gx + 1, gz)) {
        pushColoredQuad(
          [x1, maxY, z1],
          [x1, maxY, z0],
          [x1, minY, z0],
          [x1, minY, z1],
          1, 0, 0,
          sideTopCol, sideTopCol, sideBotCol, sideBotCol
        );
      }

      // Exposed Left (-X) side wall
      if (!isFilled(gx - 1, gz)) {
        pushColoredQuad(
          [x0, maxY, z0],
          [x0, maxY, z1],
          [x0, minY, z1],
          [x0, minY, z0],
          -1, 0, 0,
          sideTopCol, sideTopCol, sideBotCol, sideBotCol
        );
      }
    }
  }

  return { positions, normals, colors, indices };
}
