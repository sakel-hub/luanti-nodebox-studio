export interface PixelDepthConfig {
  enabled: boolean;
  pixelBevel: boolean;      // Edge-aware pixel chamfers around color/alpha clusters + subtle micro-mosaic
  luminanceRelief: boolean; // Stepped luminance height relief & Sobel gradients
  extrudePixels: boolean;   // Real 3D Voxel / Texel Extrusion (solid 3D cutout sprites & stepped surface relief)
  intensity: 'subtle' | 'medium' | 'deep';
}

export const DEFAULT_PIXEL_DEPTH_CONFIG: PixelDepthConfig = {
  enabled: false,
  pixelBevel: true,
  luminanceRelief: true,
  extrudePixels: true,
  intensity: 'medium'
};

export interface DecodedTextureRgba {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

const normalMapMemoryCache = new Map<string, string>();
const decodedTextureCache = new Map<string, DecodedTextureRgba>();

/**
 * Returns numerical multiplier for depth intensity
 */
export function getDepthIntensityMultiplier(intensity: 'subtle' | 'medium' | 'deep'): number {
  switch (intensity) {
    case 'subtle': return 0.6;
    case 'medium': return 1.2;
    case 'deep': return 2.2;
  }
}

/**
 * Decodes a 2D texture data URL (or image path) into raw RGBA pixels and caches the result.
 */
export function decodeTextureRgba(dataUrl: string): Promise<DecodedTextureRgba | null> {
  if (!dataUrl) {
    return Promise.resolve(null);
  }
  const cached = decodedTextureCache.get(dataUrl);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise(resolve => {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width || 16;
        const height = img.naturalHeight || img.height || 16;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, width, height);
        const decoded: DecodedTextureRgba = {
          width,
          height,
          data: imgData.data
        };
        decodedTextureCache.set(dataUrl, decoded);
        resolve(decoded);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Normalized RGB color difference in [0, 1] between two pixels in an RGBA buffer.
 * Returns 1.0 when transitioning between an opaque pixel and a transparent pixel.
 */
function computeColorContrast(
  data: Uint8ClampedArray,
  idxA: number,
  idxB: number
): number {
  const aA = data[idxA * 4 + 3];
  const aB = data[idxB * 4 + 3];
  if ((aA === 0) !== (aB === 0)) {
    return 1.0;
  }
  if (aA === 0 && aB === 0) {
    return 0.0;
  }
  const dr = data[idxA * 4] - data[idxB * 4];
  const dg = data[idxA * 4 + 1] - data[idxB * 4 + 1];
  const db = data[idxA * 4 + 2] - data[idxB * 4 + 2];
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);
  return Math.min(1.0, dist / 140.0);
}

/**
 * Pure computation of a supersampled tangent-space normal map RGBA buffer from raw pixel-art RGBA data.
 * Always writes alpha = 255 for all texels to prevent HTML5 Canvas premultiplied-alpha RGB quantization.
 */
export function computePixelArtNormalRgba(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  config: PixelDepthConfig = DEFAULT_PIXEL_DEPTH_CONFIG
): DecodedTextureRgba {
  const lum = new Float32Array(width * height);
  const alpha = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    alpha[i] = a;
    // Standard ITU BT.601 luminance normalized to [0, 1]
    lum[i] = a > 0 ? (0.299 * r + 0.587 * g + 0.114 * b) / 255.0 : 0.0;
  }

  // Sub-pixel supersampling scale factor (16x16 sprite -> 128x128 crisp normal map)
  const scale = width <= 16 ? 8 : (width <= 32 ? 4 : 2);
  const outWidth = width * scale;
  const outHeight = height * scale;
  const outData = new Uint8ClampedArray(outWidth * outHeight * 4);

  const mult = getDepthIntensityMultiplier(config.intensity);
  const bevelWeight = config.pixelBevel ? 0.95 * mult : 0.0;
  const sobelWeight = config.luminanceRelief ? 0.9 * mult : 0.0;
  // Crisp 1-subpixel chamfer rim (e.g. 1.0 out of 8 sub-pixels) so 75%+ of each pixel is a flat plateau
  const bevelMargin = Math.max(1.0, scale * 0.14);
  // When both bevel and relief are active, same-color interior seams stay nearly flat (cohesive clusters);
  // when Mosaic-only is chosen, same-color tiles keep a delicate mosaic groove.
  const sameColorSeamFactor = config.luminanceRelief ? 0.08 : 0.38;

  for (let cy = 0; cy < height; cy++) {
    for (let cx = 0; cx < width; cx++) {
      const cellIdx = cy * width + cx;
      const cellAlpha = alpha[cellIdx];

      // Transparent pixel: neutral flat normal (128, 128, 255) with full alpha 255
      if (cellAlpha === 0) {
        for (let v = 0; v < scale; v++) {
          for (let u = 0; u < scale; u++) {
            const outX = cx * scale + u;
            const outY = cy * scale + v;
            const outIdx = (outY * outWidth + outX) * 4;
            outData[outIdx] = 128;
            outData[outIdx + 1] = 128;
            outData[outIdx + 2] = 255;
            outData[outIdx + 3] = 255;
          }
        }
        continue;
      }

      const cx0 = Math.max(0, cx - 1);
      const cx1 = Math.min(width - 1, cx + 1);
      const cy0 = Math.max(0, cy - 1);
      const cy1 = Math.min(height - 1, cy + 1);

      const leftIdx = cy * width + cx0;
      const rightIdx = cy * width + cx1;
      const topIdx = cy0 * width + cx;
      const botIdx = cy1 * width + cx;

      const curL = lum[cellIdx];
      const leftL = alpha[leftIdx] > 0 ? lum[leftIdx] : 0.0;
      const rightL = alpha[rightIdx] > 0 ? lum[rightIdx] : 0.0;
      const topL = alpha[topIdx] > 0 ? lum[topIdx] : 0.0;
      const botL = alpha[botIdx] > 0 ? lum[botIdx] : 0.0;

      // Edge-aware contrast factors per cardinal border
      const cLeft = cx === 0 ? 0.5 : computeColorContrast(data, cellIdx, leftIdx);
      const cRight = cx === width - 1 ? 0.5 : computeColorContrast(data, cellIdx, rightIdx);
      const cTop = cy === 0 ? 0.5 : computeColorContrast(data, cellIdx, topIdx);
      const cBottom = cy === height - 1 ? 0.5 : computeColorContrast(data, cellIdx, botIdx);

      const edgeLeft = cLeft > 0.03 ? Math.max(0.4, cLeft) : sameColorSeamFactor;
      const edgeRight = cRight > 0.03 ? Math.max(0.4, cRight) : sameColorSeamFactor;
      const edgeTop = cTop > 0.03 ? Math.max(0.4, cTop) : sameColorSeamFactor;
      const edgeBottom = cBottom > 0.03 ? Math.max(0.4, cBottom) : sameColorSeamFactor;

      // Macro 3x3 Sobel kernel for subtle overall luminance slope
      let sobelX = 0;
      let sobelY = 0;
      if (config.luminanceRelief) {
        const l00 = alpha[cy0 * width + cx0] > 0 ? lum[cy0 * width + cx0] : 0.0;
        const l10 = topL;
        const l20 = alpha[cy0 * width + cx1] > 0 ? lum[cy0 * width + cx1] : 0.0;

        const l01 = leftL;
        const l21 = rightL;

        const l02 = alpha[cy1 * width + cx0] > 0 ? lum[cy1 * width + cx0] : 0.0;
        const l12 = botL;
        const l22 = alpha[cy1 * width + cx1] > 0 ? lum[cy1 * width + cx1] : 0.0;

        sobelX = (l20 + 2 * l21 + l22) - (l00 + 2 * l01 + l02);
        sobelY = (l02 + 2 * l12 + l22) - (l00 + 2 * l10 + l20);
      }

      for (let v = 0; v < scale; v++) {
        for (let u = 0; u < scale; u++) {
          const dLeft = u + 0.5;
          const dRight = scale - (u + 0.5);
          const dTop = v + 0.5;
          const dBottom = scale - (v + 0.5);

          const sLeft = dLeft < bevelMargin ? (bevelMargin - dLeft) / bevelMargin : 0;
          const sRight = dRight < bevelMargin ? (bevelMargin - dRight) / bevelMargin : 0;
          const sTop = dTop < bevelMargin ? (bevelMargin - dTop) / bevelMargin : 0;
          const sBottom = dBottom < bevelMargin ? (bevelMargin - dBottom) / bevelMargin : 0;

          let nx = 0;
          let ny = 0;
          const nz = 1.0;

          // 1. Edge-Aware Pixel Bevel
          if (config.pixelBevel) {
            nx += (sRight * edgeRight - sLeft * edgeLeft) * bevelWeight;
            ny += (sTop * edgeTop - sBottom * edgeBottom) * bevelWeight;
          }

          // 2. Luminance Relief (crisp inter-pixel steps + subtle macro slope)
          if (config.luminanceRelief) {
            const stepX = (curL - rightL) * sRight + (leftL - curL) * sLeft;
            const stepY = (curL - topL) * sTop + (botL - curL) * sBottom;

            nx += stepX * sobelWeight * 1.4;
            ny += stepY * sobelWeight * 1.4;

            nx -= sobelX * sobelWeight * 0.15;
            ny += sobelY * sobelWeight * 0.15;
          }

          const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
          const normX = nx / len;
          const normY = ny / len;
          const normZ = nz / len;

          const outX = cx * scale + u;
          const outY = cy * scale + v;
          const outIdx = (outY * outWidth + outX) * 4;

          outData[outIdx] = Math.round((normX * 0.5 + 0.5) * 255);
          outData[outIdx + 1] = Math.round((normY * 0.5 + 0.5) * 255);
          outData[outIdx + 2] = Math.round((normZ * 0.5 + 0.5) * 255);
          outData[outIdx + 3] = 255;
        }
      }
    }
  }

  return { width: outWidth, height: outHeight, data: outData };
}

/**
 * Generates an on-the-fly tangent-space normal map data URL from a pixel-art 2D texture data URL.
 */
export async function generatePixelArtNormalMap(
  dataUrl: string,
  config: PixelDepthConfig = DEFAULT_PIXEL_DEPTH_CONFIG
): Promise<string> {
  if (!config.enabled || (!config.pixelBevel && !config.luminanceRelief)) {
    return getNeutralNormalMapDataUrl();
  }

  const cacheKey = `${dataUrl}_${config.pixelBevel}_${config.luminanceRelief}_${config.intensity}`;
  const cached = normalMapMemoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const decoded = await decodeTextureRgba(dataUrl);
  if (!decoded || typeof document === 'undefined') {
    return getNeutralNormalMapDataUrl();
  }

  try {
    const normalRgba = computePixelArtNormalRgba(decoded.width, decoded.height, decoded.data, config);
    const outCanvas = document.createElement('canvas');
    outCanvas.width = normalRgba.width;
    outCanvas.height = normalRgba.height;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) {
      return getNeutralNormalMapDataUrl();
    }

    const outImgData = outCtx.createImageData(normalRgba.width, normalRgba.height);
    outImgData.data.set(normalRgba.data);
    outCtx.putImageData(outImgData, 0, 0);

    const resultUrl = outCanvas.toDataURL('image/png');
    normalMapMemoryCache.set(cacheKey, resultUrl);
    return resultUrl;
  } catch {
    return getNeutralNormalMapDataUrl();
  }
}

/**
 * Returns a 1x1 neutral flat tangent-space normal map (128, 128, 255, 255)
 */
export function getNeutralNormalMapDataUrl(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}
