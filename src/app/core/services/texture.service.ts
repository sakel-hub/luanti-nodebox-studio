import { Injectable, signal } from '@angular/core';
import { safeGetItem, safeSetItem } from '../utils/storage.utils';
import { DEFAULT_TEXTURES } from '../constants/default-textures';
import { TextureAnimationConfig } from '../models/nodebox.model';
import { PixelDepthConfig, DEFAULT_PIXEL_DEPTH_CONFIG, generatePixelArtNormalMap, getNeutralNormalMapDataUrl } from '../utils/pixel-normal-generator.utils';

export interface TextureDefinition {
  id: string;
  name: string;
  dataUrl: string;
  isCustom?: boolean;
  author?: string;
  license?: string;
  animation?: TextureAnimationConfig;
  backfaceCulling?: boolean;
  tileableVertical?: boolean;
  tileableHorizontal?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TextureService {
  public readonly textures = signal<TextureDefinition[]>([]);
  public readonly textureUpdated = signal<number>(0);
  private readonly transformedCache = new Map<string, TextureDefinition>();
  private readonly fallbackCache = new Map<string, TextureDefinition>();

  constructor() {
    this.initDefaultTextures();
  }

  private initDefaultTextures(): void {
    const defaults: TextureDefinition[] = [...DEFAULT_TEXTURES];

    // Load any user custom textures saved in localStorage
    const savedCustom = safeGetItem('luanti_custom_textures');
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom) as TextureDefinition[];
        this.textures.set([...defaults, ...parsed]);
        return;
      } catch {
        // Fallback on corrupt JSON
      }
    }

    this.textures.set(defaults);
  }

  public addCustomTexture(
    name: string,
    dataUrl: string,
    options?: Partial<TextureDefinition>
  ): TextureDefinition {
    const id = name.toLowerCase().replace(/\s+/g, '_');
    const newTex: TextureDefinition = {
      id,
      name,
      dataUrl,
      isCustom: true,
      ...options
    };

    const current = this.textures();
    const updated = [...current.filter(t => t.id !== id), newTex];
    this.textures.set(updated);

    const customOnly = updated.filter(t => t.isCustom);
    safeSetItem('luanti_custom_textures', JSON.stringify(customOnly));
    this.textureUpdated.update(v => v + 1);

    return newTex;
  }

  public updateTextureProperties(id: string, updates: Partial<TextureDefinition>): void {
    const current = this.textures();
    const index = current.findIndex(t => t.id === id);
    if (index === -1) return;

    const existing = current[index];
    const updatedTex: TextureDefinition = {
      ...existing,
      ...updates
    };

    const updated = [...current];
    updated[index] = updatedTex;
    this.textures.set(updated);

    if (updatedTex.isCustom) {
      const customOnly = updated.filter(t => t.isCustom);
      safeSetItem('luanti_custom_textures', JSON.stringify(customOnly));
    }

    // Invalidate any transformed versions
    this.transformedCache.delete(id);
    this.transformedCache.delete(`${id}^[transformFX`);
    this.textureUpdated.update(v => v + 1);
  }

  public async detectTextureProperties(
    dataUrl: string
  ): Promise<{ width: number; height: number; animation?: TextureAnimationConfig }> {
    return new Promise((resolve) => {
      if (typeof Image === 'undefined') {
        resolve({ width: 16, height: 16 });
        return;
      }

      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth || 16;
        const height = img.naturalHeight || 16;
        let animation: TextureAnimationConfig | undefined;

        // Luanti vertical frames convention: height > width and divisible by width
        if (height > width && height % width === 0) {
          animation = {
            type: 'vertical_frames',
            aspect_w: width,
            aspect_h: width,
            length: 1.0
          };
        }

        resolve({ width, height, animation });
      };
      img.onerror = () => {
        resolve({ width: 16, height: 16 });
      };
      img.src = dataUrl;
    });
  }

  public deleteCustomTexture(id: string): boolean {
    const current = this.textures();
    const target = current.find(t => t.id === id);
    if (!target || !target.isCustom) {
      return false;
    }

    const updated = current.filter(t => t.id !== id);
    this.textures.set(updated);

    const customOnly = updated.filter(t => t.isCustom);
    safeSetItem('luanti_custom_textures', JSON.stringify(customOnly));

    this.transformedCache.delete(id);
    this.transformedCache.delete(`${id}^[transformFX`);

    return true;
  }

  public cleanUnusedCustomTextures(usedBaseIds: Set<string>): number {
    const current = this.textures();
    const toKeep: TextureDefinition[] = [];
    let removedCount = 0;

    for (const tex of current) {
      if (!tex.isCustom || usedBaseIds.has(tex.id)) {
        toKeep.push(tex);
      } else {
        removedCount++;
        this.transformedCache.delete(tex.id);
        this.transformedCache.delete(`${tex.id}^[transformFX`);
      }
    }

    if (removedCount > 0) {
      this.textures.set(toKeep);
      const customOnly = toKeep.filter(t => t.isCustom);
      safeSetItem('luanti_custom_textures', JSON.stringify(customOnly));
    }

    return removedCount;
  }

  public getTextureById(id?: string): TextureDefinition | undefined {
    if (!id) return undefined;

    const found = this.textures().find(t => t.id === id);
    if (found) return found;

    // Check Luanti Flip X modifier: e.g. "tex.png^[transformFX"
    if (id.endsWith('^[transformFX')) {
      const cached = this.transformedCache.get(id);
      if (cached) return cached;

      const baseId = id.slice(0, -'^[transformFX'.length);
      const baseTex = this.getTextureById(baseId) || this.getOrCreateProceduralFallback(baseId);

      const placeholderDef: TextureDefinition = {
        id,
        name: `${baseTex.name} (FX)`,
        dataUrl: baseTex.dataUrl,
        isCustom: baseTex.isCustom,
        animation: baseTex.animation,
        backfaceCulling: baseTex.backfaceCulling,
        tileableVertical: baseTex.tileableVertical,
        tileableHorizontal: baseTex.tileableHorizontal
      };
      this.transformedCache.set(id, placeholderDef);

      this.renderFlippedTexture(baseTex.dataUrl).then(flippedUrl => {
        placeholderDef.dataUrl = flippedUrl;
        this.textureUpdated.update(v => v + 1);
      });

      return placeholderDef;
    }

    // Backward-compatibility alias for previous uv_grid_16 placeholder
    if (id === 'uv_grid_16.png') {
      return this.textures().find(t => t.id === 'default_mese_block.png');
    }

    return undefined;
  }

  public async ensureTransformedTexture(id: string): Promise<TextureDefinition | undefined> {
    if (!id.endsWith('^[transformFX')) {
      return this.getTextureById(id);
    }

    const baseId = id.slice(0, -'^[transformFX'.length);
    const baseTex = this.getTextureById(baseId) || this.getOrCreateProceduralFallback(baseId);

    const cached = this.transformedCache.get(id);
    if (cached && cached.dataUrl !== baseTex.dataUrl) {
      return cached;
    }

    const flippedUrl = await this.renderFlippedTexture(baseTex.dataUrl);
    const def: TextureDefinition = {
      id,
      name: `${baseTex.name} (FX)`,
      dataUrl: flippedUrl,
      isCustom: baseTex.isCustom,
      animation: baseTex.animation,
      backfaceCulling: baseTex.backfaceCulling,
      tileableVertical: baseTex.tileableVertical,
      tileableHorizontal: baseTex.tileableHorizontal
    };
    this.transformedCache.set(id, def);
    this.textureUpdated.update(v => v + 1);
    return def;
  }

  public async getOrCreateNormalMap(
    textureId: string,
    config: PixelDepthConfig = DEFAULT_PIXEL_DEPTH_CONFIG
  ): Promise<string> {
    const tex = this.getTextureById(textureId) || this.getOrCreateProceduralFallback(textureId);
    if (!tex || !tex.dataUrl) {
      return getNeutralNormalMapDataUrl();
    }
    return generatePixelArtNormalMap(tex.dataUrl, config);
  }

  public getOrCreateProceduralFallback(id: string): TextureDefinition {
    const cached = this.fallbackCache.get(id);
    if (cached) return cached;

    // Generate a deterministic 16x16 checkerboard based on string hash
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;

    let dataUrl = '';
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = `hsl(${hue}, 45%, 35%)`;
          ctx.fillRect(0, 0, 16, 16);
          ctx.fillStyle = `hsl(${hue}, 55%, 45%)`;
          for (let y = 0; y < 16; y += 4) {
            for (let x = 0; x < 16; x += 4) {
              if ((x / 4 + y / 4) % 2 === 0) {
                ctx.fillRect(x, y, 4, 4);
              }
            }
          }
          // Border
          ctx.strokeStyle = `hsl(${hue}, 60%, 25%)`;
          ctx.strokeRect(0.5, 0.5, 15, 15);
          dataUrl = canvas.toDataURL('image/png');
        }
      } catch {
        // Fallback in test runner
      }
    }

    if (!dataUrl) {
      // 16x16 neutral placeholder base64
      dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFklEQVR42mNk+M9QDwMMA2M0jIZiAADE8R/5eZ3gHAAAAABJRU5ErkJggg==';
    }

    const cleanName = id.replace(/\.png$/, '').replace(/_/g, ' ');
    const fallbackDef: TextureDefinition = {
      id,
      name: `${cleanName} (Mod)`,
      dataUrl,
      isCustom: false
    };

    this.fallbackCache.set(id, fallbackDef);
    return fallbackDef;
  }

  private renderFlippedTexture(dataUrl: string): Promise<string> {
    return new Promise(resolve => {
      if (typeof document === 'undefined') {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 16;
          canvas.height = img.naturalHeight || img.height || 16;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.imageSmoothingEnabled = false;
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }
}

