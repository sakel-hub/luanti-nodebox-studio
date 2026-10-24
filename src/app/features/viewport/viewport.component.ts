import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BabylonSceneService,
  CameraPreset,
  GizmoMode,
  ViewportMode,
  SceneFloor,
  SceneSky,
  ScreenshotResolution
} from './services/babylon-scene.service';
import { ProjectStore } from '../../core/state/project.store';
import { TooltipDirective } from '../../shared/directives/tooltip.directive';
import { ThemeService } from '../../core/services/theme.service';
import { TextureService } from '../../core/services/texture.service';

@Component({
  selector: 'app-viewport',
  standalone: true,
  imports: [CommonModule, TooltipDirective],
  template: `
    <div class="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col" style="contain: strict;">
      <!-- 3D Canvas -->
      <canvas #renderCanvas class="w-full h-full block outline-none cursor-grab active:cursor-grabbing"></canvas>

      <!-- Standard Viewport Overlay Controls (Hidden in Render Mode) -->
      @if (!projectStore.isRenderMode()) {
        <div class="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 p-1.5 rounded-lg shadow-xl text-xs z-10">
          <!-- Camera View Presets -->
          <div class="flex items-center space-x-1 border-r border-slate-700/80 pr-2 mr-1">
            <button
              (click)="setPreset('iso')"
              [appTooltip]="'Isometric View'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
              Iso
            </button>
            <button
              (click)="setPreset('top')"
              [appTooltip]="'Top View (+Y)'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
              Top
            </button>
            <button
              (click)="setPreset('front')"
              [appTooltip]="'Front View (-Z)'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
              Front
            </button>
            <button
              (click)="setPreset('back')"
              [appTooltip]="'Back View (+Z)'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
              Back
            </button>
            <button
              (click)="setPreset('left')"
              [appTooltip]="'Left View (-X)'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
              Left
            </button>
            <button
              (click)="setPreset('right')"
              [appTooltip]="'Right View (+X)'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
              Right
            </button>
          </div>

          <!-- Camera Projection Mode Toggle -->
          <div class="flex items-center space-x-1 border-r border-slate-700/80 pr-2 mr-1">
            <button
              (click)="toggleCameraMode()"
              [class.bg-sky-600]="sceneService.cameraMode() === 'orthographic'"
              [class.text-white]="sceneService.cameraMode() === 'orthographic'"
              [appTooltip]="'Toggle Perspective / Orthographic projection'"
              [appTooltipShortcutId]="'view_ortho'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition font-mono font-medium">
              {{ sceneService.cameraMode() === 'orthographic' ? 'Ortho' : 'Persp' }}
            </button>
          </div>

          <!-- Render Shading Modes -->
          <div class="flex items-center space-x-1 border-r border-slate-700/80 pr-2 mr-1">
            <button
              (click)="setRenderMode('textured')"
              [appTooltip]="'Textured Shading Mode'"
              [class.bg-sky-600]="sceneService.viewportMode() === 'textured'"
              [class.text-white]="sceneService.viewportMode() === 'textured'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
              Textures
            </button>
            <button
              (click)="setRenderMode('colored')"
              [appTooltip]="'Solid Colors Shading Mode'"
              [class.bg-sky-600]="sceneService.viewportMode() === 'colored'"
              [class.text-white]="sceneService.viewportMode() === 'colored'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
              Solid
            </button>
            <button
              (click)="setRenderMode('wireframe')"
              [appTooltip]="'Wireframe Shading Mode'"
              [class.bg-sky-600]="sceneService.viewportMode() === 'wireframe'"
              [class.text-white]="sceneService.viewportMode() === 'wireframe'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
              Wire
            </button>
          </div>

          <!-- Transform Gizmo Mode -->
          <div class="flex items-center space-x-1 border-r border-slate-700/80 pr-2 mr-1">
            <button
              (click)="setGizmo('position')"
              [class.bg-emerald-600]="sceneService.gizmoMode() === 'position'"
              [class.text-white]="sceneService.gizmoMode() === 'position'"
              [appTooltip]="'Move box along grid axes'"
              [appTooltipShortcutId]="'tool_move'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
              Move
            </button>
            <button
              (click)="setGizmo('resize')"
              [class.bg-emerald-600]="sceneService.gizmoMode() === 'resize'"
              [class.text-white]="sceneService.gizmoMode() === 'resize'"
              [appTooltip]="'Resize individual faces'"
              [appTooltipShortcutId]="'tool_resize'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
              Resize (Faces)
            </button>
            <button
              (click)="setGizmo('scale')"
              [class.bg-emerald-600]="sceneService.gizmoMode() === 'scale'"
              [class.text-white]="sceneService.gizmoMode() === 'scale'"
              [appTooltip]="'Scale box symmetrically from center'"
              [appTooltipShortcutId]="'tool_scale'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
              Scale (Center)
            </button>
            <button
              (click)="setGizmo('rotation')"
              [class.bg-emerald-600]="sceneService.gizmoMode() === 'rotation'"
              [class.text-white]="sceneService.gizmoMode() === 'rotation'"
              [appTooltip]="'Rotate box in 90° steps'"
              [appTooltipShortcutId]="'tool_rotate'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
              Rotate
            </button>
            <button
              (click)="setGizmo('none')"
              [class.bg-slate-700]="sceneService.gizmoMode() === 'none'"
              [appTooltip]="'Selection mode only (Gizmos off)'"
              [appTooltipShortcutId]="'tool_select'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 transition">
              Off
            </button>
          </div>

          <!-- Toggles -->
          <button
            (click)="toggleCage()"
            [class.text-sky-400]="sceneService.showCage()"
            [class.text-slate-500]="!sceneService.showCage()"
            [appTooltip]="'Toggle boundary node cage'"
            [appTooltipShortcutId]="'view_cage'"
            class="px-2 py-1 rounded hover:bg-slate-800 transition flex items-center gap-1">
            Cage
          </button>
          <button
            (click)="toggleGrid()"
            [class.text-sky-400]="sceneService.showGrid()"
            [class.text-slate-500]="!sceneService.showGrid()"
            [appTooltip]="'Toggle reference grid'"
            [appTooltipShortcutId]="'view_grid'"
            class="px-2 py-1 rounded hover:bg-slate-800 transition flex items-center gap-1">
            Grid
          </button>
          <button
            (click)="toggleNodeHeight()"
            [appTooltip]="'Toggle model height: 1 Node ([-0.5, 0.5]) or 2 Nodes tall ([-0.5, 1.5])'"
            [class.bg-sky-600]="projectStore.project().nodeHeight === 2"
            [class.text-white]="projectStore.project().nodeHeight === 2"
            [class.text-slate-300]="projectStore.project().nodeHeight !== 2"
            class="px-2 py-1 rounded hover:bg-slate-800 transition font-mono font-medium flex items-center gap-1 text-[11px]">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>
            </svg>
            <span>{{ projectStore.project().nodeHeight === 2 ? '2 Nodes' : '1 Node' }}</span>
          </button>
          <button
            (click)="resetCamera()"
            [appTooltip]="'Center and frame camera on model'"
            [appTooltipShortcutId]="'view_reset'"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition">
            Reset View
          </button>
        </div>
      }

      <!-- Distraction-Free Render Mode Floating HUD -->
      @if (projectStore.isRenderMode()) {
        <div class="absolute top-4 left-1/2 -translate-x-1/2 flex flex-wrap items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-xl shadow-2xl text-xs z-30">
          <!-- Render Mode Badge -->
          <div class="flex items-center gap-1.5 border-r border-slate-700/80 pr-2.5 text-amber-400 font-semibold tracking-wide uppercase text-[10px]">
            <svg class="w-3.5 h-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Render Studio
          </div>

          <!-- Sky & Lighting Selector -->
          <div class="flex items-center gap-1 border-r border-slate-700/80 pr-2">
            <span class="text-slate-400 text-[11px]">Sky:</span>
            <select
              [value]="sceneService.sceneSky()"
              (change)="onSkyChange($event)"
              class="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-1 text-xs focus:outline-none cursor-pointer">
              <option value="studio">Studio</option>
              <option value="minetest_day">Day</option>
              <option value="minetest_sunset">Sunset</option>
              <option value="minetest_night">Midnight</option>
            </select>
          </div>

          <!-- Floor Platform Selector -->
          <div class="flex items-center gap-1 border-r border-slate-700/80 pr-2">
            <span class="text-slate-400 text-[11px]">Floor:</span>
            <select
              [value]="sceneService.sceneFloor()"
              (change)="onFloorChange($event)"
              class="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-1 text-xs focus:outline-none cursor-pointer">
              <option value="none">None (Void)</option>
              <option value="grass">Grass</option>
              <option value="stone">Stone</option>
              <option value="grid">Grid</option>
            </select>
          </div>

          <!-- Pixel Art Depth & Relief Popover Trigger -->
          <div class="relative border-r border-slate-700/80 pr-2">
            <button
              (click)="showDepthPopover.set(!showDepthPopover())"
              [class.bg-sky-600]="sceneService.pixelDepth().enabled"
              [class.text-white]="sceneService.pixelDepth().enabled"
              [class.bg-slate-800]="!sceneService.pixelDepth().enabled"
              [class.text-slate-300]="!sceneService.pixelDepth().enabled"
              class="px-2.5 py-1 rounded hover:bg-slate-700 transition flex items-center gap-1.5 border border-slate-700 font-medium">
              <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <span>3D Depth</span>
              <span class="text-[9px] px-1 py-0.2 rounded font-mono uppercase bg-slate-950/60 text-sky-400">
                {{ sceneService.pixelDepth().enabled ? sceneService.pixelDepth().intensity : 'off' }}
              </span>
            </button>

            <!-- Depth Popover Dialog -->
            @if (showDepthPopover()) {
              <div class="absolute top-full mt-2 left-0 w-64 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl z-50 text-xs space-y-3">
                <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span class="font-semibold text-slate-200">Pixel Art Depth & Relief</span>
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      [checked]="sceneService.pixelDepth().enabled"
                      (change)="sceneService.setPixelDepth({ enabled: !sceneService.pixelDepth().enabled })"
                      class="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0 cursor-pointer" />
                    <span class="text-[11px] text-slate-300">Enabled</span>
                  </label>
                </div>

                <!-- Individual Style Checkboxes -->
                <div class="space-y-1.5">
                  <div class="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Depth Styles</div>
                  <label class="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      [checked]="sceneService.pixelDepth().pixelBevel"
                      (change)="sceneService.setPixelDepth({ pixelBevel: !sceneService.pixelDepth().pixelBevel })"
                      class="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0 cursor-pointer" />
                    <span>Pixel Bevel (Mosaic)</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      [checked]="sceneService.pixelDepth().luminanceRelief"
                      (change)="sceneService.setPixelDepth({ luminanceRelief: !sceneService.pixelDepth().luminanceRelief })"
                      class="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0 cursor-pointer" />
                    <span>Luminance Relief</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      [checked]="sceneService.pixelDepth().parallax"
                      (change)="sceneService.setPixelDepth({ parallax: !sceneService.pixelDepth().parallax })"
                      class="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0 cursor-pointer" />
                    <span>Parallax Occlusion (2.5D)</span>
                  </label>
                </div>

                <!-- Intensity Selector -->
                <div class="space-y-1.5">
                  <div class="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Intensity</div>
                  <div class="grid grid-cols-3 gap-1">
                    @for (lvl of ['subtle', 'medium', 'deep']; track lvl) {
                      <button
                        (click)="sceneService.setPixelDepth({ intensity: $any(lvl) })"
                        [class.bg-sky-600]="sceneService.pixelDepth().intensity === lvl"
                        [class.text-white]="sceneService.pixelDepth().intensity === lvl"
                        [class.bg-slate-800]="sceneService.pixelDepth().intensity !== lvl"
                        [class.text-slate-400]="sceneService.pixelDepth().intensity !== lvl"
                        class="py-1 rounded text-center capitalize font-medium transition hover:bg-slate-700">
                        {{ lvl }}
                      </button>
                    }
                  </div>
                </div>

                <!-- Presets -->
                <div class="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span class="text-slate-500">Presets:</span>
                  <div class="flex gap-1">
                    <button
                      (click)="sceneService.setPixelDepth({ enabled: true, pixelBevel: true, luminanceRelief: false, parallax: false })"
                      class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">Mosaic</button>
                    <button
                      (click)="sceneService.setPixelDepth({ enabled: true, pixelBevel: false, luminanceRelief: true, parallax: false })"
                      class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">Relief</button>
                    <button
                      (click)="sceneService.setPixelDepth({ enabled: true, pixelBevel: true, luminanceRelief: true, parallax: true })"
                      class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">Full 3D</button>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Projection Toggle -->
          <button
            (click)="toggleCameraMode()"
            [class.bg-sky-600]="sceneService.cameraMode() === 'orthographic'"
            [class.text-white]="sceneService.cameraMode() === 'orthographic'"
            class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition font-mono">
            {{ sceneService.cameraMode() === 'orthographic' ? 'Ortho (5)' : 'Persp (5)' }}
          </button>

          <!-- Turntable Auto-Rotate Toggle -->
          <button
            (click)="toggleTurntable()"
            [class.bg-amber-600]="sceneService.isTurntableActive()"
            [class.text-white]="sceneService.isTurntableActive()"
            class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1">
            <svg class="w-3.5 h-3.5" [class.animate-spin]="sceneService.isTurntableActive()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Turntable</span>
          </button>

          <!-- Screenshot Capture Studio -->
          <div class="flex items-center gap-1 border-r border-slate-700/80 pr-2">
            <button
              (click)="captureScreenshot('1080p', false)"
              title="Download 1080p Screenshot"
              class="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium transition flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>1080p</span>
            </button>

            <button
              (click)="captureScreenshot('4k', false)"
              title="Download 4K Ultra-HD Screenshot"
              class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
              4K
            </button>

            <button
              (click)="captureScreenshot('icon', true)"
              title="Download 512x512 Transparent Icon (Ideal for inventory/textures)"
              class="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition flex items-center gap-1">
              <span>Icon (Transp)</span>
            </button>
          </div>

          <!-- Theme Toggle (Render Mode) -->
          <button
            (click)="themeService.toggleTheme()"
            [title]="themeService.theme() === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
            class="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            @if (themeService.theme() === 'dark') {
              <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            } @else {
              <svg class="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            }
          </button>

          <!-- Exit Render Mode Button -->
          <button
            (click)="projectStore.toggleRenderMode(false)"
            title="Exit presentation render mode (Esc)"
            class="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white font-medium transition flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Exit (Esc)</span>
          </button>
        </div>
      }

      <!-- Luanti Orientation / Axis Indicator Badge (Hidden in Render Mode) -->
      @if (!projectStore.isRenderMode()) {
        <div class="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 px-2.5 py-1.5 rounded text-[11px] text-slate-300 pointer-events-none flex items-center gap-3">
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-red-500"></span> +X East
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-green-500"></span> +Y Up
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span> +Z North (Back)
          </span>
        </div>

        <!-- Quick Navigation Hint -->
        <div class="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 px-2.5 py-1.5 rounded text-[11px] text-slate-400 pointer-events-none">
          Left Drag: Orbit | Right Drag: Pan | Wheel: Zoom | Click: Select Box
        </div>
      }

      <!-- Active Face Resize Status Badge (Hidden in Render Mode) -->
      @if (!projectStore.isRenderMode() && sceneService.gizmoMode() === 'resize' && sceneService.activeFace()) {
        <div class="absolute bottom-12 left-1/2 -translate-x-1/2 bg-sky-950/90 text-sky-200 border border-sky-500/70 px-4 py-1.5 rounded-full text-xs font-medium shadow-2xl flex items-center gap-2 pointer-events-none backdrop-blur-md">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Resizing Face: <strong class="text-white capitalize">{{ sceneService.activeFace() }}</strong></span>
          <span class="text-sky-300 font-mono text-[11px] font-semibold">({{ sceneService.getFaceAxisName(sceneService.activeFace()!) }})</span>
        </div>
      }
    </div>
  `
})
export class ViewportComponent implements OnInit, OnDestroy {
  @ViewChild('renderCanvas', { static: true })
  renderCanvas!: ElementRef<HTMLCanvasElement>;

  public sceneService = inject(BabylonSceneService);
  public projectStore = inject(ProjectStore);
  public themeService = inject(ThemeService);
  public textureService = inject(TextureService);
  public showDepthPopover = signal<boolean>(false);

  constructor() {
    // Re-sync 3D meshes when boxes, textures, selection, render mode, or texture transforms change
    effect(() => {
      const project = this.projectStore.project();
      const selectedId = this.projectStore.selectedBoxId();
      const isRender = this.projectStore.isRenderMode();
      this.textureService.textureUpdated();
      this.sceneService.onRenderModeChange(isRender);
      this.sceneService.updateBoxes(project.boxes, selectedId);
    });
  }

  ngOnInit(): void {
    this.sceneService.initialize(this.renderCanvas.nativeElement);
  }

  ngOnDestroy(): void {
    this.sceneService.destroy();
  }

  setPreset(preset: CameraPreset): void {
    this.sceneService.setCameraPreset(preset);
  }

  toggleCameraMode(): void {
    this.sceneService.toggleCameraMode();
  }

  setRenderMode(mode: ViewportMode): void {
    this.sceneService.setViewportMode(mode);
  }

  setGizmo(mode: GizmoMode): void {
    this.sceneService.setGizmoMode(mode);
  }

  toggleCage(): void {
    this.sceneService.toggleCage();
  }

  toggleGrid(): void {
    this.sceneService.toggleGrid();
  }

  toggleNodeHeight(): void {
    const current = this.projectStore.project()?.nodeHeight ?? 1;
    const next = current === 2 ? 1 : 2;
    this.projectStore.setNodeHeight(next);
  }

  resetCamera(): void {
    this.sceneService.resetCamera();
  }

  toggleTurntable(): void {
    this.sceneService.toggleTurntable();
  }

  onSkyChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as SceneSky;
    this.sceneService.setSceneSky(val);
  }

  onFloorChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as SceneFloor;
    this.sceneService.setSceneFloor(val);
  }

  captureScreenshot(resolution: ScreenshotResolution, transparent: boolean): void {
    this.sceneService.captureScreenshot({ resolution, transparent });
  }
}
