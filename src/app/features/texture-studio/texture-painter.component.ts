import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FaceDirection, LUANTI_FACE_DIRECTIONS } from '../../core/models/nodebox.model';
import { ProjectStore } from '../../core/state/project.store';
import { TextureService } from '../../core/services/texture.service';
import {
  LUANTI_PIXEL_SWATCHES,
  PaintTool,
  TexturePainterService
} from '../../core/services/texture-painter.service';
import { TooltipDirective } from '../../shared/directives/tooltip.directive';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import {
  LucidePlus,
  LucideDownload,
  LucideSettings,
  LucideLink,
  LucideUnlink,
  LucidePencil,
  LucideEraser,
  LucidePaintBucket,
  LucidePipette,
  LucideRuler,
  LucideSparkles,
  LucideFlipHorizontal,
  LucideFlipVertical,
  LucideGrid3x3,
  LucideBox,
  LucideRotateCw,
  LucideTrash2,
  LucideUndo,
  LucideRedo,
  LucideX
} from '@lucide/angular';

@Component({
  selector: 'app-texture-painter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TooltipDirective,
    TranslatePipe,
    LucidePlus,
    LucideDownload,
    LucideSettings,
    LucideLink,
    LucideUnlink,
    LucidePencil,
    LucideEraser,
    LucidePaintBucket,
    LucidePipette,
    LucideRuler,
    LucideSparkles,
    LucideFlipHorizontal,
    LucideFlipVertical,
    LucideGrid3x3,
    LucideBox,
    LucideRotateCw,
    LucideTrash2,
    LucideUndo,
    LucideRedo,
    LucideX
  ],
  template: `
    <div class="p-3 space-y-3 text-xs select-none">
      <!-- Top Bar: Active Face / Texture Selector + New & Download Actions -->
      <div class="flex flex-col gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
        <div class="flex items-center justify-between gap-1.5">
          <!-- Face Quick Switcher -->
          <div class="flex items-center gap-1 min-w-0 flex-1">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex-shrink-0">
              {{ 'textureStudio.faces' | translate }}:
            </span>
            <select
              [ngModel]="painterService.activeFace()"
              (ngModelChange)="onSelectFace($event)"
              [attr.aria-label]="'textureStudio.faces' | translate"
              class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-semibold capitalize text-xs focus:outline-none focus:border-sky-500 min-w-0 flex-1 truncate cursor-pointer">
              @for (dir of faceDirections; track dir; let idx = $index) {
                <option [value]="dir">#{{ idx + 1 }} {{ dir | titlecase }}</option>
              }
            </select>
          </div>

          <!-- New Texture & Download PNG Buttons -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              (click)="toggleCreateForm()"
              [class.bg-sky-600]="showCreateForm()"
              [class.text-white]="showCreateForm()"
              [class.bg-slate-900]="!showCreateForm()"
              [class.text-sky-400]="!showCreateForm()"
              [appTooltip]="'textureStudio.createNew' | translate"
              appTooltipPlacement="top"
              [attr.aria-label]="'textureStudio.createNew' | translate"
              [attr.aria-expanded]="showCreateForm()"
              class="px-2.5 py-1 rounded-lg border border-sky-500/40 hover:border-sky-400 font-semibold text-[11px] flex items-center gap-1.5 transition active:scale-95">
              <svg lucidePlus class="w-3.5 h-3.5"></svg>
              <span>{{ 'common.new' | translate }}</span>
            </button>

            <button
              type="button"
              (click)="downloadCurrentTexture()"
              [appTooltip]="'textureStudio.downloadPng' | translate"
              appTooltipPlacement="top"
              [attr.aria-label]="'textureStudio.downloadPng' | translate"
              class="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-[11px] flex items-center gap-1.5 transition active:scale-95">
              <svg lucideDownload class="w-3.5 h-3.5"></svg>
              <span>PNG</span>
            </button>
          </div>
        </div>

        <!-- Active Texture Info Badge -->
        <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
            <span class="font-mono text-slate-200 truncate" [title]="painterService.activeTextureId()">
              {{ activeTextureName() }}
            </span>
          </div>
          <button
            type="button"
            (click)="openResizeModal()"
            [appTooltip]="'textureStudio.resizeCanvas' | translate"
            appTooltipPlacement="left"
            [attr.aria-label]="'textureStudio.resizeCanvas' | translate"
            class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-800 hover:border-sky-500/50 flex items-center gap-1 transition cursor-pointer active:scale-95 flex-shrink-0">
            <span>{{ painterService.width() }}&times;{{ painterService.height() }}px</span>
            <svg lucideSettings class="w-2.5 h-2.5 text-slate-400"></svg>
          </button>
        </div>

        <!-- Collapsible Create New Texture Card -->
        @if (showCreateForm()) {
          <div class="mt-1 p-2.5 rounded-lg bg-slate-900 border border-sky-500/40 space-y-2.5 animate-in fade-in">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-sky-400 text-[11px]">{{ 'textureStudio.createNew' | translate }}</span>
              <button
                type="button"
                (click)="showCreateForm.set(false)"
                [attr.aria-label]="'common.close' | translate"
                class="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 transition">
                <svg lucideX class="w-3.5 h-3.5"></svg>
              </button>
            </div>

            <div class="space-y-1">
              <label class="text-[10px] text-slate-400 block">{{ 'textureStudio.textureName' | translate }}</label>
              <input
                type="text"
                [(ngModel)]="newTexName"
                placeholder="custom_tile"
                [attr.aria-label]="'textureStudio.textureName' | translate"
                class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500" />
            </div>

            <!-- Resolution Presets & Custom Width/Height with Aspect Ratio Lock -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="text-[10px] text-slate-400 block">{{ 'textureStudio.resolution' | translate }}</label>
                <span class="text-[9px] font-mono text-sky-400">{{ newTexWidth }}&times;{{ newTexHeight }}px</span>
              </div>

              <!-- Quick preset chips -->
              <div class="flex flex-wrap gap-1">
                @for (preset of creationPresets; track preset.label) {
                  <button
                    type="button"
                    (click)="applyCreatePreset(preset.w, preset.h)"
                    [class.bg-sky-600]="newTexWidth === preset.w && newTexHeight === preset.h"
                    [class.text-white]="newTexWidth === preset.w && newTexHeight === preset.h"
                    [class.border-sky-400]="newTexWidth === preset.w && newTexHeight === preset.h"
                    [class.bg-slate-950]="!(newTexWidth === preset.w && newTexHeight === preset.h)"
                    [class.text-slate-300]="!(newTexWidth === preset.w && newTexHeight === preset.h)"
                    [class.border-slate-800]="!(newTexWidth === preset.w && newTexHeight === preset.h)"
                    class="px-1.5 py-0.5 rounded text-[10px] font-mono border hover:border-sky-500 transition">
                    {{ preset.label }}
                  </button>
                }
              </div>

              <!-- Numeric Width & Height inputs with link button -->
              <div class="flex items-center gap-1.5">
                <div class="flex-1">
                  <span class="text-[9px] text-slate-400 block">{{ 'textureStudio.width' | translate }}</span>
                  <input
                    type="number"
                    min="1"
                    max="256"
                    step="1"
                    inputmode="numeric"
                    [ngModel]="newTexWidth"
                    (ngModelChange)="onNewTexWidthChange($event)"
                    [attr.aria-label]="'textureStudio.width' | translate"
                    class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500" />
                </div>

                <button
                  type="button"
                  (click)="toggleCreateAspectLock()"
                  [appTooltip]="(lockCreateAspect() ? 'textureStudio.unlockAspectRatio' : 'textureStudio.lockAspectRatio') | translate"
                  class="mt-3.5 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition flex-shrink-0"
                  [attr.aria-label]="(lockCreateAspect() ? 'textureStudio.unlockAspectRatio' : 'textureStudio.lockAspectRatio') | translate">
                  <svg *ngIf="lockCreateAspect()" lucideLink class="w-3.5 h-3.5 text-sky-400"></svg>
                  <svg *ngIf="!lockCreateAspect()" lucideUnlink class="w-3.5 h-3.5 text-slate-400"></svg>
                </button>

                <div class="flex-1">
                  <span class="text-[9px] text-slate-400 block">{{ 'textureStudio.height' | translate }}</span>
                  <input
                    type="number"
                    min="1"
                    max="256"
                    step="1"
                    inputmode="numeric"
                    [ngModel]="newTexHeight"
                    (ngModelChange)="onNewTexHeightChange($event)"
                    [attr.aria-label]="'textureStudio.height' | translate"
                    class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500" />
                </div>
              </div>
            </div>

            <!-- Initial Fill Mode -->
            <div>
              <label class="text-[10px] text-slate-400 block mb-0.5">{{ 'textureStudio.fillType' | translate }}</label>
              <select
                [(ngModel)]="newTexFillMode"
                [attr.aria-label]="'textureStudio.fillType' | translate"
                class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-sky-500">
                <option value="solid">{{ 'textureStudio.fillSolid' | translate }}</option>
                <option value="transparent">{{ 'textureStudio.fillTransparent' | translate }}</option>
                <option value="clone">{{ 'textureStudio.fillCloneActive' | translate }}</option>
              </select>
            </div>

            <button
              type="button"
              (click)="confirmCreateTexture()"
              class="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow transition active:scale-98">
              {{ 'textureStudio.createBtn' | translate }}
            </button>
          </div>
        }
      </div>

      <!-- Drawing Tools & Symmetry Bar -->
      <div
        role="toolbar"
        [attr.aria-label]="'textureStudio.tabPainter' | translate"
        class="bg-slate-950/80 p-2 rounded-xl border border-slate-800 space-y-2">
        <!-- Row 1: Primary Drawing Tools -->
        <div class="grid grid-cols-6 gap-1">
          @for (t of tools; track t.id) {
            <button
              type="button"
              (click)="selectTool(t.id)"
              [class.bg-sky-600]="painterService.activeTool() === t.id"
              [class.text-white]="painterService.activeTool() === t.id"
              [class.border-sky-400]="painterService.activeTool() === t.id"
              [class.bg-slate-900]="painterService.activeTool() !== t.id"
              [class.text-slate-300]="painterService.activeTool() !== t.id"
              [class.border-slate-800]="painterService.activeTool() !== t.id"
              [attr.aria-pressed]="painterService.activeTool() === t.id"
              [attr.aria-label]="t.labelKey | translate"
              [appTooltip]="t.labelKey | translate"
              appTooltipPlacement="top"
              class="h-8.5 rounded-lg border hover:border-slate-600 flex items-center justify-center transition active:scale-95">
              @switch (t.id) {
                @case ('pencil') {
                  <svg lucidePencil class="w-4 h-4"></svg>
                }
                @case ('eraser') {
                  <svg lucideEraser class="w-4 h-4"></svg>
                }
                @case ('fill') {
                  <svg lucidePaintBucket class="w-4 h-4"></svg>
                }
                @case ('eyedropper') {
                  <svg lucidePipette class="w-4 h-4"></svg>
                }
                @case ('line') {
                  <svg lucideRuler class="w-4 h-4"></svg>
                }
                @case ('noise') {
                  <svg lucideSparkles class="w-4 h-4"></svg>
                }
              }
            </button>
          }
        </div>

        <!-- Row 2: Brush Size, Mirror X/Y, Grid & UV Overlay Toggles -->
        <div class="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/80">
          <!-- Brush Size (1px, 2px, 3px) -->
          <div class="flex items-center gap-1">
            @for (sz of [1, 2, 3]; track sz) {
              <button
                type="button"
                (click)="painterService.brushSize.set($any(sz))"
                [class.bg-sky-600]="painterService.brushSize() === sz"
                [class.text-white]="painterService.brushSize() === sz"
                [class.bg-slate-900]="painterService.brushSize() !== sz"
                [class.text-slate-400]="painterService.brushSize() !== sz"
                [appTooltip]="('textureStudio.brushSize' | translate) + ': ' + sz + 'px'"
                appTooltipPlacement="top"
                [attr.aria-label]="('textureStudio.brushSize' | translate) + ' ' + sz + 'px'"
                class="px-2 h-7 rounded border border-slate-800 hover:border-slate-600 font-mono text-[10px] font-bold transition">
                {{ sz }}px
              </button>
            }
          </div>

          <!-- Symmetry & Guides -->
          <div class="flex items-center gap-1">
            <button
              type="button"
              (click)="toggleMirrorX()"
              [class.bg-indigo-600]="painterService.mirrorX()"
              [class.text-white]="painterService.mirrorX()"
              [class.bg-slate-900]="!painterService.mirrorX()"
              [class.text-slate-400]="!painterService.mirrorX()"
              [attr.aria-pressed]="painterService.mirrorX()"
              [attr.aria-label]="'textureStudio.mirrorX' | translate"
              [appTooltip]="'textureStudio.mirrorX' | translate"
              appTooltipPlacement="top"
              class="flex items-center gap-0.5 px-1.5 h-7 rounded border border-slate-800 hover:border-slate-600 transition">
              <svg lucideFlipHorizontal class="w-3.5 h-3.5"></svg>
              <span class="text-[9px] font-mono font-bold">X</span>
            </button>
            <button
              type="button"
              (click)="toggleMirrorY()"
              [class.bg-indigo-600]="painterService.mirrorY()"
              [class.text-white]="painterService.mirrorY()"
              [class.bg-slate-900]="!painterService.mirrorY()"
              [class.text-slate-400]="!painterService.mirrorY()"
              [attr.aria-pressed]="painterService.mirrorY()"
              [attr.aria-label]="'textureStudio.mirrorY' | translate"
              [appTooltip]="'textureStudio.mirrorY' | translate"
              appTooltipPlacement="top"
              class="flex items-center gap-0.5 px-1.5 h-7 rounded border border-slate-800 hover:border-slate-600 transition">
              <svg lucideFlipVertical class="w-3.5 h-3.5"></svg>
              <span class="text-[9px] font-mono font-bold">Y</span>
            </button>
            <button
              type="button"
              (click)="togglePixelGrid()"
              [class.bg-sky-600]="painterService.showPixelGrid()"
              [class.text-white]="painterService.showPixelGrid()"
              [class.bg-slate-900]="!painterService.showPixelGrid()"
              [class.text-slate-400]="!painterService.showPixelGrid()"
              [attr.aria-pressed]="painterService.showPixelGrid()"
              [attr.aria-label]="'textureStudio.toggleGrid' | translate"
              [appTooltip]="'textureStudio.toggleGrid' | translate"
              appTooltipPlacement="top"
              class="flex items-center justify-center px-1.5 h-7 rounded border border-slate-800 hover:border-slate-600 transition">
              <svg lucideGrid3x3 class="w-3.5 h-3.5"></svg>
            </button>
            <button
              type="button"
              (click)="toggleUvOverlay()"
              [class.bg-amber-600]="painterService.showUvOverlay()"
              [class.text-white]="painterService.showUvOverlay()"
              [class.bg-slate-900]="!painterService.showUvOverlay()"
              [class.text-slate-400]="!painterService.showUvOverlay()"
              [attr.aria-pressed]="painterService.showUvOverlay()"
              [attr.aria-label]="'textureStudio.toggleUvGuide' | translate"
              [appTooltip]="'textureStudio.toggleUvGuide' | translate"
              appTooltipPlacement="top"
              class="flex items-center gap-0.5 px-1.5 h-7 rounded border border-slate-800 hover:border-slate-600 transition">
              <svg lucideBox class="w-3.5 h-3.5"></svg>
              <span class="text-[9px] font-mono font-bold">UV</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Interactive 2D Pixel Grid Canvas (Touch-Isolated & Keyboard Accessible) -->
      <div class="flex flex-col items-center gap-1.5">
        <div
          class="relative w-full max-w-[272px] aspect-square rounded-xl border-2 border-slate-700/90 focus-within:border-sky-400 shadow-inner overflow-hidden bg-slate-950">
          <canvas
            #pixelCanvas
            width="256"
            height="256"
            tabindex="0"
            role="application"
            [attr.aria-label]="('textureStudio.tabPainter' | translate) + ' ' + painterService.width() + 'x' + painterService.height()"
            (pointerdown)="onCanvasPointerDown($event)"
            (pointermove)="onCanvasPointerMove($event)"
            (pointerup)="onCanvasPointerUp($event)"
            (pointerleave)="onCanvasPointerLeave()"
            (keydown)="onCanvasKeyDown($event)"
            class="w-full h-full block cursor-crosshair touch-none outline-none [image-rendering:pixelated]"></canvas>

          <!-- Hover Pixel Coordinate Pill -->
          @if (hoverCoord(); as coord) {
            <div class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/85 border border-slate-700 text-[10px] font-mono text-sky-300 pointer-events-none">
              {{ coord.x }}, {{ coord.y }}
            </div>
          }
        </div>

        <!-- Canvas Quick Transform & Undo/Redo Bar -->
        <div class="w-full max-w-[272px] flex items-center justify-between gap-1">
          <div class="flex items-center gap-1">
            <button
              type="button"
              (click)="painterService.undo()"
              [disabled]="!painterService.canUndo()"
              [appTooltip]="'common.undo' | translate"
              appTooltipPlacement="top"
              [attr.aria-label]="'common.undo' | translate"
              class="flex items-center justify-center px-2 h-7 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition">
              <svg lucideUndo class="w-3.5 h-3.5"></svg>
            </button>
            <button
              type="button"
              (click)="painterService.redo()"
              [disabled]="!painterService.canRedo()"
              [appTooltip]="'common.redo' | translate"
              appTooltipPlacement="top"
              [attr.aria-label]="'common.redo' | translate"
              class="flex items-center justify-center px-2 h-7 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition">
              <svg lucideRedo class="w-3.5 h-3.5"></svg>
            </button>
          </div>

          <div class="flex items-center gap-1">
            <button
              type="button"
              (click)="painterService.flipHorizontal()"
              [appTooltip]="'textureStudio.flipH' | translate"
              appTooltipPlacement="top"
              [attr.aria-label]="'textureStudio.flipH' | translate"
              class="flex items-center gap-0.5 px-1.5 h-7 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition">
              <svg lucideFlipHorizontal class="w-3.5 h-3.5"></svg>
              <span class="text-[9px] font-mono">H</span>
            </button>
            <button
              type="button"
              (click)="painterService.flipVertical()"
              [appTooltip]="'textureStudio.flipV' | translate"
              appTooltipPlacement="top"
              [attr.aria-label]="'textureStudio.flipV' | translate"
              class="flex items-center gap-0.5 px-1.5 h-7 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition">
              <svg lucideFlipVertical class="w-3.5 h-3.5"></svg>
              <span class="text-[9px] font-mono">V</span>
            </button>
            <button
              type="button"
              (click)="painterService.rotate90CW()"
              [appTooltip]="'textureStudio.rotate90' | translate"
              appTooltipPlacement="top"
              [attr.aria-label]="'textureStudio.rotate90' | translate"
              class="flex items-center gap-0.5 px-1.5 h-7 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition">
              <svg lucideRotateCw class="w-3.5 h-3.5"></svg>
              <span class="text-[9px] font-mono">90°</span>
            </button>
            <button
              type="button"
              (click)="painterService.clearCanvas()"
              [appTooltip]="'textureStudio.clearCanvas' | translate"
              appTooltipPlacement="top"
              [attr.aria-label]="'textureStudio.clearCanvas' | translate"
              class="flex items-center justify-center px-2 h-7 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 transition">
              <svg lucideTrash2 class="w-3.5 h-3.5"></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Color Picker & Swatch Palettes -->
      <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-2.5">
        <!-- Active Color Input + Hex Field -->
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {{ 'textureStudio.primaryColor' | translate }}
          </span>
          <div class="flex items-center gap-1.5">
            <label
              class="relative w-7 h-7 rounded-lg border-2 border-slate-600 hover:border-white cursor-pointer overflow-hidden shadow-inner flex-shrink-0"
              [style.background-color]="painterService.primaryColor()">
              <input
                type="color"
                [value]="painterService.primaryColor()"
                (input)="onColorInput($event)"
                [attr.aria-label]="'textureStudio.primaryColor' | translate"
                class="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
            </label>
            <input
              type="text"
              [ngModel]="painterService.primaryColor()"
              (ngModelChange)="onHexInputChange($event)"
              maxlength="7"
              [attr.aria-label]="'textureStudio.primaryColor' | translate"
              class="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs uppercase focus:outline-none focus:border-sky-500" />
          </div>
        </div>

        <!-- Extracted Texture Colors (if any) -->
        @if (painterService.extractedColors().length > 0) {
          <div class="space-y-1">
            <span class="text-[10px] text-slate-400 block">{{ 'textureStudio.extractedColors' | translate }}</span>
            <div class="grid grid-cols-8 gap-1">
              @for (hex of painterService.extractedColors(); track hex) {
                <button
                  type="button"
                  (click)="painterService.primaryColor.set(hex)"
                  [style.background-color]="hex"
                  [class.ring-2]="painterService.primaryColor().toLowerCase() === hex.toLowerCase()"
                  [class.ring-white]="painterService.primaryColor().toLowerCase() === hex.toLowerCase()"
                  [appTooltip]="hex"
                  appTooltipPlacement="top"
                  [attr.aria-label]="hex"
                  class="w-full aspect-square rounded border border-slate-700 hover:scale-110 transition"></button>
              }
            </div>
          </div>
        }

        <!-- Luanti Curated Pixel Swatches -->
        <div class="space-y-1">
          <span class="text-[10px] text-slate-400 block">{{ 'textureStudio.swatches' | translate }}</span>
          <div class="grid grid-cols-8 gap-1">
            @for (swatch of swatches; track swatch) {
              <button
                type="button"
                (click)="painterService.primaryColor.set(swatch)"
                [style.background-color]="swatch"
                [class.ring-2]="painterService.primaryColor().toLowerCase() === swatch.toLowerCase()"
                [class.ring-white]="painterService.primaryColor().toLowerCase() === swatch.toLowerCase()"
                [appTooltip]="swatch"
                appTooltipPlacement="top"
                [attr.aria-label]="swatch"
                class="w-full aspect-square rounded border border-slate-700 hover:scale-110 transition"></button>
            }
          </div>
        </div>
      </div>

      <!-- Resize Canvas Modal -->
      @if (showResizeModal()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resize-canvas-title">
          <div
            class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] text-slate-200">
            <!-- Modal Header -->
            <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div class="flex items-center gap-2">
                <svg lucideSettings class="w-4 h-4 text-sky-400"></svg>
                <div>
                  <h3 id="resize-canvas-title" class="font-semibold text-xs text-white">
                    {{ 'textureStudio.resizeCanvas' | translate }}
                  </h3>
                  <p class="text-[10px] text-slate-400">
                    {{ painterService.width() }}&times;{{ painterService.height() }}px &rarr; {{ resizeTargetWidth }}&times;{{ resizeTargetHeight }}px
                  </p>
                </div>
              </div>
              <button
                type="button"
                (click)="closeResizeModal()"
                [attr.aria-label]="'common.close' | translate"
                class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
                <svg lucideX class="w-4 h-4"></svg>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-4 space-y-3.5 overflow-y-auto min-h-0 text-xs">
              <!-- Quick Presets -->
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">{{ 'textureStudio.resolution' | translate }}</label>
                <div class="flex flex-wrap gap-1">
                  @for (preset of creationPresets; track preset.label) {
                    <button
                      type="button"
                      (click)="applyResizePreset(preset.w, preset.h)"
                      [class.bg-sky-600]="resizeTargetWidth === preset.w && resizeTargetHeight === preset.h"
                      [class.text-white]="resizeTargetWidth === preset.w && resizeTargetHeight === preset.h"
                      [class.border-sky-400]="resizeTargetWidth === preset.w && resizeTargetHeight === preset.h"
                      [class.bg-slate-950]="!(resizeTargetWidth === preset.w && resizeTargetHeight === preset.h)"
                      [class.text-slate-300]="!(resizeTargetWidth === preset.w && resizeTargetHeight === preset.h)"
                      [class.border-slate-800]="!(resizeTargetWidth === preset.w && resizeTargetHeight === preset.h)"
                      class="px-1.5 py-0.5 rounded text-[10px] font-mono border hover:border-sky-500 transition">
                      {{ preset.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- Width & Height Inputs with Aspect Ratio Lock -->
              <div class="flex items-center gap-1.5">
                <div class="flex-1">
                  <span class="text-[9px] text-slate-400 block">{{ 'textureStudio.width' | translate }}</span>
                  <input
                    type="number"
                    min="1"
                    max="256"
                    step="1"
                    inputmode="numeric"
                    [ngModel]="resizeTargetWidth"
                    (ngModelChange)="onResizeWidthChange($event)"
                    [attr.aria-label]="'textureStudio.width' | translate"
                    class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500" />
                </div>

                <button
                  type="button"
                  (click)="toggleResizeAspectLock()"
                  [appTooltip]="(lockResizeAspect() ? 'textureStudio.unlockAspectRatio' : 'textureStudio.lockAspectRatio') | translate"
                  class="mt-3.5 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition flex-shrink-0"
                  [attr.aria-label]="(lockResizeAspect() ? 'textureStudio.unlockAspectRatio' : 'textureStudio.lockAspectRatio') | translate">
                  <svg *ngIf="lockResizeAspect()" lucideLink class="w-3.5 h-3.5 text-sky-400"></svg>
                  <svg *ngIf="!lockResizeAspect()" lucideUnlink class="w-3.5 h-3.5 text-slate-400"></svg>
                </button>

                <div class="flex-1">
                  <span class="text-[9px] text-slate-400 block">{{ 'textureStudio.height' | translate }}</span>
                  <input
                    type="number"
                    min="1"
                    max="256"
                    step="1"
                    inputmode="numeric"
                    [ngModel]="resizeTargetHeight"
                    (ngModelChange)="onResizeHeightChange($event)"
                    [attr.aria-label]="'textureStudio.height' | translate"
                    class="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500" />
                </div>
              </div>

              <!-- Resize Method: Scale vs Crop/Pad -->
              <div class="space-y-1.5">
                <span class="text-[10px] text-slate-400 block font-medium">{{ 'textureStudio.resizeMethod' | translate }}</span>
                <div class="grid grid-cols-2 gap-2">
                  <label
                    [class.border-sky-500]="resizeMode === 'scale'"
                    [class.bg-sky-950/30]="resizeMode === 'scale'"
                    class="flex items-start gap-2 p-2 rounded-lg border border-slate-800 bg-slate-950 cursor-pointer transition">
                    <input
                      type="radio"
                      name="resizeMode"
                      value="scale"
                      [(ngModel)]="resizeMode"
                      class="mt-0.5 text-sky-500 focus:ring-sky-500" />
                    <div>
                      <div class="font-semibold text-slate-200 text-[11px]">
                        {{ 'textureStudio.resizeScale' | translate }}
                      </div>
                      <div class="text-[9px] text-slate-400 leading-tight mt-0.5">
                        Resample pixels without blur
                      </div>
                    </div>
                  </label>

                  <label
                    [class.border-sky-500]="resizeMode === 'pad'"
                    [class.bg-sky-950/30]="resizeMode === 'pad'"
                    class="flex items-start gap-2 p-2 rounded-lg border border-slate-800 bg-slate-950 cursor-pointer transition">
                    <input
                      type="radio"
                      name="resizeMode"
                      value="pad"
                      [(ngModel)]="resizeMode"
                      class="mt-0.5 text-sky-500 focus:ring-sky-500" />
                    <div>
                      <div class="font-semibold text-slate-200 text-[11px]">
                        {{ 'textureStudio.resizeCropPad' | translate }}
                      </div>
                      <div class="text-[9px] text-slate-400 leading-tight mt-0.5">
                        Keep 1:1 pixel scale
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Anchor (if mode === 'pad') -->
              @if (resizeMode === 'pad') {
                <div class="space-y-1">
                  <span class="text-[10px] text-slate-400 block font-medium">{{ 'textureStudio.anchor' | translate }}</span>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      (click)="resizeAnchor = 'center'"
                      [class.bg-sky-600]="resizeAnchor === 'center'"
                      [class.text-white]="resizeAnchor === 'center'"
                      [class.bg-slate-950]="resizeAnchor !== 'center'"
                      [class.text-slate-300]="resizeAnchor !== 'center'"
                      class="flex-1 py-1 rounded border border-slate-700 text-xs transition">
                      {{ 'textureStudio.anchorCenter' | translate }}
                    </button>
                    <button
                      type="button"
                      (click)="resizeAnchor = 'top-left'"
                      [class.bg-sky-600]="resizeAnchor === 'top-left'"
                      [class.text-white]="resizeAnchor === 'top-left'"
                      [class.bg-slate-950]="resizeAnchor !== 'top-left'"
                      [class.text-slate-300]="resizeAnchor !== 'top-left'"
                      class="flex-1 py-1 rounded border border-slate-700 text-xs transition">
                      {{ 'textureStudio.anchorTopLeft' | translate }}
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Modal Footer -->
            <div class="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                (click)="closeResizeModal()"
                class="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs transition">
                {{ 'common.cancel' | translate }}
              </button>
              <button
                type="button"
                (click)="applyResizeCanvas()"
                class="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow transition active:scale-95">
                {{ 'textureStudio.applyResize' | translate }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class TexturePainterComponent implements AfterViewInit {
  @ViewChild('pixelCanvas', { static: true })
  pixelCanvas!: ElementRef<HTMLCanvasElement>;

  public projectStore = inject(ProjectStore);
  public textureService = inject(TextureService);
  public painterService = inject(TexturePainterService);

  public readonly faceDirections = LUANTI_FACE_DIRECTIONS;
  public readonly swatches = LUANTI_PIXEL_SWATCHES;

  public readonly tools: Array<{ id: PaintTool; labelKey: string }> = [
    { id: 'pencil', labelKey: 'textureStudio.toolPencil' },
    { id: 'eraser', labelKey: 'textureStudio.toolEraser' },
    { id: 'fill', labelKey: 'textureStudio.toolFill' },
    { id: 'eyedropper', labelKey: 'textureStudio.toolEyedropper' },
    { id: 'line', labelKey: 'textureStudio.toolLine' },
    { id: 'noise', labelKey: 'textureStudio.toolNoise' }
  ];

  public readonly creationPresets = [
    { label: '8×8', w: 8, h: 8 },
    { label: '16×16', w: 16, h: 16 },
    { label: '32×32', w: 32, h: 32 },
    { label: '64×64', w: 64, h: 64 },
    { label: '128×128', w: 128, h: 128 },
    { label: '16×32', w: 16, h: 32 },
    { label: '16×64', w: 16, h: 64 }
  ];

  // New Texture Form state
  public showCreateForm = signal<boolean>(false);
  public newTexName = 'custom_tile';
  public newTexWidth = 16;
  public newTexHeight = 16;
  public lockCreateAspect = signal<boolean>(true);
  public newTexFillMode: 'solid' | 'transparent' | 'clone' = 'solid';

  // Resize Canvas Modal state
  public showResizeModal = signal<boolean>(false);
  public resizeTargetWidth = 16;
  public resizeTargetHeight = 16;
  public lockResizeAspect = signal<boolean>(true);
  public resizeMode: 'scale' | 'pad' = 'scale';
  public resizeAnchor: 'center' | 'top-left' = 'center';

  // Hover & Keyboard cursor coordinate
  public hoverCoord = signal<{ x: number; y: number } | null>(null);
  private isPointerDown = false;

  public activeTextureName = computed(() => {
    const id = this.painterService.activeTextureId();
    const tex = this.textureService.getTextureById(id);
    return tex ? `${tex.name} (${tex.id})` : id;
  });

  constructor() {
    effect(() => {
      // Re-render 2D canvas whenever pixel buffer, grid/UV toggles, active face, or 3D boxes change
      this.painterService.bufferVersion();
      this.painterService.showPixelGrid();
      this.painterService.showUvOverlay();
      this.painterService.activeFace();
      this.projectStore.project();
      this.projectStore.selectedBoxId();
      this.hoverCoord();
      this.renderCanvas();
    });
  }

  ngAfterViewInit(): void {
    const face = this.painterService.activeFace();
    const currentKey = this.projectStore.project().globalTextures[face] || 'default_wood.png';
    this.painterService.loadTextureIntoBuffer(currentKey).then(() => {
      this.renderCanvas();
    });
  }

  onSelectFace(face: FaceDirection): void {
    this.painterService.activeFace.set(face);
    const key = this.projectStore.project().globalTextures[face] || 'default_wood.png';
    this.painterService.loadTextureIntoBuffer(key);
  }

  toggleCreateForm(): void {
    this.showCreateForm.update(v => !v);
  }

  applyCreatePreset(w: number, h: number): void {
    this.newTexWidth = w;
    this.newTexHeight = h;
    this.lockCreateAspect.set(w === h);
  }

  onNewTexWidthChange(val: number): void {
    const clamped = Math.max(1, Math.min(256, Math.round(val || 1)));
    this.newTexWidth = clamped;
    if (this.lockCreateAspect()) {
      this.newTexHeight = clamped;
    }
  }

  onNewTexHeightChange(val: number): void {
    const clamped = Math.max(1, Math.min(256, Math.round(val || 1)));
    this.newTexHeight = clamped;
    if (this.lockCreateAspect()) {
      this.newTexWidth = clamped;
    }
  }

  toggleCreateAspectLock(): void {
    this.lockCreateAspect.update(v => !v);
    if (this.lockCreateAspect()) {
      this.newTexHeight = this.newTexWidth;
    }
  }

  async confirmCreateTexture(): Promise<void> {
    await this.painterService.createNewTextureAndOpen({
      name: this.newTexName || 'custom_tile',
      width: this.newTexWidth,
      height: this.newTexHeight,
      fillMode: this.newTexFillMode,
      fillColor: this.painterService.primaryColor()
    });
    this.showCreateForm.set(false);
  }

  openResizeModal(): void {
    this.resizeTargetWidth = this.painterService.width();
    this.resizeTargetHeight = this.painterService.height();
    this.lockResizeAspect.set(this.resizeTargetWidth === this.resizeTargetHeight);
    this.showResizeModal.set(true);
  }

  closeResizeModal(): void {
    this.showResizeModal.set(false);
  }

  applyResizePreset(w: number, h: number): void {
    this.resizeTargetWidth = w;
    this.resizeTargetHeight = h;
    this.lockResizeAspect.set(w === h);
  }

  onResizeWidthChange(val: number): void {
    const clamped = Math.max(1, Math.min(256, Math.round(val || 1)));
    this.resizeTargetWidth = clamped;
    if (this.lockResizeAspect()) {
      this.resizeTargetHeight = clamped;
    }
  }

  onResizeHeightChange(val: number): void {
    const clamped = Math.max(1, Math.min(256, Math.round(val || 1)));
    this.resizeTargetHeight = clamped;
    if (this.lockResizeAspect()) {
      this.resizeTargetWidth = clamped;
    }
  }

  toggleResizeAspectLock(): void {
    this.lockResizeAspect.update(v => !v);
    if (this.lockResizeAspect()) {
      this.resizeTargetHeight = this.resizeTargetWidth;
    }
  }

  applyResizeCanvas(): void {
    this.painterService.resizeCanvas({
      width: this.resizeTargetWidth,
      height: this.resizeTargetHeight,
      mode: this.resizeMode,
      anchor: this.resizeAnchor
    });
    this.closeResizeModal();
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showResizeModal()) {
      this.closeResizeModal();
      event.preventDefault();
    }
  }

  downloadCurrentTexture(): void {
    this.textureService.downloadTexture(this.painterService.activeTextureId());
  }

  selectTool(tool: PaintTool): void {
    this.painterService.activeTool.set(tool);
  }

  toggleMirrorX(): void {
    this.painterService.mirrorX.update(v => !v);
  }

  toggleMirrorY(): void {
    this.painterService.mirrorY.update(v => !v);
  }

  togglePixelGrid(): void {
    this.painterService.showPixelGrid.update(v => !v);
  }

  toggleUvOverlay(): void {
    this.painterService.showUvOverlay.update(v => !v);
  }

  onColorInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (val) {
      this.painterService.primaryColor.set(val);
    }
  }

  onHexInputChange(val: string): void {
    if (/^#[0-9a-fA-F]{6}$/.test(val.trim())) {
      this.painterService.primaryColor.set(val.trim().toLowerCase());
    }
  }

  onCanvasPointerDown(event: PointerEvent): void {
    event.preventDefault();
    const canvas = this.pixelCanvas?.nativeElement;
    if (!canvas) return;
    if (typeof canvas.setPointerCapture === 'function') {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Ignore in headless environments
      }
    }

    const pt = this.clientToPixel(event.clientX, event.clientY);
    if (!pt) return;
    this.isPointerDown = true;
    this.hoverCoord.set(pt);
    this.painterService.startStroke(pt.x, pt.y);
  }

  onCanvasPointerMove(event: PointerEvent): void {
    const pt = this.clientToPixel(event.clientX, event.clientY);
    if (!pt) return;
    this.hoverCoord.set(pt);
    if (this.isPointerDown) {
      event.preventDefault();
      this.painterService.moveStroke(pt.x, pt.y);
    }
  }

  onCanvasPointerUp(event: PointerEvent): void {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    const canvas = this.pixelCanvas?.nativeElement;
    if (canvas && typeof canvas.releasePointerCapture === 'function') {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore
      }
    }
    this.painterService.endStroke();
  }

  onCanvasPointerLeave(): void {
    if (this.isPointerDown) {
      this.isPointerDown = false;
      this.painterService.endStroke();
    }
    this.hoverCoord.set(null);
  }

  onCanvasKeyDown(event: KeyboardEvent): void {
    const w = this.painterService.width();
    const h = this.painterService.height();
    const curr = this.hoverCoord() ?? { x: Math.floor(w / 2), y: Math.floor(h / 2) };

    if (event.key === 'ArrowLeft') {
      this.hoverCoord.set({ x: Math.max(0, curr.x - 1), y: curr.y });
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      this.hoverCoord.set({ x: Math.min(w - 1, curr.x + 1), y: curr.y });
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      this.hoverCoord.set({ x: curr.x, y: Math.max(0, curr.y - 1) });
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      this.hoverCoord.set({ x: curr.x, y: Math.min(h - 1, curr.y + 1) });
      event.preventDefault();
    } else if (event.key === ' ' || event.key === 'Enter') {
      this.painterService.startStroke(curr.x, curr.y);
      this.painterService.endStroke();
      event.preventDefault();
    }
  }

  private clientToPixel(clientX: number, clientY: number): { x: number; y: number } | null {
    const canvas = this.pixelCanvas?.nativeElement;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const u = Math.max(0, Math.min(0.9999, (clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(0.9999, (clientY - rect.top) / rect.height));
    const w = this.painterService.width();
    const h = this.painterService.height();

    return {
      x: Math.floor(u * w),
      y: Math.floor(v * h)
    };
  }

  private renderCanvas(): void {
    const canvas = this.pixelCanvas?.nativeElement;
    if (!canvas || typeof document === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayW = canvas.width;
    const displayH = canvas.height;
    const texW = this.painterService.width();
    const texH = this.painterService.height();
    const buf = this.painterService.pixelBuffer();

    ctx.clearRect(0, 0, displayW, displayH);

    const cellW = displayW / texW;
    const cellH = displayH / texH;

    // 1. Alpha Checkerboard & Pixel Colors
    for (let y = 0; y < texH; y++) {
      for (let x = 0; x < texW; x++) {
        const rx = x * cellW;
        const ry = y * cellH;
        const isEven = (x + y) % 2 === 0;
        ctx.fillStyle = isEven ? '#1e293b' : '#0f172a';
        ctx.fillRect(rx, ry, Math.ceil(cellW), Math.ceil(cellH));

        const idx = (y * texW + x) * 4;
        const a = buf[idx + 3];
        if (a > 0) {
          ctx.fillStyle = `rgba(${buf[idx]}, ${buf[idx + 1]}, ${buf[idx + 2]}, ${a / 255})`;
          ctx.fillRect(rx, ry, Math.ceil(cellW), Math.ceil(cellH));
        }
      }
    }

    // 2. Pixel Grid Lines
    if (this.painterService.showPixelGrid()) {
      ctx.lineWidth = 1;
      for (let x = 1; x < texW; x++) {
        const px = Math.round(x * cellW) + 0.5;
        ctx.strokeStyle = x === texW / 2 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(148, 163, 184, 0.16)';
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, displayH);
        ctx.stroke();
      }
      for (let y = 1; y < texH; y++) {
        const py = Math.round(y * cellH) + 0.5;
        ctx.strokeStyle = y === texH / 2 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(148, 163, 184, 0.16)';
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(displayW, py);
        ctx.stroke();
      }
    }

    // 3. 3D NodeBox UV Footprint Guide Overlay
    if (this.painterService.showUvOverlay()) {
      const face = this.painterService.activeFace();
      const project = this.projectStore.project();
      const selectedBoxId = this.projectStore.selectedBoxId();
      const isFlipped = (project.globalTextures[face] || '').endsWith('^[transformFX');

      for (const box of project.boxes) {
        if (!box.visible) continue;
        const uvRect = this.computeFaceUvRect(box, face, isFlipped);
        const x0 = uvRect.u0 * displayW;
        const y0 = uvRect.v0 * displayH;
        const rw = (uvRect.u1 - uvRect.u0) * displayW;
        const rh = (uvRect.v1 - uvRect.v0) * displayH;

        ctx.save();
        ctx.strokeStyle = box.id === selectedBoxId ? '#fbbf24' : box.color || '#38bdf8';
        ctx.lineWidth = box.id === selectedBoxId ? 2 : 1.25;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, Math.max(1, rw - 1), Math.max(1, rh - 1));
        ctx.restore();
      }
    }

    // 4. Hover / Keyboard Cursor Highlight
    const hover = this.hoverCoord();
    if (hover) {
      const size = this.painterService.brushSize();
      const half = Math.floor(size / 2);
      const hx = (hover.x - half) * cellW;
      const hy = (hover.y - half) * cellH;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hx + 0.5, hy + 0.5, size * cellW - 1, size * cellH - 1);
    }
  }

  private computeFaceUvRect(
    box: { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number },
    face: FaceDirection,
    isFlipped: boolean
  ): { u0: number; v0: number; u1: number; v1: number } {
    let u0 = 0;
    let u1 = 1;
    let v0 = 0;
    let v1 = 1;

    switch (face) {
      case 'top':
        u0 = box.minX + 0.5;
        u1 = box.maxX + 0.5;
        v0 = 0.5 - box.maxZ;
        v1 = 0.5 - box.minZ;
        break;
      case 'bottom':
        u0 = box.minX + 0.5;
        u1 = box.maxX + 0.5;
        v0 = box.minZ + 0.5;
        v1 = box.maxZ + 0.5;
        break;
      case 'front':
        u0 = box.minX + 0.5;
        u1 = box.maxX + 0.5;
        v0 = 0.5 - box.maxY;
        v1 = 0.5 - box.minY;
        break;
      case 'back':
        u0 = 0.5 - box.maxX;
        u1 = 0.5 - box.minX;
        v0 = 0.5 - box.maxY;
        v1 = 0.5 - box.minY;
        break;
      case 'right':
        u0 = box.minZ + 0.5;
        u1 = box.maxZ + 0.5;
        v0 = 0.5 - box.maxY;
        v1 = 0.5 - box.minY;
        break;
      case 'left':
        u0 = 0.5 - box.maxZ;
        u1 = 0.5 - box.minZ;
        v0 = 0.5 - box.maxY;
        v1 = 0.5 - box.minY;
        break;
    }

    if (isFlipped) {
      const nextU0 = 1 - u1;
      const nextU1 = 1 - u0;
      u0 = nextU0;
      u1 = nextU1;
    }

    return { u0, v0, u1, v1 };
  }
}
