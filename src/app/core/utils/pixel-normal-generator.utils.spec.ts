import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PIXEL_DEPTH_CONFIG,
  getDepthIntensityMultiplier,
  getNeutralNormalMapDataUrl,
  generatePixelArtNormalMap
} from './pixel-normal-generator.utils';

describe('PixelNormalGeneratorUtils', () => {
  it('returns proper multipliers for subtle, medium, and deep intensities', () => {
    expect(getDepthIntensityMultiplier('subtle')).toBe(0.6);
    expect(getDepthIntensityMultiplier('medium')).toBe(1.2);
    expect(getDepthIntensityMultiplier('deep')).toBe(2.2);
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

  it('returns neutral normal map on image error', async () => {
    const res = await generatePixelArtNormalMap('invalid_data_url', {
      ...DEFAULT_PIXEL_DEPTH_CONFIG,
      enabled: true
    });
    expect(res).toBe(getNeutralNormalMapDataUrl());
  });
});
