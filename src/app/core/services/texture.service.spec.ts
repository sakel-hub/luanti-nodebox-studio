import { describe, it, expect, beforeEach } from 'vitest';
import { TextureService } from './texture.service';

describe('TextureService', () => {
  let service: TextureService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    service = new TextureService();
  });

  it('should initialize with default library textures', () => {
    const textures = service.textures();
    expect(textures.length).toBe(9);

    const ids = textures.map(t => t.id);
    expect(ids).toContain('default_grass.png');
    expect(ids).toContain('default_wood.png');
    expect(ids).toContain('default_stone.png');
    expect(ids).toContain('default_cobble.png');
    expect(ids).toContain('default_brick.png');
    expect(ids).toContain('default_dirt.png');
    expect(ids).toContain('default_glass.png');
    expect(ids).toContain('default_steel_block.png');
    expect(ids).toContain('default_mese_block.png');
  });

  it('should have author and license attribution for each default texture', () => {
    const textures = service.textures();
    for (const tex of textures) {
      expect(tex.author).toBeDefined();
      expect(tex.license).toBeDefined();
      expect(tex.dataUrl).toMatch(/^data:image\/png;base64,/);
    }
  });

  it('should get texture by id', () => {
    const wood = service.getTextureById('default_wood.png');
    expect(wood).toBeDefined();
    expect(wood?.name).toBe('Wood Planks');
    expect(wood?.author).toBe('BlockMen');
  });

  it('should resolve uv_grid_16.png legacy alias to default_mese_block.png', () => {
    const alias = service.getTextureById('uv_grid_16.png');
    expect(alias).toBeDefined();
    expect(alias?.id).toBe('default_mese_block.png');
  });

  it('should add custom texture and persist to signal', () => {
    const custom = service.addCustomTexture('My Test Texture', 'data:image/png;base64,abc123');
    expect(custom.id).toBe('my_test_texture');
    expect(custom.isCustom).toBe(true);

    const retrieved = service.getTextureById('my_test_texture');
    expect(retrieved).toBeDefined();
    expect(retrieved?.dataUrl).toBe('data:image/png;base64,abc123');
  });

  it('should resolve texture with ^[transformFX modifier', () => {
    const flipped = service.getTextureById('default_wood.png^[transformFX');
    expect(flipped).toBeDefined();
    expect(flipped?.id).toBe('default_wood.png^[transformFX');
    expect(flipped?.name).toBe('Wood Planks (FX)');
    expect(flipped?.dataUrl).toBeDefined();
  });

  it('should delete custom texture and prevent deleting built-in texture', () => {
    service.addCustomTexture('Custom Leaf', 'data:image/png;base64,leaf123');
    expect(service.getTextureById('custom_leaf')).toBeDefined();

    // Cannot delete built-in
    const deleteBuiltin = service.deleteCustomTexture('default_wood.png');
    expect(deleteBuiltin).toBe(false);
    expect(service.getTextureById('default_wood.png')).toBeDefined();

    // Can delete custom
    const deleteCustom = service.deleteCustomTexture('custom_leaf');
    expect(deleteCustom).toBe(true);
    expect(service.getTextureById('custom_leaf')).toBeUndefined();
  });

  it('should clean unused custom textures while keeping active and built-in textures', () => {
    service.addCustomTexture('Used Bark', 'data:image/png;base64,bark123');
    service.addCustomTexture('Unused Dirt', 'data:image/png;base64,dirt123');

    const usedIds = new Set<string>(['used_bark', 'default_stone.png']);
    const removedCount = service.cleanUnusedCustomTextures(usedIds);

    expect(removedCount).toBe(1);
    expect(service.getTextureById('used_bark')).toBeDefined();
    expect(service.getTextureById('unused_dirt')).toBeUndefined();
    expect(service.getTextureById('default_stone.png')).toBeDefined();
  });

  it('should update texture properties for custom textures', () => {
    service.addCustomTexture('Flame Sheet', 'data:image/png;base64,flame123');
    service.updateTextureProperties('flame_sheet', {
      backfaceCulling: false,
      animation: {
        type: 'vertical_frames',
        aspect_w: 16,
        aspect_h: 16,
        length: 2.0,
        frameCount: 8
      }
    });

    const updated = service.getTextureById('flame_sheet');
    expect(updated).toBeDefined();
    expect(updated?.backfaceCulling).toBe(false);
    expect(updated?.animation?.type).toBe('vertical_frames');
    expect(updated?.animation?.frameCount).toBe(8);
    expect(updated?.animation?.length).toBe(2.0);
  });
});

