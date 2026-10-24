import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PIXEL_DEPTH_CONFIG,
  computePixelArtNormalRgba,
  getDepthIntensityMultiplier,
  getNeutralNormalMapDataUrl,
  generatePixelArtNormalMap
} from './pixel-normal-generator.utils';

describe('PixelNormalGeneratorUtils', () => {
  it('returns proper multipliers for subtle, medium, deep presets and custom slider percentages', () => {
    expect(getDepthIntensityMultiplier('subtle')).toBe(0.28);
    expect(getDepthIntensityMultiplier('medium')).toBe(0.63);
    expect(getDepthIntensityMultiplier('deep')).toBe(1.19);
    expect(getDepthIntensityMultiplier(10)).toBe(0.14);
    expect(getDepthIntensityMultiplier(100)).toBe(1.4);
  });

  it('provides a valid neutral normal map dataUrl', () => {
    const neutral = getNeutralNormalMapDataUrl();
    expect(neutral).toContain('data:image/png;base64,');
  });

  it('returns neutral normal map when enabled is false', async () => {
    const res = await generatePixelArtNormalMap('some_data_url', {
      ...DEFAULT_PIXEL_DEPTH_CONFIG,
      enabled: false
    });
    expect(res).toBe(getNeutralNormalMapDataUrl());
  });

  it('returns neutral normal map when both pixelBevel and luminanceRelief are false', async () => {
    const res = await generatePixelArtNormalMap('some_data_url', {
      ...DEFAULT_PIXEL_DEPTH_CONFIG,
      enabled: true,
      pixelBevel: false,
      luminanceRelief: false
    });
    expect(res).toBe(getNeutralNormalMapDataUrl());
  });

  it('returns neutral normal map on image error', async () => {
    const res = await generatePixelArtNormalMap('invalid_data_url', {
      ...DEFAULT_PIXEL_DEPTH_CONFIG,
      enabled: true
    });
    expect(res).toBe(getNeutralNormalMapDataUrl());
  });

  it('computes edge-aware normal map with full alpha=255 and flat interior plateaus', () => {
    // 2x2 pixel-art texture:
    // (0,0) white, (1,0) white (same-color neighbor!)
    // (0,1) transparent, (1,1) dark gray
    const src = new Uint8ClampedArray([
      255, 255, 255, 255,   255, 255, 255, 255,
      0,   0,   0,   0,     40,  40,  40,  255
    ]);

    const res = computePixelArtNormalRgba(2, 2, src, {
      enabled: true,
      pixelBevel: true,
      luminanceRelief: true,
      extrudePixels: true,
      intensity: 'medium'
    });

    // 2x2 with <=16 scale (8x) -> 16x16 normal map
    expect(res.width).toBe(16);
    expect(res.height).toBe(16);

    // Every single output pixel (including transparent source cell (0,1)) must have alpha = 255
    // so Canvas premultiplied alpha never corrupts RGB normal channels
    for (let i = 0; i < res.width * res.height; i++) {
      expect(res.data[i * 4 + 3]).toBe(255);
    }

    // Transparent cell (0,1) at subpixel (3, 11) must have neutral normal (128, 128, 255)
    const transIdx = (11 * res.width + 3) * 4;
    expect(res.data[transIdx]).toBe(128);
    expect(res.data[transIdx + 1]).toBe(128);
    expect(res.data[transIdx + 2]).toBe(255);

    // Bottom edge of white pixel (0,0) bordering transparent pixel (0,1) at (u=4, v=7)
    // should tilt strongly downward (-ny -> G < 128)
    const borderToTransIdx = (7 * res.width + 4) * 4;
    expect(res.data[borderToTransIdx + 1]).toBeLessThan(100);

    // Seam between identical white pixels (0,0) and (1,0) at (u=7, v=4)
    // should have minimal X tilt compared to high-contrast edges
    const sameColorSeamIdx = (4 * res.width + 7) * 4;
    expect(Math.abs(res.data[sameColorSeamIdx] - 128)).toBeLessThan(15);
  });
});
