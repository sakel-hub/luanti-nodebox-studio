const DUMMY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
import { Injectable, signal } from '@angular/core';

export interface TextureDefinition {
  id: string;
  name: string;
  dataUrl: string;
  isCustom?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TextureService {
  public readonly textures = signal<TextureDefinition[]>([]);

  constructor() {
    this.initDefaultTextures();
  }

  private initDefaultTextures(): void {
    const defaults: TextureDefinition[] = [
      {
        id: 'default_wood.png',
        name: 'Wood Planks',
        dataUrl: this.createProceduralWood()
      },
      {
        id: 'default_stone.png',
        name: 'Smooth Stone',
        dataUrl: this.createProceduralStone()
      },
      {
        id: 'default_cobble.png',
        name: 'Cobblestone',
        dataUrl: this.createProceduralCobble()
      },
      {
        id: 'default_brick.png',
        name: 'Clay Brick',
        dataUrl: this.createProceduralBrick()
      },
      {
        id: 'default_dirt.png',
        name: 'Dirt',
        dataUrl: this.createProceduralDirt()
      },
      {
        id: 'default_glass.png',
        name: 'Glass',
        dataUrl: this.createProceduralGlass()
      },
      {
        id: 'default_steel_block.png',
        name: 'Steel Block',
        dataUrl: this.createProceduralSteel()
      },
      {
        id: 'uv_grid_16.png',
        name: '16x16 UV Grid',
        dataUrl: this.createProceduralGrid()
      }
    ];

    // Load any user custom textures saved in localStorage
    try {
      const savedCustom = localStorage.getItem('luanti_custom_textures');
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom) as TextureDefinition[];
        this.textures.set([...defaults, ...parsed]);
        return;
      }
    } catch {
      // Ignore storage errors
    }

    this.textures.set(defaults);
  }

  public addCustomTexture(name: string, dataUrl: string): TextureDefinition {
    const id = name.toLowerCase().replace(/\s+/g, '_');
    const newTex: TextureDefinition = {
      id,
      name,
      dataUrl,
      isCustom: true
    };

    const current = this.textures();
    const updated = [...current.filter(t => t.id !== id), newTex];
    this.textures.set(updated);

    try {
      const customOnly = updated.filter(t => t.isCustom);
      localStorage.setItem('luanti_custom_textures', JSON.stringify(customOnly));
    } catch {
      // Storage quota or error
    }

    return newTex;
  }

  public getTextureById(id?: string): TextureDefinition | undefined {
    if (!id) return undefined;
    return this.textures().find(t => t.id === id);
  }

  // --- Procedural 16x16 Texture Generators ---

  private createProceduralWood(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return DUMMY_PNG;

    // Base warm oak
    ctx.fillStyle = '#b47a46';
    ctx.fillRect(0, 0, 16, 16);

    // Plank seams (horizontal planks every 4 pixels)
    ctx.fillStyle = '#6e4523';
    ctx.fillRect(0, 3, 16, 1);
    ctx.fillRect(0, 7, 16, 1);
    ctx.fillRect(0, 11, 16, 1);
    ctx.fillRect(0, 15, 16, 1);

    // Subtle grain variation
    ctx.fillStyle = '#c98e57';
    for (let y = 0; y < 16; y++) {
      if (y % 4 !== 3) {
        ctx.fillRect((y * 7) % 15, y, 3, 1);
      }
    }

    return canvas.toDataURL('image/png');
  }

  private createProceduralStone(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return DUMMY_PNG;

    ctx.fillStyle = '#8e8e8e';
    ctx.fillRect(0, 0, 16, 16);

    // Stone flecks
    const colors = ['#737373', '#9e9e9e', '#666666', '#a6a6a6'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        if ((x * 13 + y * 7) % 5 === 0) {
          ctx.fillStyle = colors[(x + y) % colors.length];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    return canvas.toDataURL('image/png');
  }

  private createProceduralCobble(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return DUMMY_PNG;

    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(0, 0, 16, 16);

    // Mortar lines
    ctx.fillStyle = '#4a4a4a';
    ctx.strokeRect(0.5, 0.5, 7, 7);
    ctx.strokeRect(8.5, 0.5, 7, 7);
    ctx.strokeRect(4.5, 8.5, 8, 7);

    // Highlights
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(2, 2, 3, 2);
    ctx.fillRect(10, 3, 3, 2);
    ctx.fillRect(6, 10, 3, 2);

    return canvas.toDataURL('image/png');
  }

  private createProceduralBrick(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return DUMMY_PNG;

    // Mortar background
    ctx.fillStyle = '#c7bfae';
    ctx.fillRect(0, 0, 16, 16);

    // Red bricks
    ctx.fillStyle = '#9e3b2b';
    ctx.fillRect(0, 1, 7, 3);
    ctx.fillRect(8, 1, 7, 3);
    ctx.fillRect(0, 5, 3, 3);
    ctx.fillRect(4, 5, 7, 3);
    ctx.fillRect(12, 5, 3, 3);
    ctx.fillRect(0, 9, 7, 3);
    ctx.fillRect(8, 9, 7, 3);
    ctx.fillRect(0, 13, 3, 3);
    ctx.fillRect(4, 13, 7, 3);
    ctx.fillRect(12, 13, 3, 3);

    return canvas.toDataURL('image/png');
  }

  private createProceduralDirt(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return DUMMY_PNG;

    ctx.fillStyle = '#6b4728';
    ctx.fillRect(0, 0, 16, 16);

    // Dirt noise
    const colors = ['#53341b', '#805735', '#402611'];
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        if ((x * 11 + y * 17) % 3 === 0) {
          ctx.fillStyle = colors[(x + y) % colors.length];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    return canvas.toDataURL('image/png');
  }

  private createProceduralGlass(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return DUMMY_PNG;

    // Transparent framed glass
    ctx.fillStyle = 'rgba(200, 230, 255, 0.2)';
    ctx.fillRect(0, 0, 16, 16);

    // Blue-tinted border frame
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 15, 15);

    // Light reflection streak
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(3, 3, 1, 1);
    ctx.fillRect(4, 4, 1, 1);
    ctx.fillRect(5, 5, 1, 1);

    return canvas.toDataURL('image/png');
  }

  private createProceduralSteel(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return DUMMY_PNG;

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 16, 16);

    // Bevel edges
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 0, 1, 16);

    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(15, 0, 1, 16);

    // Center rivet details
    ctx.fillStyle = '#475569';
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillRect(13, 2, 1, 1);
    ctx.fillRect(2, 13, 1, 1);
    ctx.fillRect(13, 13, 1, 1);

    return canvas.toDataURL('image/png');
  }

  private createProceduralGrid(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return DUMMY_PNG;

    // Checkerboard UV grid
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#38bdf8' : '#0284c7';
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Outer border
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, 15, 15);

    return canvas.toDataURL('image/png');
  }
}
