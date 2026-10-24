import { Injectable, computed, inject, signal } from '@angular/core';
import { FaceDirection, LUANTI_FACE_DIRECTIONS } from '../models/nodebox.model';
import { ProjectStore } from '../state/project.store';
import { TextureService } from './texture.service';

export type PaintTool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'line' | 'noise';

export const LUANTI_PIXEL_SWATCHES: readonly string[] = [
  '#1e293b', // Dark Slate
  '#475569', // Stone Gray
  '#94a3b8', // Light Stone
  '#f8fafc', // Snow White
  '#78350f', // Deep Bark
  '#a16207', // Oak Wood
  '#ca8a04', // Warm Plank
  '#fde047', // Mese Yellow
  '#14532d', // Deep Pine
  '#16a34a', // Grass Green
  '#4ade80', // Leaf Lime
  '#0284c7', // Water Blue
  '#38bdf8', // Sky Cyan
  '#dc2626', // Brick Red
  '#f97316', // Torch Amber
  '#a855f7'  // Crystal Purple
] as const;

interface HistoryEntry {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface ResizeCanvasOptions {
  width: number;
  height: number;
  mode: 'scale' | 'pad';
  anchor?: 'center' | 'top-left';
  backgroundHex?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TexturePainterService {
  private projectStore = inject(ProjectStore);
  private textureService = inject(TextureService);

  // Studio UI Navigation Signals
  public readonly studioTab = signal<'palette' | 'painter'>('palette');
  public readonly requestOpenPainter = signal<number>(0);

  // Active target face & texture ID
  public readonly activeFace = signal<FaceDirection>('top');
  public readonly activeTextureId = signal<string>('default_wood.png');

  // Pixel Buffer State
  public readonly width = signal<number>(16);
  public readonly height = signal<number>(16);
  public readonly pixelBuffer = signal<Uint8ClampedArray>(new Uint8ClampedArray(16 * 16 * 4));
  public readonly bufferVersion = signal<number>(0);

  // Active Tool & Brush Settings
  public readonly activeTool = signal<PaintTool>('pencil');
  public readonly primaryColor = signal<string>('#38bdf8');
  public readonly brushSize = signal<1 | 2 | 3>(1);
  public readonly mirrorX = signal<boolean>(false);
  public readonly mirrorY = signal<boolean>(false);
  public readonly showPixelGrid = signal<boolean>(true);
  public readonly showUvOverlay = signal<boolean>(true);

  // Line tool preview endpoints
  public readonly lineStart = signal<{ x: number; y: number } | null>(null);
  public readonly linePreviewEnd = signal<{ x: number; y: number } | null>(null);

  // Undo / Redo Stacks per texture ID
  private undoStacks = new Map<string, HistoryEntry[]>();
  private redoStacks = new Map<string, HistoryEntry[]>();
  public readonly canUndo = signal<boolean>(false);
  public readonly canRedo = signal<boolean>(false);

  // Stroke tracking state
  private isStroking = false;
  private lastStrokeX = -1;
  private lastStrokeY = -1;
  private strokeStartSnapshot: Uint8ClampedArray | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;

  // Live 3D GPU preview callback registered by BabylonSceneService
  private livePreviewCallback: ((textureId: string, dataUrl: string) => void) | null = null;

  // Auto-extracted unique hex colors from current pixel buffer (up to 16)
  public readonly extractedColors = computed<string[]>(() => {
    this.bufferVersion();
    const buf = this.pixelBuffer();
    const seen = new Set<string>();
    const result: string[] = [];
    for (let i = 0; i < buf.length; i += 4) {
      if (buf[i + 3] < 128) continue;
      const hex = this.rgbaToHex(buf[i], buf[i + 1], buf[i + 2]);
      if (!seen.has(hex)) {
        seen.add(hex);
        result.push(hex);
        if (result.length >= 16) break;
      }
    }
    return result;
  });

  constructor() {
    this.initBlankBuffer(16, 16, '#a16207');
  }

  public registerLivePreviewHandler(handler: (textureId: string, dataUrl: string) => void): void {
    this.livePreviewCallback = handler;
  }

  /**
   * Opens a texture in the 2D Pixel Painter (cloning built-in default textures automatically if needed).
   */
  public async openTextureInPainter(
    textureId: string,
    face?: FaceDirection,
    autoCloneBuiltin: boolean = false
  ): Promise<string> {
    if (face) {
      this.activeFace.set(face);
    }

    let targetId = textureId.replace(/\^\[transformFX$/, '');
    if (autoCloneBuiltin) {
      const editable = this.textureService.ensureEditableTexture(targetId);
      if (editable.id !== targetId) {
        const targetFace = face ?? this.activeFace();
        const currentFaceKey = this.projectStore.project().globalTextures[targetFace] || '';
        const isFlipped = currentFaceKey.endsWith('^[transformFX');
        this.projectStore.setGlobalTexture(
          targetFace,
          isFlipped ? `${editable.id}^[transformFX` : editable.id
        );
        targetId = editable.id;
      }
    }

    await this.loadTextureIntoBuffer(targetId);
    this.studioTab.set('painter');
    this.requestOpenPainter.update(v => v + 1);
    return targetId;
  }

  /**
   * Creates a new custom texture, assigns it to the active face, and opens it in the painter.
   */
  public async createNewTextureAndOpen(options: {
    name: string;
    width: number;
    height: number;
    fillMode: 'solid' | 'transparent' | 'clone';
    fillColor?: string;
  }): Promise<string> {
    const face = this.activeFace();
    const w = Math.max(8, Math.min(128, options.width || 16));
    const h = Math.max(8, Math.min(128, options.height || 16));

    if (options.fillMode === 'clone') {
      const currentKey = this.projectStore.project().globalTextures[face] || 'default_wood.png';
      const baseTex =
        this.textureService.getTextureById(currentKey.replace(/\^\[transformFX$/, '')) ||
        this.textureService.getOrCreateProceduralFallback(currentKey);
      const created = this.textureService.createBlankTexture(options.name, w, h, '#a16207');
      this.textureService.updateCustomTextureData(created.id, baseTex.dataUrl, true);
      this.projectStore.setGlobalTexture(face, created.id);
      await this.loadTextureIntoBuffer(created.id);
      this.studioTab.set('painter');
      return created.id;
    }

    const fill =
      options.fillMode === 'transparent'
        ? 'transparent'
        : options.fillColor || this.primaryColor() || '#38bdf8';

    const created = this.textureService.createBlankTexture(options.name, w, h, fill);
    this.initBlankBuffer(w, h, fill === 'transparent' ? undefined : fill);
    this.activeTextureId.set(created.id);
    this.clearHistoryForTexture(created.id);

    const dataUrl = this.encodeBufferToDataUrl();
    this.textureService.updateCustomTextureData(created.id, dataUrl, true);
    this.projectStore.setGlobalTexture(face, created.id);
    this.studioTab.set('painter');
    return created.id;
  }

  /**
   * Loads a texture's image data into the RGBA pixel buffer.
   */
  public async loadTextureIntoBuffer(textureId: string): Promise<void> {
    const baseId = textureId.replace(/\^\[transformFX$/, '');
    this.activeTextureId.set(baseId);
    const tex =
      this.textureService.getTextureById(baseId) ||
      this.textureService.getOrCreateProceduralFallback(baseId);

    if (typeof Image === 'undefined' || typeof document === 'undefined' || !tex?.dataUrl) {
      this.updateUndoRedoSignals();
      return;
    }

    return new Promise<void>(resolve => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width || 16;
          const h = img.naturalHeight || img.height || 16;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, w, h);
            this.width.set(w);
            this.height.set(h);
            this.pixelBuffer.set(new Uint8ClampedArray(imgData.data));
            this.bufferVersion.update(v => v + 1);
          }
        } catch {
          // Ignore canvas read failure in headless test environments
        }
        this.updateUndoRedoSignals();
        resolve();
      };
      img.onerror = () => {
        this.updateUndoRedoSignals();
        resolve();
      };
      img.src = tex.dataUrl;
    });
  }

  /**
   * Initializes the pixel buffer to a solid hex color or transparent.
   */
  public initBlankBuffer(width: number, height: number, fillHex?: string): void {
    const w = Math.max(1, Math.min(256, Math.round(width)));
    const h = Math.max(1, Math.min(256, Math.round(height)));
    const buf = new Uint8ClampedArray(w * h * 4);

    if (fillHex && fillHex !== 'transparent') {
      const [r, g, b] = this.hexToRgb(fillHex);
      for (let i = 0; i < buf.length; i += 4) {
        buf[i] = r;
        buf[i + 1] = g;
        buf[i + 2] = b;
        buf[i + 3] = 255;
      }
    }

    this.width.set(w);
    this.height.set(h);
    this.pixelBuffer.set(buf);
    this.bufferVersion.update(v => v + 1);
  }

  /**
   * Ensures the currently active texture is a custom editable texture before modifying pixels.
   * If it is a built-in default texture, clones it and updates the project faces using it.
   */
  public ensureActiveTextureEditable(targetFace?: FaceDirection): string {
    const currentId = this.activeTextureId().replace(/\^\[transformFX$/, '');
    const tex = this.textureService.getTextureById(currentId);
    if (tex?.isCustom) {
      return currentId;
    }

    const cloned = this.textureService.ensureEditableTexture(currentId);
    this.activeTextureId.set(cloned.id);

    const p = this.projectStore.project();
    const faceToUpdate = targetFace ?? this.activeFace();
    const currentGlobal = p.globalTextures[faceToUpdate];
    if (
      currentGlobal === currentId ||
      currentGlobal === `${currentId}^[transformFX`
    ) {
      const isFlipped = currentGlobal.endsWith('^[transformFX');
      this.projectStore.setGlobalTexture(
        faceToUpdate,
        isFlipped ? `${cloned.id}^[transformFX` : cloned.id
      );
    } else {
      // Also update any other global faces that matched currentId if user is painting in 3D
      LUANTI_FACE_DIRECTIONS.forEach(dir => {
        if (p.globalTextures[dir] === currentId) {
          this.projectStore.setGlobalTexture(dir, cloned.id);
        } else if (p.globalTextures[dir] === `${currentId}^[transformFX`) {
          this.projectStore.setGlobalTexture(dir, `${cloned.id}^[transformFX`);
        }
      });
    }

    return cloned.id;
  }

  /**
   * Starts a pointer painting stroke at pixel (x, y).
   */
  public startStroke(x: number, y: number, faceOverride?: FaceDirection): void {
    const w = this.width();
    const h = this.height();
    const px = this.clampCoord(x, w);
    const py = this.clampCoord(y, h);

    if (faceOverride) {
      this.activeFace.set(faceOverride);
    }

    const tool = this.activeTool();
    if (tool === 'eyedropper') {
      const sampled = this.samplePixelHex(px, py);
      if (sampled) {
        this.primaryColor.set(sampled);
      }
      this.activeTool.set('pencil');
      return;
    }

    this.ensureActiveTextureEditable(faceOverride);
    this.strokeStartSnapshot = new Uint8ClampedArray(this.pixelBuffer());
    this.isStroking = true;
    this.lastStrokeX = px;
    this.lastStrokeY = py;

    if (tool === 'line') {
      this.lineStart.set({ x: px, y: py });
      this.linePreviewEnd.set({ x: px, y: py });
      return;
    }

    if (tool === 'fill') {
      const [r, g, b] = this.hexToRgb(this.primaryColor());
      this.pushUndoSnapshot(this.strokeStartSnapshot, w, h);
      this.strokeStartSnapshot = null;
      this.floodFill(px, py, [r, g, b, 255]);
      this.isStroking = false;
      this.commitBufferToTexture(true);
      return;
    }

    this.applyBrushPoint(px, py, tool);
    this.emitLivePreview();
  }

  /**
   * Continues an active pointer stroke to pixel (x, y) using Bresenham line interpolation.
   */
  public moveStroke(x: number, y: number): void {
    if (!this.isStroking) return;
    const w = this.width();
    const h = this.height();
    const px = this.clampCoord(x, w);
    const py = this.clampCoord(y, h);

    const tool = this.activeTool();
    if (tool === 'line') {
      if (this.strokeStartSnapshot && this.lineStart()) {
        // Restore snapshot and draw preview line
        this.pixelBuffer.set(new Uint8ClampedArray(this.strokeStartSnapshot));
        const start = this.lineStart()!;
        this.linePreviewEnd.set({ x: px, y: py });
        this.drawBresenhamLine(start.x, start.y, px, py, 'pencil');
        this.emitLivePreview();
      }
      return;
    }

    if (px === this.lastStrokeX && py === this.lastStrokeY) return;

    this.drawBresenhamLine(this.lastStrokeX, this.lastStrokeY, px, py, tool);
    this.lastStrokeX = px;
    this.lastStrokeY = py;
    this.emitLivePreview();
  }

  /**
   * Finishes the current stroke, pushes to the painter undo stack, and commits to TextureService.
   */
  public endStroke(): void {
    if (!this.isStroking) return;
    this.isStroking = false;

    const w = this.width();
    const h = this.height();
    if (this.strokeStartSnapshot) {
      this.pushUndoSnapshot(this.strokeStartSnapshot, w, h);
      this.strokeStartSnapshot = null;
    }

    this.lineStart.set(null);
    this.linePreviewEnd.set(null);
    this.commitBufferToTexture(true);
  }

  /**
   * Draws a continuous pixel line between (x0, y0) and (x1, y1) using Bresenham's algorithm.
   */
  public drawBresenhamLine(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    tool: PaintTool = this.activeTool()
  ): void {
    let cx = Math.round(x0);
    let cy = Math.round(y0);
    const tx = Math.round(x1);
    const ty = Math.round(y1);

    const dx = Math.abs(tx - cx);
    const dy = Math.abs(ty - cy);
    const sx = cx < tx ? 1 : -1;
    const sy = cy < ty ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.applyBrushPoint(cx, cy, tool);
      if (cx === tx && cy === ty) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  }

  /**
   * Applies the active brush (including brushSize and Mirror X / Mirror Y symmetry) around (x, y).
   */
  public applyBrushPoint(x: number, y: number, tool: PaintTool = this.activeTool()): void {
    const w = this.width();
    const h = this.height();
    const size = this.brushSize();
    const half = Math.floor(size / 2);

    const targets: Array<{ px: number; py: number }> = [{ px: x, py: y }];
    if (this.mirrorX()) {
      targets.push({ px: w - 1 - x, py: y });
    }
    if (this.mirrorY()) {
      targets.push({ px: x, py: h - 1 - y });
    }
    if (this.mirrorX() && this.mirrorY()) {
      targets.push({ px: w - 1 - x, py: h - 1 - y });
    }

    const buf = this.pixelBuffer();
    const [baseR, baseG, baseB] = this.hexToRgb(this.primaryColor());

    for (const pt of targets) {
      for (let oy = -half; oy < size - half; oy++) {
        for (let ox = -half; ox < size - half; ox++) {
          const tx = pt.px + ox;
          const ty = pt.py + oy;
          if (tx < 0 || tx >= w || ty < 0 || ty >= h) continue;

          const idx = (ty * w + tx) * 4;
          if (tool === 'eraser') {
            buf[idx] = 0;
            buf[idx + 1] = 0;
            buf[idx + 2] = 0;
            buf[idx + 3] = 0;
          } else if (tool === 'noise') {
            // Subtle deterministic/organic pixel grain variation (+/- 18 RGB steps)
            const jitter = Math.round((Math.random() - 0.5) * 36);
            buf[idx] = Math.max(0, Math.min(255, baseR + jitter));
            buf[idx + 1] = Math.max(0, Math.min(255, baseG + jitter));
            buf[idx + 2] = Math.max(0, Math.min(255, baseB + jitter));
            buf[idx + 3] = 255;
          } else {
            buf[idx] = baseR;
            buf[idx + 1] = baseG;
            buf[idx + 2] = baseB;
            buf[idx + 3] = 255;
          }
        }
      }
    }

    this.bufferVersion.update(v => v + 1);
  }

  /**
   * 4-way contiguous BFS flood-fill starting at (startX, startY).
   */
  public floodFill(
    startX: number,
    startY: number,
    fillRgba: [number, number, number, number]
  ): void {
    const w = this.width();
    const h = this.height();
    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

    const buf = this.pixelBuffer();
    const startIdx = (startY * w + startX) * 4;
    const targetR = buf[startIdx];
    const targetG = buf[startIdx + 1];
    const targetB = buf[startIdx + 2];
    const targetA = buf[startIdx + 3];

    const [fillR, fillG, fillB, fillA] = fillRgba;
    if (
      targetR === fillR &&
      targetG === fillG &&
      targetB === fillB &&
      targetA === fillA
    ) {
      return;
    }

    const visited = new Uint8Array(w * h);
    const queue: number[] = [startY * w + startX];
    visited[startY * w + startX] = 1;

    let head = 0;
    while (head < queue.length) {
      const pos = queue[head++];
      const cx = pos % w;
      const cy = Math.floor(pos / w);
      const idx = pos * 4;

      buf[idx] = fillR;
      buf[idx + 1] = fillG;
      buf[idx + 2] = fillB;
      buf[idx + 3] = fillA;

      const neighbors = [
        cx > 0 ? pos - 1 : -1,
        cx < w - 1 ? pos + 1 : -1,
        cy > 0 ? pos - w : -1,
        cy < h - 1 ? pos + w : -1
      ];

      for (const nPos of neighbors) {
        if (nPos === -1 || visited[nPos]) continue;
        const nIdx = nPos * 4;
        if (
          buf[nIdx] === targetR &&
          buf[nIdx + 1] === targetG &&
          buf[nIdx + 2] === targetB &&
          buf[nIdx + 3] === targetA
        ) {
          visited[nPos] = 1;
          queue.push(nPos);
        }
      }
    }

    this.bufferVersion.update(v => v + 1);
  }

  /**
   * Samples the hex color `#rrggbb` of pixel (x, y), or returns null if transparent.
   */
  public samplePixelHex(x: number, y: number): string | null {
    const w = this.width();
    const h = this.height();
    if (x < 0 || x >= w || y < 0 || y >= h) return null;
    const buf = this.pixelBuffer();
    const idx = (y * w + x) * 4;
    if (buf[idx + 3] === 0) return null;
    return this.rgbaToHex(buf[idx], buf[idx + 1], buf[idx + 2]);
  }

  /**
   * Flips the pixel buffer horizontally.
   */
  public flipHorizontal(): void {
    this.ensureActiveTextureEditable();
    const w = this.width();
    const h = this.height();
    const src = this.pixelBuffer();
    this.pushUndoSnapshot(new Uint8ClampedArray(src), w, h);

    const dst = new Uint8ClampedArray(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sIdx = (y * w + x) * 4;
        const dIdx = (y * w + (w - 1 - x)) * 4;
        dst[dIdx] = src[sIdx];
        dst[dIdx + 1] = src[sIdx + 1];
        dst[dIdx + 2] = src[sIdx + 2];
        dst[dIdx + 3] = src[sIdx + 3];
      }
    }
    this.pixelBuffer.set(dst);
    this.bufferVersion.update(v => v + 1);
    this.commitBufferToTexture(true);
  }

  /**
   * Flips the pixel buffer vertically.
   */
  public flipVertical(): void {
    this.ensureActiveTextureEditable();
    const w = this.width();
    const h = this.height();
    const src = this.pixelBuffer();
    this.pushUndoSnapshot(new Uint8ClampedArray(src), w, h);

    const dst = new Uint8ClampedArray(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sIdx = (y * w + x) * 4;
        const dIdx = ((h - 1 - y) * w + x) * 4;
        dst[dIdx] = src[sIdx];
        dst[dIdx + 1] = src[sIdx + 1];
        dst[dIdx + 2] = src[sIdx + 2];
        dst[dIdx + 3] = src[sIdx + 3];
      }
    }
    this.pixelBuffer.set(dst);
    this.bufferVersion.update(v => v + 1);
    this.commitBufferToTexture(true);
  }

  /**
   * Rotates the pixel buffer 90 degrees clockwise.
   */
  public rotate90CW(): void {
    this.ensureActiveTextureEditable();
    const w = this.width();
    const h = this.height();
    const src = this.pixelBuffer();
    this.pushUndoSnapshot(new Uint8ClampedArray(src), w, h);

    const newW = h;
    const newH = w;
    const dst = new Uint8ClampedArray(src.length);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sIdx = (y * w + x) * 4;
        const nx = h - 1 - y;
        const ny = x;
        const dIdx = (ny * newW + nx) * 4;
        dst[dIdx] = src[sIdx];
        dst[dIdx + 1] = src[sIdx + 1];
        dst[dIdx + 2] = src[sIdx + 2];
        dst[dIdx + 3] = src[sIdx + 3];
      }
    }

    this.width.set(newW);
    this.height.set(newH);
    this.pixelBuffer.set(dst);
    this.bufferVersion.update(v => v + 1);
    this.commitBufferToTexture(true);
  }

  /**
   * Clears the canvas to transparent or a specified solid color.
   */
  public clearCanvas(fillHex?: string): void {
    this.ensureActiveTextureEditable();
    const w = this.width();
    const h = this.height();
    this.pushUndoSnapshot(new Uint8ClampedArray(this.pixelBuffer()), w, h);
    this.initBlankBuffer(w, h, fillHex);
    this.commitBufferToTexture(true);
  }

  /**
   * Resizes the active canvas resolution using either:
   * 1. 'scale': Nearest-neighbor pixel art resampling (stretching / shrinking pixels cleanly).
   * 2. 'pad': Expanding or cropping canvas bounds, anchored at 'center' or 'top-left'.
   */
  public resizeCanvas(options: ResizeCanvasOptions): void {
    const srcW = this.width();
    const srcH = this.height();
    const dstW = Math.max(1, Math.min(256, Math.round(options.width)));
    const dstH = Math.max(1, Math.min(256, Math.round(options.height)));

    if (srcW === dstW && srcH === dstH) return;

    this.ensureActiveTextureEditable();
    const srcBuf = this.pixelBuffer();
    this.pushUndoSnapshot(new Uint8ClampedArray(srcBuf), srcW, srcH);

    const dstBuf = new Uint8ClampedArray(dstW * dstH * 4);

    if (options.mode === 'scale') {
      // Nearest-neighbor pixel art scaling
      for (let dy = 0; dy < dstH; dy++) {
        const sy = Math.min(srcH - 1, Math.floor((dy * srcH) / dstH));
        for (let dx = 0; dx < dstW; dx++) {
          const sx = Math.min(srcW - 1, Math.floor((dx * srcW) / dstW));
          const sIdx = (sy * srcW + sx) * 4;
          const dIdx = (dy * dstW + dx) * 4;
          dstBuf[dIdx] = srcBuf[sIdx];
          dstBuf[dIdx + 1] = srcBuf[sIdx + 1];
          dstBuf[dIdx + 2] = srcBuf[sIdx + 2];
          dstBuf[dIdx + 3] = srcBuf[sIdx + 3];
        }
      }
    } else {
      // Pad / crop mode
      const anchor = options.anchor ?? 'center';
      let offsetX = 0;
      let offsetY = 0;
      if (anchor === 'center') {
        offsetX = Math.floor((dstW - srcW) / 2);
        offsetY = Math.floor((dstH - srcH) / 2);
      }

      // Initial fill (transparent by default or solid backgroundHex)
      if (options.backgroundHex && options.backgroundHex !== 'transparent') {
        const [r, g, b] = this.hexToRgb(options.backgroundHex);
        for (let i = 0; i < dstBuf.length; i += 4) {
          dstBuf[i] = r;
          dstBuf[i + 1] = g;
          dstBuf[i + 2] = b;
          dstBuf[i + 3] = 255;
        }
      }

      for (let sy = 0; sy < srcH; sy++) {
        const dy = sy + offsetY;
        if (dy < 0 || dy >= dstH) continue;
        for (let sx = 0; sx < srcW; sx++) {
          const dx = sx + offsetX;
          if (dx < 0 || dx >= dstW) continue;
          const sIdx = (sy * srcW + sx) * 4;
          const dIdx = (dy * dstW + dx) * 4;
          dstBuf[dIdx] = srcBuf[sIdx];
          dstBuf[dIdx + 1] = srcBuf[sIdx + 1];
          dstBuf[dIdx + 2] = srcBuf[sIdx + 2];
          dstBuf[dIdx + 3] = srcBuf[sIdx + 3];
        }
      }
    }

    this.width.set(dstW);
    this.height.set(dstH);
    this.pixelBuffer.set(dstBuf);
    this.bufferVersion.update(v => v + 1);
    this.commitBufferToTexture(true);
  }

  /**
   * Reverts the last painting operation on the active texture.
   */
  public undo(): boolean {
    const id = this.activeTextureId();
    const stack = this.undoStacks.get(id);
    if (!stack || stack.length === 0) return false;

    const prev = stack.pop()!;
    const redoStack = this.redoStacks.get(id) ?? [];
    redoStack.push({
      width: this.width(),
      height: this.height(),
      data: new Uint8ClampedArray(this.pixelBuffer())
    });
    this.redoStacks.set(id, redoStack);

    this.width.set(prev.width);
    this.height.set(prev.height);
    this.pixelBuffer.set(new Uint8ClampedArray(prev.data));
    this.bufferVersion.update(v => v + 1);
    this.updateUndoRedoSignals();
    this.commitBufferToTexture(true);
    return true;
  }

  /**
   * Reapplies an undone painting operation on the active texture.
   */
  public redo(): boolean {
    const id = this.activeTextureId();
    const redoStack = this.redoStacks.get(id);
    if (!redoStack || redoStack.length === 0) return false;

    const next = redoStack.pop()!;
    const undoStack = this.undoStacks.get(id) ?? [];
    undoStack.push({
      width: this.width(),
      height: this.height(),
      data: new Uint8ClampedArray(this.pixelBuffer())
    });
    this.undoStacks.set(id, undoStack);

    this.width.set(next.width);
    this.height.set(next.height);
    this.pixelBuffer.set(new Uint8ClampedArray(next.data));
    this.bufferVersion.update(v => v + 1);
    this.updateUndoRedoSignals();
    this.commitBufferToTexture(true);
    return true;
  }

  /**
   * Encodes the current RGBA pixelBuffer into a PNG dataUrl.
   */
  public encodeBufferToDataUrl(): string {
    const w = this.width();
    const h = this.height();
    const buf = this.pixelBuffer();

    if (typeof document !== 'undefined') {
      try {
        if (!this.offscreenCanvas) {
          this.offscreenCanvas = document.createElement('canvas');
        }
        this.offscreenCanvas.width = w;
        this.offscreenCanvas.height = h;
        const ctx = this.offscreenCanvas.getContext('2d');
        if (ctx) {
          const imgData = new ImageData(new Uint8ClampedArray(buf), w, h);
          ctx.putImageData(imgData, 0, 0);
          return this.offscreenCanvas.toDataURL('image/png');
        }
      } catch {
        // Fallback when ImageData or canvas 2d context is unavailable in headless test runner
      }
    }

    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFklEQVR42mNk+M9QDwMMA2M0jIZiAADE8R/5eZ3gHAAAAABJRU5ErkJggg==';
  }

  private emitLivePreview(): void {
    const id = this.activeTextureId();
    const dataUrl = this.encodeBufferToDataUrl();
    this.textureService.updateCustomTextureData(id, dataUrl, false);
    if (this.livePreviewCallback) {
      this.livePreviewCallback(id, dataUrl);
    }
  }

  private commitBufferToTexture(emitFullRefresh: boolean): void {
    const id = this.activeTextureId();
    const dataUrl = this.encodeBufferToDataUrl();
    this.textureService.updateCustomTextureData(id, dataUrl, emitFullRefresh);
    if (this.livePreviewCallback) {
      this.livePreviewCallback(id, dataUrl);
    }
  }

  private pushUndoSnapshot(snapshot: Uint8ClampedArray, width: number, height: number): void {
    const id = this.activeTextureId();
    const stack = this.undoStacks.get(id) ?? [];
    stack.push({ width, height, data: snapshot });
    if (stack.length > 40) {
      stack.shift();
    }
    this.undoStacks.set(id, stack);
    this.redoStacks.set(id, []);
    this.updateUndoRedoSignals();
  }

  private clearHistoryForTexture(id: string): void {
    this.undoStacks.delete(id);
    this.redoStacks.delete(id);
    this.updateUndoRedoSignals();
  }

  private updateUndoRedoSignals(): void {
    const id = this.activeTextureId();
    this.canUndo.set((this.undoStacks.get(id)?.length ?? 0) > 0);
    this.canRedo.set((this.redoStacks.get(id)?.length ?? 0) > 0);
  }

  private clampCoord(val: number, max: number): number {
    return Math.max(0, Math.min(max - 1, Math.floor(val)));
  }

  public getPixelRGBA(x: number, y: number): [number, number, number, number] {
    const w = this.width();
    const h = this.height();
    const cx = this.clampCoord(x, w);
    const cy = this.clampCoord(y, h);
    const idx = (cy * w + cx) * 4;
    const buf = this.pixelBuffer();
    return [buf[idx] ?? 0, buf[idx + 1] ?? 0, buf[idx + 2] ?? 0, buf[idx + 3] ?? 0];
  }

  public hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace(/^#/, '');
    if (clean.length === 3) {
      const r = parseInt(clean[0] + clean[0], 16) || 0;
      const g = parseInt(clean[1] + clean[1], 16) || 0;
      const b = parseInt(clean[2] + clean[2], 16) || 0;
      return [r, g, b];
    }
    const num = parseInt(clean.substring(0, 6), 16);
    if (isNaN(num)) return [56, 189, 248];
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  public rgbaToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}
