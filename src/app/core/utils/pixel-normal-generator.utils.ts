export interface PixelDepthConfig {
  enabled: boolean;
  pixelBevel: boolean;      // Micro-chamfered edges around each pixel cell
  luminanceRelief: boolean; // Sobel gradient height from pixel luminance
  parallax: boolean;        // Parallax occlusion mapping (packed height in alpha)
  intensity: 'subtle' | 'medium' | 'deep';
}

export const DEFAULT_PIXEL_DEPTH_CONFIG: PixelDepthConfig = {
  enabled: false,
  pixelBevel: true,
  luminanceRelief: true,
  parallax: true,
  intensity: 'medium'
};

const normalMapMemoryCache = new Map<string, string>();

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
 * Generates an on-the-fly tangent-space normal map + height map from a pixel-art 2D texture data URL.
 * Produces crisp micro-bevels between pixels and surface relief based on pixel luminance
 * using sub-pixel supersampling so individual pixel cells gain true 3D chamfers and depth.
 */
export function generatePixelArtNormalMap(
  dataUrl: string,
  config: PixelDepthConfig = DEFAULT_PIXEL_DEPTH_CONFIG
): Promise<string> {
  if (!config.enabled) {
    // Return neutral flat normal (0.5, 0.5, 1.0) -> RGB(128, 128, 255)
    return Promise.resolve(getNeutralNormalMapDataUrl());
  }

  const cacheKey = `${dataUrl}_${config.pixelBevel}_${config.luminanceRelief}_${config.parallax}_${config.intensity}`;
  const cached = normalMapMemoryCache.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise(resolve => {
    if (typeof document === 'undefined') {
      resolve(getNeutralNormalMapDataUrl());
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
          resolve(getNeutralNormalMapDataUrl());
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Compute luminance buffer and alpha for the source pixel art
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

        // Sub-pixel supersampling scale factor (e.g. 16x16 sprite -> 128x128 normal map)
        const scale = width <= 16 ? 8 : (width <= 32 ? 4 : 2);
        const outWidth = width * scale;
        const outHeight = height * scale;

        const outCanvas = document.createElement('canvas');
        outCanvas.width = outWidth;
        outCanvas.height = outHeight;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) {
          resolve(getNeutralNormalMapDataUrl());
          return;
        }

        const outImgData = outCtx.createImageData(outWidth, outHeight);
        const outData = outImgData.data;

        const mult = getDepthIntensityMultiplier(config.intensity);
        const bevelWeight = config.pixelBevel ? 1.1 * mult : 0.0;
        const sobelWeight = config.luminanceRelief ? 1.0 * mult : 0.0;
        const bevelMargin = scale * 0.25; // 2.0 sub-pixels for 8x scale

        for (let cy = 0; cy < height; cy++) {
          for (let cx = 0; cx < width; cx++) {
            const cellIdx = cy * width + cx;
            const cellAlpha = alpha[cellIdx];

            // If transparent pixel, write neutral normal with alpha 0 for all sub-pixels
            if (cellAlpha === 0) {
              for (let v = 0; v < scale; v++) {
                for (let u = 0; u < scale; u++) {
                  const outX = cx * scale + u;
                  const outY = cy * scale + v;
                  const outIdx = (outY * outWidth + outX) * 4;
                  outData[outIdx] = 128;
                  outData[outIdx + 1] = 128;
                  outData[outIdx + 2] = 255;
                  outData[outIdx + 3] = 0;
                }
              }
              continue;
            }

            // Neighbor coordinates (clamped boundary)
            const cx0 = Math.max(0, cx - 1);
            const cx1 = Math.min(width - 1, cx + 1);
            const cy0 = Math.max(0, cy - 1);
            const cy1 = Math.min(height - 1, cy + 1);

            const curL = lum[cellIdx];
            // If neighbor is fully transparent, treat its luminance as 0 to create silhouette bevels
            const leftL = alpha[cy * width + cx0] > 0 ? lum[cy * width + cx0] : 0.0;
            const rightL = alpha[cy * width + cx1] > 0 ? lum[cy * width + cx1] : 0.0;
            const topL = alpha[cy0 * width + cx] > 0 ? lum[cy0 * width + cx] : 0.0;
            const botL = alpha[cy1 * width + cx] > 0 ? lum[cy1 * width + cx] : 0.0;

            // Macro 3x3 Sobel kernel for general luminance slope across pixels
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

            // Render all sub-pixels for this pixel cell
            for (let v = 0; v < scale; v++) {
              for (let u = 0; u < scale; u++) {
                // Distances to cell edges (in sub-pixels)
                const dLeft = u + 0.5;
                const dRight = scale - (u + 0.5);
                const dTop = v + 0.5;
                const dBottom = scale - (v + 0.5);

                // Sub-pixel chamfer slope factor: 1.0 at outer border, 0.0 at interior plateau
                const sLeft = dLeft < bevelMargin ? (bevelMargin - dLeft) / bevelMargin : 0;
                const sRight = dRight < bevelMargin ? (bevelMargin - dRight) / bevelMargin : 0;
                const sTop = dTop < bevelMargin ? (bevelMargin - dTop) / bevelMargin : 0;
                const sBottom = dBottom < bevelMargin ? (bevelMargin - dBottom) / bevelMargin : 0;

                let nx = 0;
                let ny = 0;
                const nz = 1.0;

                // 1. Sub-pixel Tile Bevel (chamfers outer rim of each individual pixel)
                if (config.pixelBevel) {
                  // Right tilts +X, Left tilts -X
                  nx += (sRight - sLeft) * bevelWeight;
                  // Top tilts +Y (tangent space UP), Bottom tilts -Y
                  ny += (sTop - sBottom) * bevelWeight;
                }

                // 2. Luminance Relief (inter-pixel stepping + macro height slopes)
                if (config.luminanceRelief) {
                  // Stepped boundary slope: surface rises or drops based on neighbor luminance
                  // If right neighbor is higher, slope tilts towards -X (left) to catch side lighting
                  const stepX = (curL - rightL) * sRight + (leftL - curL) * sLeft;
                  // If top neighbor is higher, slope tilts towards -Y (down)
                  const stepY = (curL - topL) * sTop + (botL - curL) * sBottom;

                  nx += stepX * sobelWeight * 1.5;
                  ny += stepY * sobelWeight * 1.5;

                  // Macro gradient tilt
                  nx -= sobelX * sobelWeight * 0.25;
                  ny += sobelY * sobelWeight * 0.25;
                }

                // Normalize tangent space vector (nx, ny, nz)
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
                const normX = nx / len;
                const normY = ny / len;
                const normZ = nz / len;

                // Parallax heightmap calculation packed in Alpha channel
                let packedAlpha = 255;
                if (config.parallax) {
                  const sMax = Math.max(sLeft, sRight, sTop, sBottom);
                  const baseH = config.luminanceRelief ? curL : 0.8;
                  const h = Math.max(0, Math.min(1, baseH - sMax * 0.3));
                  packedAlpha = Math.round(h * 255);
                }

                const outX = cx * scale + u;
                const outY = cy * scale + v;
                const outIdx = (outY * outWidth + outX) * 4;

                outData[outIdx] = Math.round((normX * 0.5 + 0.5) * 255);
                outData[outIdx + 1] = Math.round((normY * 0.5 + 0.5) * 255);
                outData[outIdx + 2] = Math.round((normZ * 0.5 + 0.5) * 255);
                outData[outIdx + 3] = packedAlpha;
              }
            }
          }
        }

        outCtx.putImageData(outImgData, 0, 0);
        const resultUrl = outCanvas.toDataURL('image/png');
        normalMapMemoryCache.set(cacheKey, resultUrl);
        resolve(resultUrl);
      } catch {
        resolve(getNeutralNormalMapDataUrl());
      }
    };

    img.onerror = () => resolve(getNeutralNormalMapDataUrl());
    img.src = dataUrl;
  });
}

/**
 * Returns a 1x1 neutral flat tangent-space normal map (128, 128, 255, 255)
 */
export function getNeutralNormalMapDataUrl(): string {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}
