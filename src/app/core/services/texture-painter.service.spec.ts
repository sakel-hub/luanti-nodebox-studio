import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TexturePainterService } from './texture-painter.service';
import { TextureService } from './texture.service';
import { ProjectStore } from '../state/project.store';

describe('TexturePainterService', () => {
  let painter: TexturePainterService;
  let textureService: TextureService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    const injector = createEnvironmentInjector(
      [ProjectStore, TextureService, TexturePainterService],
      null as any
    );
    textureService = injector.get(TextureService);
    const custom = textureService.createBlankTexture('Test Tex', 16, null);
    painter = runInInjectionContext(injector, () => new TexturePainterService());
    painter.activeTextureId.set(custom.id);
    painter.initBlankBuffer(16, 16);
  });

  it('should initialize a 16x16 blank transparent buffer', () => {
    expect(painter.activeTextureId()).toBe('test_tex.png');
    expect(painter.width()).toBe(16);
    expect(painter.height()).toBe(16);
    expect(painter.pixelBuffer().length).toBe(16 * 16 * 4);
    expect(painter.getPixelRGBA(0, 0)).toEqual([0, 0, 0, 0]);
  });

  it('should initialize a 16x16 buffer with a solid fill color', () => {
    painter.initBlankBuffer(16, 16, '#ff8000');
    expect(painter.getPixelRGBA(5, 5)).toEqual([255, 128, 0, 255]);
  });

  it('should paint a pencil stroke with Bresenham line interpolation and commit to undo stack', () => {
    painter.activeTool.set('pencil');
    painter.primaryColor.set('#00ff00');
    painter.brushSize.set(1);

    painter.startStroke(0, 0);
    painter.moveStroke(3, 0);
    painter.endStroke();

    expect(painter.getPixelRGBA(0, 0)).toEqual([0, 255, 0, 255]);
    expect(painter.getPixelRGBA(1, 0)).toEqual([0, 255, 0, 255]);
    expect(painter.getPixelRGBA(2, 0)).toEqual([0, 255, 0, 255]);
    expect(painter.getPixelRGBA(3, 0)).toEqual([0, 255, 0, 255]);
    expect(painter.canUndo()).toBe(true);

    painter.undo();
    expect(painter.getPixelRGBA(0, 0)).toEqual([0, 0, 0, 0]);
    expect(painter.canRedo()).toBe(true);

    painter.redo();
    expect(painter.getPixelRGBA(2, 0)).toEqual([0, 255, 0, 255]);
  });

  it('should erase pixels to transparent', () => {
    painter.initBlankBuffer(16, 16, '#ffffff');
    painter.activeTool.set('eraser');
    painter.brushSize.set(1);

    painter.startStroke(4, 4);
    painter.endStroke();

    expect(painter.getPixelRGBA(4, 4)).toEqual([0, 0, 0, 0]);
    expect(painter.getPixelRGBA(4, 5)).toEqual([255, 255, 255, 255]);
  });

  it('should flood fill contiguous matching pixels', () => {
    painter.activeTool.set('fill');
    painter.primaryColor.set('#112233');

    painter.startStroke(2, 2);
    expect(painter.getPixelRGBA(0, 0)).toEqual([0x11, 0x22, 0x33, 255]);
    expect(painter.getPixelRGBA(15, 15)).toEqual([0x11, 0x22, 0x33, 255]);
  });

  it('should sample pixel color with eyedropper and switch back to pencil', () => {
    painter.initBlankBuffer(16, 16, '#abcdef');
    painter.activeTool.set('eyedropper');
    painter.startStroke(8, 8);

    expect(painter.primaryColor()).toBe('#abcdef');
    expect(painter.activeTool()).toBe('pencil');
  });

  it('should support Mirror X and Mirror Y symmetry when painting', () => {
    painter.activeTool.set('pencil');
    painter.primaryColor.set('#ff00ff');
    painter.mirrorX.set(true);
    painter.mirrorY.set(true);

    painter.startStroke(1, 2);
    painter.endStroke();

    expect(painter.getPixelRGBA(1, 2)).toEqual([255, 0, 255, 255]);
    expect(painter.getPixelRGBA(14, 2)).toEqual([255, 0, 255, 255]);
    expect(painter.getPixelRGBA(1, 13)).toEqual([255, 0, 255, 255]);
    expect(painter.getPixelRGBA(14, 13)).toEqual([255, 0, 255, 255]);
  });

  it('should flip horizontal, flip vertical, and rotate 90 degrees CW', () => {
    painter.activeTool.set('pencil');
    painter.primaryColor.set('#ff0000');
    painter.startStroke(0, 0);
    painter.endStroke();

    painter.flipHorizontal();
    expect(painter.getPixelRGBA(15, 0)).toEqual([255, 0, 0, 255]);
    expect(painter.getPixelRGBA(0, 0)).toEqual([0, 0, 0, 0]);

    painter.flipVertical();
    expect(painter.getPixelRGBA(15, 15)).toEqual([255, 0, 0, 255]);

    painter.rotate90CW();
    expect(painter.getPixelRGBA(0, 15)).toEqual([255, 0, 0, 255]);
  });

  it('should initialize and support rectangular non-square buffers (e.g. 16x32)', () => {
    painter.initBlankBuffer(16, 32, '#00ff88');
    expect(painter.width()).toBe(16);
    expect(painter.height()).toBe(32);
    expect(painter.pixelBuffer().length).toBe(16 * 32 * 4);
    expect(painter.getPixelRGBA(5, 20)).toEqual([0, 255, 136, 255]);
  });

  it('should resize canvas with scale mode (nearest-neighbor pixel art scaling)', () => {
    painter.initBlankBuffer(16, 16, 'transparent');
    painter.activeTool.set('pencil');
    painter.primaryColor.set('#ff0000');
    painter.startStroke(0, 0);
    painter.endStroke();

    expect(painter.getPixelRGBA(0, 0)).toEqual([255, 0, 0, 255]);
    expect(painter.getPixelRGBA(1, 0)).toEqual([0, 0, 0, 0]);

    // Rescale 16x16 -> 32x32: pixel at (0, 0) expands to 2x2 block (0,0), (1,0), (0,1), (1,1)
    painter.resizeCanvas({ width: 32, height: 32, mode: 'scale' });
    expect(painter.width()).toBe(32);
    expect(painter.height()).toBe(32);
    expect(painter.getPixelRGBA(0, 0)).toEqual([255, 0, 0, 255]);
    expect(painter.getPixelRGBA(1, 0)).toEqual([255, 0, 0, 255]);
    expect(painter.getPixelRGBA(0, 1)).toEqual([255, 0, 0, 255]);
    expect(painter.getPixelRGBA(1, 1)).toEqual([255, 0, 0, 255]);
    expect(painter.getPixelRGBA(2, 0)).toEqual([0, 0, 0, 0]);

    // Undo should revert dimensions back to 16x16
    painter.undo();
    expect(painter.width()).toBe(16);
    expect(painter.height()).toBe(16);
    expect(painter.getPixelRGBA(0, 0)).toEqual([255, 0, 0, 255]);
    expect(painter.getPixelRGBA(1, 0)).toEqual([0, 0, 0, 0]);
  });

  it('should resize canvas with pad mode (expand with anchor center)', () => {
    painter.initBlankBuffer(16, 16, 'transparent');
    painter.activeTool.set('pencil');
    painter.primaryColor.set('#0000ff');
    painter.startStroke(8, 8);
    painter.endStroke();

    // Expand to 20x20 with center anchor (+2 px on all sides)
    painter.resizeCanvas({ width: 20, height: 20, mode: 'pad', anchor: 'center' });
    expect(painter.width()).toBe(20);
    expect(painter.height()).toBe(20);
    expect(painter.getPixelRGBA(10, 10)).toEqual([0, 0, 255, 255]);
    expect(painter.getPixelRGBA(0, 0)).toEqual([0, 0, 0, 0]);
  });
});
