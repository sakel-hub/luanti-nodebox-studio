import { Component, EventEmitter, HostListener, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import {
  LucideHelpCircle,
  LucideX,
  LucideLightbulb,
  LucideMousePointer,
  LucideCamera
} from '@lucide/angular';

type HelpTab = 'coordinates' | 'viewport' | 'tools' | 'textures' | 'code';

@Component({
  selector: 'app-help-dialog',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    LucideHelpCircle,
    LucideX,
    LucideLightbulb,
    LucideMousePointer,
    LucideCamera
  ],
  template: `
    <div
      class="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-dialog-title"
      (click)="onBackdropClick($event)">
      <div
        class="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        <!-- Header -->
        <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <svg lucideHelpCircle class="w-5 h-5"></svg>
            </div>
            <div>
              <h2 id="help-dialog-title" class="text-base font-bold text-slate-100">
                {{ 'help.title' | translate }}
              </h2>
              <p class="text-xs text-slate-400">Essential concepts, 3D controls, coordinates & Minetest/Luanti conventions</p>
            </div>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            class="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition"
            aria-label="Close dialog">
            <svg lucideX class="w-5 h-5"></svg>
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto px-4 gap-1 text-xs font-medium">
          <button
            type="button"
            (click)="activeTab.set('coordinates')"
            [class.text-sky-400]="activeTab() === 'coordinates'"
            [class.border-sky-500]="activeTab() === 'coordinates'"
            class="py-3 px-3.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition whitespace-nowrap">
            {{ 'help.tabCoordinates' | translate }}
          </button>
          <button
            type="button"
            (click)="activeTab.set('viewport')"
            [class.text-sky-400]="activeTab() === 'viewport'"
            [class.border-sky-500]="activeTab() === 'viewport'"
            class="py-3 px-3.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition whitespace-nowrap">
            {{ 'help.tabViewport' | translate }}
          </button>
          <button
            type="button"
            (click)="activeTab.set('tools')"
            [class.text-sky-400]="activeTab() === 'tools'"
            [class.border-sky-500]="activeTab() === 'tools'"
            class="py-3 px-3.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition whitespace-nowrap">
            {{ 'help.tabTools' | translate }}
          </button>
          <button
            type="button"
            (click)="activeTab.set('textures')"
            [class.text-sky-400]="activeTab() === 'textures'"
            [class.border-sky-500]="activeTab() === 'textures'"
            class="py-3 px-3.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition whitespace-nowrap">
            {{ 'help.tabTextures' | translate }}
          </button>
          <button
            type="button"
            (click)="activeTab.set('code')"
            [class.text-sky-400]="activeTab() === 'code'"
            [class.border-sky-500]="activeTab() === 'code'"
            class="py-3 px-3.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition whitespace-nowrap">
            {{ 'help.tabCode' | translate }}
          </button>
        </div>

        <!-- Tab Content Body -->
        <div class="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed max-h-[60vh]">
          
          <!-- Tab 1: Coordinates -->
          @if (activeTab() === 'coordinates') {
            <div class="space-y-4">
              <div class="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <h3 class="text-sm font-semibold text-sky-400 mb-2">Luanti 3D Coordinate Space</h3>
                <p>
                  In Luanti (formerly Minetest), a standard game node represents a 1x1x1 meter voxel in 3D world space.
                  Nodeboxes are defined as axis-aligned bounding boxes (AABBs) using two 3D points:
                </p>
                <div class="mt-2 p-2.5 bg-slate-900 rounded font-mono text-[11px] text-amber-300 border border-slate-800">
                  &#123; min_x, min_y, min_z, max_x, max_y, max_z &#125;
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="p-3.5 bg-slate-950/50 rounded-lg border border-slate-800/80">
                  <div class="font-semibold text-slate-200 mb-1">Standard Limits (-0.5 to +0.5)</div>
                  <p class="text-slate-400 text-[11px]">
                    The center of the node is at <code class="text-sky-300">(0, 0, 0)</code>. The boundaries of a single node cube span from <code class="text-sky-300">-0.5</code> (-8/16) to <code class="text-sky-300">+0.5</code> (+8/16).
                  </p>
                </div>
                <div class="p-3.5 bg-slate-950/50 rounded-lg border border-slate-800/80">
                  <div class="font-semibold text-slate-200 mb-1">Axes Orientation</div>
                  <ul class="text-slate-400 text-[11px] space-y-1">
                    <li><strong class="text-emerald-400">+Y</strong> is Up, <strong class="text-emerald-400">-Y</strong> is Down</li>
                    <li><strong class="text-blue-400">+Z</strong> is Back / North, <strong class="text-blue-400">-Z</strong> is Front / South</li>
                    <li><strong class="text-rose-400">+X</strong> is Right / East, <strong class="text-rose-400">-X</strong> is Left / West</li>
                  </ul>
                </div>
              </div>

              <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-200 flex items-start gap-1.5">
                <svg lucideLightbulb class="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"></svg>
                <div>
                  <strong>Tip:</strong> Switch between <strong>16ths</strong> (-8 to +8), <strong>Fractions</strong> (-1/2 to 1/2), and <strong>Decimals</strong> (-0.5 to 0.5) in the Box Inspector at any time!
                </div>
              </div>
            </div>
          }

          <!-- Tab 2: Viewport -->
          @if (activeTab() === 'viewport') {
            <div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div class="font-semibold text-sky-400 mb-1.5 flex items-center gap-1.5">
                    <svg lucideMousePointer class="w-4 h-4"></svg>
                    <span>Mouse & Touch Controls</span>
                  </div>
                  <ul class="space-y-1.5 text-[11px] text-slate-300">
                    <li><strong>Left Mouse Button (drag):</strong> Orbit / Rotate 3D camera</li>
                    <li><strong>Right Mouse Button / Shift + Left:</strong> Pan viewport</li>
                    <li><strong>Mouse Scroll Wheel:</strong> Zoom in / out</li>
                    <li><strong>Left Click on Box:</strong> Select box in 3D</li>
                    <li><strong>Touch (Mobile):</strong> 1 finger orbit, 2 finger pinch & zoom</li>
                  </ul>
                </div>

                <div class="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div class="font-semibold text-sky-400 mb-1.5 flex items-center gap-1.5">
                    <svg lucideCamera class="w-4 h-4"></svg>
                    <span>Camera & Shading Options</span>
                  </div>
                  <ul class="space-y-1.5 text-[11px] text-slate-300">
                    <li><strong>Isometric / Ortho / Perspective (5):</strong> Toggle camera projection modes</li>
                    <li><strong>Quick Angles:</strong> Iso, Top, Front, Back, Left, Right views</li>
                    <li><strong>Shading:</strong> Textured, Solid diffuse, or Wireframe view</li>
                    <li><strong>Render Studio:</strong> Cubic Luanti Skybox (Day, Sunset, Night) with 3D Sun, Moon, Stars &amp; Voxel Clouds, 3D Pixel Extrusion &amp; per-style depth sliders</li>
                    <li><strong>Screenshots:</strong> Export 1080p, 4K Ultra-HD, or 512×512 transparent PNG icons</li>
                  </ul>
                </div>
              </div>
            </div>
          }

          <!-- Tab 3: Tools -->
          @if (activeTab() === 'tools') {
            <div class="space-y-3">
              <div class="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <h4 class="font-semibold text-sky-400 mb-2">Transform Tools & Gizmos</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                  <div class="p-2 bg-slate-900 rounded border border-slate-800/80">
                    <strong class="text-slate-100">Position Tool (W):</strong> Drag 3D colored axis arrows (X, Y, Z) to move the active box in space.
                  </div>
                  <div class="p-2 bg-slate-900 rounded border border-slate-800/80">
                    <strong class="text-slate-100">Rotate Tool (E):</strong> Rotate 90° clockwise around the box center or the node origin (0,0,0).
                  </div>
                  <div class="p-2 bg-slate-900 rounded border border-slate-800/80">
                    <strong class="text-slate-100">Scale Tool (R):</strong> Uniformly resize the nodebox relative to its center.
                  </div>
                  <div class="p-2 bg-slate-900 rounded border border-slate-800/80">
                    <strong class="text-slate-100">Dimensions Tool (T):</strong> Drag face handles to expand or shrink individual box bounds.
                  </div>
                  <div class="p-2 bg-slate-900 rounded border border-slate-800/80 sm:col-span-2">
                    <strong class="text-fuchsia-300">3D Paint Mode (P):</strong> Paint pixels directly on 3D nodebox faces with live GPU updates. Built-in textures are automatically cloned to custom textures when painted.
                  </div>
                </div>
              </div>

              <div class="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <h4 class="font-semibold text-slate-200 mb-1 text-[11px]">Grid Snapping & Nudge</h4>
                <p class="text-[11px] text-slate-400">
                  Enable Snap (1/16, 1/32, or 1/64) to automatically snap box corners to exact grid increments. Use the Nudge buttons in the Inspector to step boxes by single grid units.
                </p>
              </div>
            </div>
          }

          <!-- Tab 4: Textures -->
          @if (activeTab() === 'textures') {
            <div class="space-y-3">
              <div class="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <h4 class="font-semibold text-sky-400 mb-1.5">6 Cube Faces Mapping</h4>
                <p class="text-[11px] text-slate-400 mb-2">
                  Luanti tiles textures in a specific 6-face order: <code>top (+Y)</code>, <code>bottom (-Y)</code>, <code>right (+X)</code>, <code>left (-X)</code>, <code>back (+Z)</code>, <code>front (-Z)</code>.
                </p>
                <div class="p-2 bg-slate-900 rounded font-mono text-[11px] text-slate-300">
                  tiles = &#123; "top.png", "bottom.png", "right.png", "left.png", "back.png", "front.png" &#125;
                </div>
              </div>

              <div class="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <h4 class="font-semibold text-fuchsia-400 mb-1.5">2D Pixel Painter & 3D Raycast Painting</h4>
                <p class="text-[11px] text-slate-400 mb-2">
                  Switch to the <strong>Pixel Painter</strong> tab in Texture Studio to create blank textures (<code>16x16</code>, <code>32x32</code>, <code>64x64</code>) or edit any texture with Pencil, Eraser, Flood-Fill Bucket, Eyedropper, Line, and Pixel Noise tools. Toggle the <strong>UV Box Guide</strong> overlay to see the selected box's 3D footprint on the texture canvas, or press <kbd class="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px]">P</kbd> in the 3D viewport to paint directly onto 3D faces! Use the <strong>Download PNG</strong> button to save your textures for your Luanti mod's <code>textures/</code> folder.
                </p>
              </div>

              <div class="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <h4 class="font-semibold text-emerald-400 mb-1.5">Animated Texture Sheets</h4>
                <p class="text-[11px] text-slate-400 mb-2">
                  For vertical sprite sheets (like fire, water, or glowing runes), configure <strong>Total Frames</strong> and <strong>Animation Length</strong>. NodeBox Studio previews the animation in real-time and exports native Luanti table syntax:
                </p>
                <div class="p-2 bg-slate-900 rounded font-mono text-[11px] text-emerald-300 border border-slate-800">
                  &#123; name = "fire_animated.png", animation = &#123; type = "vertical_frames", aspect_w = 16, aspect_h = 16, length = 2.0 &#125; &#125;
                </div>
              </div>
            </div>
          }

          <!-- Tab 5: Code -->
          @if (activeTab() === 'code') {
            <div class="space-y-3">
              <div class="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <h4 class="font-semibold text-sky-400 mb-1.5">Exporting Lua</h4>
                <p class="text-[11px] text-slate-400">
                  Choose your preferred code template (Standard register_node, Nodebox table only, or custom template). Select your desired number format (16ths integers, simplified fractions, or decimals) and click <strong>Copy</strong> or <strong>Download nodes.lua</strong>.
                </p>
              </div>

              <div class="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <h4 class="font-semibold text-amber-400 mb-1.5">Importing Existing Lua Mods</h4>
                <p class="text-[11px] text-slate-400">
                  Switch to the <strong>Lua Import</strong> tab and paste any Luanti <code>core.register_node(...)</code> definition containing a <code>node_box</code>. Studio will parse all boxes, coordinates, and animated texture definitions directly into your workspace.
                </p>
              </div>
            </div>
          }

        </div>

        <!-- Footer -->
        <div class="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <span class="text-[11px] text-slate-500">Press <kbd class="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 font-mono text-[10px]">Esc</kbd> to close</span>
          <button
            type="button"
            (click)="close.emit()"
            class="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition">
            {{ 'common.close' | translate }}
          </button>
        </div>

      </div>
    </div>
  `
})
export class HelpDialogComponent {
  @Output() close = new EventEmitter<void>();

  readonly activeTab = signal<HelpTab>('coordinates');

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
