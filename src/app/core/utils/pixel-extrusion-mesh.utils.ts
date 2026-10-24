import { AABB } from '../models/nodebox.model';
import { computeNodeBoxUVBuffer } from './uv-projection.utils';
import {
  DEPTH_PRESET_PERCENTAGES,
  DecodedTextureRgba,
  DepthIntensityPreset,
  PixelDepthConfig
} from './pixel-normal-generator.utils';

export interface SubMeshRange {
  materialIndex: number;
  indexStart: number;
  indexCount: number;
}

export interface ExtrudedBoxGeometry {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  subMeshes: SubMeshRange[];
}

export interface FaceTextureInput {
  decoded: DecodedTextureRgba | null;
  isAnimated?: boolean;
}

interface FaceBasis {
  /** 3D position corresponding to UV corner (u0, v0) (Top-Left of face when viewed from outside) */
  origin: [number, number, number];
  /** 3D vector from u0 (Left) to u1 (Right) along the face */
  uVec: [number, number, number];
  /** 3D vector from v0 (Top) to v1 (Bottom) along the face */
  vVec: [number, number, number];
  /** Unit vector along +U */
  uDir: [number, number, number];
  /** Unit vector along +V */
  vDir: [number, number, number];
  /** Outward unit normal (+N) */
  normal: [number, number, number];
  /** Face UV range [u0, u1, v0, v1] */
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  /** Thickness of the box along this face's normal axis */
  axisThickness: number;
}

/**
 * Returns the maximum 3D extrusion depth (in Luanti node units) for the given intensity preset or percentage (0..100).
 */
export function getExtrusionDepthScale(intensityOrPct: DepthIntensityPreset | number): number {
  const pct = typeof intensityOrPct === 'number'
    ? Math.max(0, Math.min(100, intensityOrPct))
    : DEPTH_PRESET_PERCENTAGES[intensityOrPct];
  return Number((0.0008 + (pct / 100) * 0.026).toFixed(5));
}

/**
 * Builds the 6 canonical face coordinate frames for an axis-aligned NodeBox.
 * Order matches Babylon.js CreateBox SubMeshes:
 *   0: back (+Z), 1: front (-Z), 2: right (+X), 3: left (-X), 4: top (+Y), 5: bottom (-Y)
 */
function buildFaceBases(box: AABB): FaceBasis[] {
  const uvs = computeNodeBoxUVBuffer(box);
  const dx = Math.max(0, box.maxX - box.minX);
  const dy = Math.max(0, box.maxY - box.minY);
  const dz = Math.max(0, box.maxZ - box.minZ);

  // For each face f in 0..5, computeNodeBoxUVBuffer emits:
  // v0(TR): (u1, v0), v1(TL): (u0, v0), v2(BL): (u0, v1), v3(BR): (u1, v1)
  const uvBounds = (f: number) => {
    const base = f * 8;
    const u1 = uvs[base];
    const v0 = uvs[base + 1];
    const u0 = uvs[base + 2];
    const v1 = uvs[base + 5];
    return { u0, u1, v0, v1 };
  };

  const b0 = uvBounds(0);
  const b1 = uvBounds(1);
  const b2 = uvBounds(2);
  const b3 = uvBounds(3);
  const b4 = uvBounds(4);
  const b5 = uvBounds(5);

  return [
    // Face 0: Back (+Z) - Left is maxX, Right is minX, Top is maxY, Bottom is minY
    {
      origin: [box.maxX, box.maxY, box.maxZ],
      uVec: [-(box.maxX - box.minX), 0, 0],
      vVec: [0, -(box.maxY - box.minY), 0],
      uDir: [-1, 0, 0],
      vDir: [0, -1, 0],
      normal: [0, 0, 1],
      ...b0,
      axisThickness: dz
    },
    // Face 1: Front (-Z) - Left is minX, Right is maxX, Top is maxY, Bottom is minY
    {
      origin: [box.minX, box.maxY, box.minZ],
      uVec: [box.maxX - box.minX, 0, 0],
      vVec: [0, -(box.maxY - box.minY), 0],
      uDir: [1, 0, 0],
      vDir: [0, -1, 0],
      normal: [0, 0, -1],
      ...b1,
      axisThickness: dz
    },
    // Face 2: Right (+X) - Left is minZ, Right is maxZ, Top is maxY, Bottom is minY
    {
      origin: [box.maxX, box.maxY, box.minZ],
      uVec: [0, 0, box.maxZ - box.minZ],
      vVec: [0, -(box.maxY - box.minY), 0],
      uDir: [0, 0, 1],
      vDir: [0, -1, 0],
      normal: [1, 0, 0],
      ...b2,
      axisThickness: dx
    },
    // Face 3: Left (-X) - Left is maxZ, Right is minZ, Top is maxY, Bottom is minY
    {
      origin: [box.minX, box.maxY, box.maxZ],
      uVec: [0, 0, -(box.maxZ - box.minZ)],
      vVec: [0, -(box.maxY - box.minY), 0],
      uDir: [0, 0, -1],
      vDir: [0, -1, 0],
      normal: [-1, 0, 0],
      ...b3,
      axisThickness: dx
    },
    // Face 4: Top (+Y) - Left is minX, Right is maxX, Top is maxZ, Bottom is minZ
    {
      origin: [box.minX, box.maxY, box.maxZ],
      uVec: [box.maxX - box.minX, 0, 0],
      vVec: [0, 0, -(box.maxZ - box.minZ)],
      uDir: [1, 0, 0],
      vDir: [0, 0, -1],
      normal: [0, 1, 0],
      ...b4,
      axisThickness: dy
    },
    // Face 5: Bottom (-Y) - Left is minX, Right is maxX, Top is minZ, Bottom is maxZ
    {
      origin: [box.minX, box.minY, box.minZ],
      uVec: [box.maxX - box.minX, 0, 0],
      vVec: [0, 0, box.maxZ - box.minZ],
      uDir: [1, 0, 0],
      vDir: [0, 0, 1],
      normal: [0, -1, 0],
      ...b5,
      axisThickness: dy
    }
  ];
}

/**
 * Generates sliced 1D intervals [a, b] between minVal and maxVal aligned to a texel grid of size `texRes`.
 */
function buildTexelSlices(minVal: number, maxVal: number, texRes: number): { a: number; b: number; texIdx: number }[] {
  const span = maxVal - minVal;
  if (span <= 1e-6) {
    return [];
  }

  const startStep = Math.floor(minVal * texRes + 1e-6);
  const endStep = Math.ceil(maxVal * texRes - 1e-6);
  const slices: { a: number; b: number; texIdx: number }[] = [];

  for (let s = startStep; s < endStep; s++) {
    const a = Math.max(minVal, s / texRes);
    const b = Math.min(maxVal, (s + 1) / texRes);
    if (b - a > 1e-6) {
      const mid = (a + b) * 0.5;
      const wrapped = ((mid % 1) + 1) % 1;
      const texIdx = Math.max(0, Math.min(texRes - 1, Math.floor(wrapped * texRes)));
      slices.push({ a, b, texIdx });
    }
  }

  return slices;
}

/**
 * Builds a complete 6-submesh 3D extruded voxel/texel relief geometry for a NodeBox.
 * - Opaque texels are extruded along each face's normal based on pixel luminance and cutout boundaries.
 * - Transparent cutout texels (alpha < 128) emit no geometry, eliminating ghosting and hollow cutouts.
 * - Contiguous cells of equal quantized height are greedy-meshed into unified front/back quads.
 * - Exposed 3D step walls are emitted wherever a cell rises above its neighbor, with UVs mapped
 *   to the flat interior plateau of the source texel so side walls have crisp pixel color and pure normals.
 */
export function buildExtrudedBoxGeometry(
  box: AABB,
  faceTextures: FaceTextureInput[],
  config: PixelDepthConfig
): ExtrudedBoxGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const subMeshes: SubMeshRange[] = [];

  const bases = buildFaceBases(box);
  const maxDepth = getExtrusionDepthScale(config.extrusionIntensity ?? config.intensity);

  const dx = Math.max(0, box.maxX - box.minX);
  const dy = Math.max(0, box.maxY - box.minY);
  const dz = Math.max(0, box.maxZ - box.minZ);
  const isPlaneX = dx < 0.002;
  const isPlaneY = dy < 0.002;
  const isPlaneZ = dz < 0.002;
  const isAnyPlane = isPlaneX || isPlaneY || isPlaneZ;

  // Helper to evaluate 3D point on a face at normalized UV (u, v) and normal offset h
  const evalPoint = (basis: FaceBasis, u: number, v: number, h: number): [number, number, number] => {
    const uSpan = basis.u1 - basis.u0;
    const vSpan = basis.v1 - basis.v0;
    const fu = Math.abs(uSpan) > 1e-6 ? (u - basis.u0) / uSpan : 0;
    const fv = Math.abs(vSpan) > 1e-6 ? (v - basis.v0) / vSpan : 0;
    return [
      basis.origin[0] + fu * basis.uVec[0] + fv * basis.vVec[0] + h * basis.normal[0],
      basis.origin[1] + fu * basis.uVec[1] + fv * basis.vVec[1] + h * basis.normal[1],
      basis.origin[2] + fu * basis.uVec[2] + fv * basis.vVec[2] + h * basis.normal[2]
    ];
  };

  // Helper to push a quad with 4 vertices [v0, v1, v2, v3] and standard Babylon left-handed triangles (0,1,2), (0,2,3)
  const pushQuad = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    norm: [number, number, number],
    uv0: [number, number],
    uv1: [number, number],
    uv2: [number, number],
    uv3: [number, number]
  ) => {
    const baseVertex = positions.length / 3;
    positions.push(
      p0[0], p0[1], p0[2],
      p1[0], p1[1], p1[2],
      p2[0], p2[1], p2[2],
      p3[0], p3[1], p3[2]
    );
    normals.push(
      norm[0], norm[1], norm[2],
      norm[0], norm[1], norm[2],
      norm[0], norm[1], norm[2],
      norm[0], norm[1], norm[2]
    );
    uvs.push(
      uv0[0], uv0[1],
      uv1[0], uv1[1],
      uv2[0], uv2[1],
      uv3[0], uv3[1]
    );
    indices.push(
      baseVertex, baseVertex + 1, baseVertex + 2,
      baseVertex, baseVertex + 2, baseVertex + 3
    );
  };

  for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
    const indexStart = indices.length;
    const basis = bases[faceIdx];
    const texInput = faceTextures[faceIdx];
    const decoded = texInput?.decoded ?? null;

    // Skip degenerate edge faces on 2D planes (e.g. the 0-width side slivers of a 2D plane)
    const isDegenerateEdgeOfPlane =
      (isPlaneX && faceIdx !== 2 && faceIdx !== 3) ||
      (isPlaneY && faceIdx !== 4 && faceIdx !== 5) ||
      (isPlaneZ && faceIdx !== 0 && faceIdx !== 1);

    if (isDegenerateEdgeOfPlane) {
      subMeshes.push({ materialIndex: faceIdx, indexStart, indexCount: 0 });
      continue;
    }

    // For animated textures or missing decoded data, emit standard flat quad so UV matrix animation works
    if (!decoded || texInput?.isAnimated) {
      const pTR = evalPoint(basis, basis.u1, basis.v0, 0);
      const pTL = evalPoint(basis, basis.u0, basis.v0, 0);
      const pBL = evalPoint(basis, basis.u0, basis.v1, 0);
      const pBR = evalPoint(basis, basis.u1, basis.v1, 0);
      pushQuad(
        pTR, pTL, pBL, pBR,
        basis.normal,
        [basis.u1, basis.v0],
        [basis.u0, basis.v0],
        [basis.u0, basis.v1],
        [basis.u1, basis.v1]
      );
      subMeshes.push({
        materialIndex: faceIdx,
        indexStart,
        indexCount: indices.length - indexStart
      });
      continue;
    }

    const texW = Math.max(1, decoded.width);
    const texH = Math.max(1, decoded.height);
    const uSlices = buildTexelSlices(basis.u0, basis.u1, texW);
    const vSlices = buildTexelSlices(basis.v0, basis.v1, texH);

    if (uSlices.length === 0 || vSlices.length === 0) {
      subMeshes.push({ materialIndex: faceIdx, indexStart, indexCount: 0 });
      continue;
    }

    // Compute luminance stats across all pixels of this texture
    const totalPixels = texW * texH;
    const lum = new Float32Array(totalPixels);
    const opaque = new Uint8Array(totalPixels);
    let minL = 1.0;
    let maxL = 0.0;
    let hasTransparentTexels = false;

    for (let i = 0; i < totalPixels; i++) {
      const a = decoded.data[i * 4 + 3];
      if (a >= 128) {
        opaque[i] = 1;
        const r = decoded.data[i * 4];
        const g = decoded.data[i * 4 + 1];
        const b = decoded.data[i * 4 + 2];
        const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        lum[i] = l;
        if (l < minL) minL = l;
        if (l > maxL) maxL = l;
      } else {
        hasTransparentTexels = true;
      }
    }

    const lumRange = maxL - minL;
    const nu = uSlices.length;
    const nv = vSlices.length;
    const cellHeights = new Float32Array(nu * nv);
    const cellLevels = new Int16Array(nu * nv); // -1 for transparent, 0..8 for opaque height level

    for (let j = 0; j < nv; j++) {
      const cy = vSlices[j].texIdx;
      for (let i = 0; i < nu; i++) {
        const cx = uSlices[i].texIdx;
        const tIdx = cy * texW + cx;
        const cIdx = j * nu + i;

        if (!opaque[tIdx]) {
          cellLevels[cIdx] = -1;
          cellHeights[cIdx] = 0;
          continue;
        }

        const relL = lumRange > 0.015 ? (lum[tIdx] - minL) / lumRange : 0.5;
        const qLevel = config.luminanceRelief ? Math.round(relL * 8) : 4;
        cellLevels[cIdx] = qLevel;

        if (isAnyPlane) {
          // On a 2D cutout plane, extrude both faces outward by half voxel thickness + relief
          const basePlaneHalf = maxDepth * 0.65;
          const reliefAdd = config.luminanceRelief ? (qLevel / 8) * maxDepth * 0.55 : 0;
          cellHeights[cIdx] = basePlaneHalf + reliefAdd;
        } else if (hasTransparentTexels) {
          // On a 3D box face with transparent cutouts (e.g. mushroom cap / tendrils),
          // every opaque pixel gets solid base thickness + stepped luminance relief
          const minCutoutH = maxDepth * 0.35;
          const reliefH = config.luminanceRelief ? (qLevel / 8) * maxDepth * 0.85 : maxDepth * 0.35;
          cellHeights[cIdx] = minCutoutH + reliefH;
        } else {
          // On a 100% opaque 3D box face, darkest crevices sit at h = 0 (box surface)
          // and brighter pixels pop out in 3D steps up to maxDepth
          cellHeights[cIdx] = lumRange > 0.015
            ? (qLevel / 8) * maxDepth
            : 0;
        }
      }
    }

    // 1. Greedy-mesh contiguous cells of identical height level for Front (+N) and Back (-N, if cutout) quads
    const visited = new Uint8Array(nu * nv);
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const startIdx = j * nu + i;
        if (visited[startIdx]) continue;
        const lvl = cellLevels[startIdx];
        if (lvl < 0) {
          visited[startIdx] = 1;
          continue;
        }

        const h = cellHeights[startIdx];

        // Expand width along i
        let w = 1;
        while (i + w < nu) {
          const nextIdx = j * nu + (i + w);
          if (!visited[nextIdx] && cellLevels[nextIdx] === lvl) {
            w++;
          } else {
            break;
          }
        }

        // Expand height along j
        let hCount = 1;
        outer: while (j + hCount < nv) {
          for (let k = 0; k < w; k++) {
            const checkIdx = (j + hCount) * nu + (i + k);
            if (visited[checkIdx] || cellLevels[checkIdx] !== lvl) {
              break outer;
            }
          }
          hCount++;
        }

        // Mark visited
        for (let dj = 0; dj < hCount; dj++) {
          for (let di = 0; di < w; di++) {
            visited[(j + dj) * nu + (i + di)] = 1;
          }
        }

        const ua = uSlices[i].a;
        const ub = uSlices[i + w - 1].b;
        const va = vSlices[j].a;
        const vb = vSlices[j + hCount - 1].b;

        // Front quad at +h (normal +N)
        const pTR = evalPoint(basis, ub, va, h);
        const pTL = evalPoint(basis, ua, va, h);
        const pBL = evalPoint(basis, ua, vb, h);
        const pBR = evalPoint(basis, ub, vb, h);

        pushQuad(
          pTR, pTL, pBL, pBR,
          basis.normal,
          [ub, va],
          [ua, va],
          [ua, vb],
          [ub, vb]
        );

        // If the face has transparent cutouts (and is not a 2D plane where the opposite subMesh already covers the back),
        // close the back of the cutout at h = 0 so it is watertight from all angles
        if (hasTransparentTexels && !isAnyPlane && h > 1e-5) {
          const b0 = evalPoint(basis, ua, va, 0);
          const b1 = evalPoint(basis, ub, va, 0);
          const b2 = evalPoint(basis, ub, vb, 0);
          const b3 = evalPoint(basis, ua, vb, 0);
          const backNormal: [number, number, number] = [
            -basis.normal[0],
            -basis.normal[1],
            -basis.normal[2]
          ];
          pushQuad(
            b0, b1, b2, b3,
            backNormal,
            [ua, va],
            [ub, va],
            [ub, vb],
            [ua, vb]
          );
        }
      }
    }

    // 2. Emit 3D step side-walls wherever a cell's height exceeds its neighbor's height
    const negUDir: [number, number, number] = [-basis.uDir[0], -basis.uDir[1], -basis.uDir[2]];
    const negVDir: [number, number, number] = [-basis.vDir[0], -basis.vDir[1], -basis.vDir[2]];

    for (let j = 0; j < nv; j++) {
      const va = vSlices[j].a;
      const vb = vSlices[j].b;
      const cy = vSlices[j].texIdx;
      // Flat interior UV range inside texel (cx, cy) so side walls sample exact pixel color & flat normal plateau
      const vIn0 = (cy + 0.35) / texH;
      const vIn1 = (cy + 0.65) / texH;

      for (let i = 0; i < nu; i++) {
        const cIdx = j * nu + i;
        if (cellLevels[cIdx] < 0) continue;

        const h1 = cellHeights[cIdx];
        if (h1 <= 1e-5) continue;

        const ua = uSlices[i].a;
        const ub = uSlices[i].b;
        const cx = uSlices[i].texIdx;
        const uIn0 = (cx + 0.35) / texW;
        const uIn1 = (cx + 0.65) / texW;

        const hLeft = i > 0 ? cellHeights[j * nu + (i - 1)] : 0;
        const hRight = i < nu - 1 ? cellHeights[j * nu + (i + 1)] : 0;
        const hTop = j > 0 ? cellHeights[(j - 1) * nu + i] : 0;
        const hBottom = j < nv - 1 ? cellHeights[(j + 1) * nu + i] : 0;

        // Right step wall (+uDir) at u = ub
        if (h1 - hRight > 1e-5) {
          const h0 = hRight;
          pushQuad(
            evalPoint(basis, ub, va, h0),
            evalPoint(basis, ub, va, h1),
            evalPoint(basis, ub, vb, h1),
            evalPoint(basis, ub, vb, h0),
            basis.uDir,
            [uIn1, vIn0],
            [uIn0, vIn0],
            [uIn0, vIn1],
            [uIn1, vIn1]
          );
        }

        // Left step wall (-uDir) at u = ua
        if (h1 - hLeft > 1e-5) {
          const h0 = hLeft;
          pushQuad(
            evalPoint(basis, ua, va, h1),
            evalPoint(basis, ua, va, h0),
            evalPoint(basis, ua, vb, h0),
            evalPoint(basis, ua, vb, h1),
            negUDir,
            [uIn1, vIn0],
            [uIn0, vIn0],
            [uIn0, vIn1],
            [uIn1, vIn1]
          );
        }

        // Top step wall (-vDir) at v = va
        if (h1 - hTop > 1e-5) {
          const h0 = hTop;
          pushQuad(
            evalPoint(basis, ub, va, h1),
            evalPoint(basis, ub, va, h0),
            evalPoint(basis, ua, va, h0),
            evalPoint(basis, ua, va, h1),
            negVDir,
            [uIn1, vIn0],
            [uIn1, vIn1],
            [uIn0, vIn1],
            [uIn0, vIn0]
          );
        }

        // Bottom step wall (+vDir) at v = vb
        if (h1 - hBottom > 1e-5) {
          const h0 = hBottom;
          pushQuad(
            evalPoint(basis, ua, vb, h1),
            evalPoint(basis, ua, vb, h0),
            evalPoint(basis, ub, vb, h0),
            evalPoint(basis, ub, vb, h1),
            basis.vDir,
            [uIn0, vIn0],
            [uIn0, vIn1],
            [uIn1, vIn1],
            [uIn1, vIn0]
          );
        }
      }
    }

    subMeshes.push({
      materialIndex: faceIdx,
      indexStart,
      indexCount: indices.length - indexStart
    });
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
    subMeshes
  };
}
