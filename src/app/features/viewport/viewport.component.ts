import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
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
  ScreenshotResolution
} from './services/babylon-scene.service';
import { ProjectStore } from '../../core/state/project.store';
import { TooltipDirective } from '../../shared/directives/tooltip.directive';
import { ThemeService } from '../../core/services/theme.service';
import { TextureService } from '../../core/services/texture.service';
import { TexturePainterService, PaintTool } from '../../core/services/texture-painter.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { NeighborConnectionState } from '../../core/models/nodebox.model';
import {
  LucideCamera,
  LucideChevronDown,
  LucidePalette,
  LucideMove,
  LucideSquare,
  LucideScaling,
  LucideRotateCw,
  LucidePaintbrush,
  LucideX,
  LucideCrosshair,
  LucideEye,
  LucideSun,
  LucideMoon,
  LucidePencil,
  LucideEraser,
  LucidePaintBucket,
  LucidePipette,
  LucideSparkles,
  LucideUndo,
  LucideRedo,
  LucideGrid3x3,
  LucideArrowUpDown,
  LucideBox
} from '@lucide/angular';

@Component({
  selector: 'app-viewport',
  standalone: true,
  imports: [
    CommonModule,
    TooltipDirective,
    TranslatePipe,
    LucideCamera,
    LucideChevronDown,
    LucidePalette,
    LucideMove,
    LucideSquare,
    LucideScaling,
    LucideRotateCw,
    LucidePaintbrush,
    LucideX,
    LucideCrosshair,
    LucideEye,
    LucideSun,
    LucideMoon,
    LucidePencil,
    LucideEraser,
    LucidePaintBucket,
    LucidePipette,
    LucideSparkles,
    LucideUndo,
    LucideRedo,
    LucideGrid3x3,
    LucideArrowUpDown,
    LucideBox
  ],
  template: `
    <div class="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col" style="contain: strict;">
      <!-- 3D Canvas with touch-none for gesture isolation -->
      <canvas #renderCanvas class="w-full h-full block outline-none cursor-grab active:cursor-grabbing touch-none"></canvas>

      <!-- Click-outside dismiss overlay for mobile menus -->
      @if (showMobileCameraMenu() || showMobileShadingMenu()) {
        <div (click)="closeMobileMenus()" class="fixed inset-0 z-20"></div>
      }

      <!-- ========================================== -->
      <!-- MOBILE VIEWPORT OVERLAY CONTROLS (< lg)    -->
      <!-- ========================================== -->
      @if (!projectStore.isRenderMode()) {
        <!-- Top Mobile Bar: Camera Preset (Left) & Shading/Helpers (Right) -->
        <div class="flex lg:hidden absolute top-2.5 left-2.5 right-2.5 justify-between items-center pointer-events-none z-20">
          <!-- Camera Presets Dropdown Pill -->
          <div class="relative pointer-events-auto">
            <button
              (click)="toggleMobileCameraMenu()"
              aria-label="Camera view presets"
              class="h-9 px-3 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-lg active:scale-95 transition">
              <svg lucideCamera class="w-3.5 h-3.5 text-slate-300"></svg>
              <span class="font-mono">{{ activeCameraPreset() | uppercase }}</span>
              <svg lucideChevronDown class="w-3 h-3 text-slate-400"></svg>
            </button>

            @if (showMobileCameraMenu()) {
              <div class="absolute top-11 left-0 w-44 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl p-1.5 z-30 flex flex-col gap-1 text-xs animate-sheet-up">
                <div class="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">{{ 'viewport.cameraAngles' | translate }}</div>
                @for (preset of [
                  { id: 'iso', name: ('viewport.iso' | translate) },
                  { id: 'top', name: ('viewport.top' | translate) },
                  { id: 'front', name: ('viewport.front' | translate) },
                  { id: 'back', name: ('viewport.back' | translate) },
                  { id: 'left', name: ('viewport.left' | translate) },
                  { id: 'right', name: ('viewport.right' | translate) }
                ]; track preset.id) {
                  <button
                    (click)="setPreset($any(preset.id))"
                    [class.bg-sky-600]="activeCameraPreset() === preset.id"
                    [class.text-white]="activeCameraPreset() === preset.id"
                    [class.text-slate-300]="activeCameraPreset() !== preset.id"
                    class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition font-medium">
                    {{ preset.name }}
                  </button>
                }
                <div class="h-px bg-slate-800 my-0.5"></div>
                <button
                  (click)="toggleCameraMode()"
                  class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition font-medium flex items-center justify-between">
                  <span>{{ 'viewport.projection' | translate }}</span>
                  <span class="font-mono text-sky-400 text-[11px] font-semibold">{{ sceneService.cameraMode() === 'orthographic' ? 'Ortho' : 'Persp' }}</span>
                </button>
              </div>
            }
          </div>

          <!-- Shading & Display Helpers Dropdown Pill -->
          <div class="relative pointer-events-auto">
            <button
              (click)="toggleMobileShadingMenu()"
              [attr.aria-label]="'viewport.shading' | translate"
              class="h-9 px-3 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-lg active:scale-95 transition">
              <svg lucidePalette class="w-3.5 h-3.5 text-slate-300"></svg>
              <span>{{ sceneService.viewportMode() | titlecase }}</span>
              <svg lucideChevronDown class="w-3 h-3 text-slate-400"></svg>
            </button>

            @if (showMobileShadingMenu()) {
              <div class="absolute top-11 right-0 w-48 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl p-2 z-30 flex flex-col gap-1.5 text-xs animate-sheet-up">
                <div class="text-[10px] font-semibold text-slate-400 px-1 uppercase tracking-wider">{{ 'viewport.shading' | translate }}</div>
                <div class="grid grid-cols-3 gap-1">
                  <button
                    (click)="setRenderMode('textured'); closeMobileMenus()"
                    [class.bg-sky-600]="sceneService.viewportMode() === 'textured'"
                    [class.text-white]="sceneService.viewportMode() === 'textured'"
                    class="py-1.5 rounded bg-slate-800 text-slate-300 text-center font-medium">
                    Tex
                  </button>
                  <button
                    (click)="setRenderMode('colored'); closeMobileMenus()"
                    [class.bg-sky-600]="sceneService.viewportMode() === 'colored'"
                    [class.text-white]="sceneService.viewportMode() === 'colored'"
                    class="py-1.5 rounded bg-slate-800 text-slate-300 text-center font-medium">
                    Solid
                  </button>
                  <button
                    (click)="setRenderMode('wireframe'); closeMobileMenus()"
                    [class.bg-sky-600]="sceneService.viewportMode() === 'wireframe'"
                    [class.text-white]="sceneService.viewportMode() === 'wireframe'"
                    class="py-1.5 rounded bg-slate-800 text-slate-300 text-center font-medium">
                    Wire
                  </button>
                </div>

                <div class="h-px bg-slate-800 my-0.5"></div>
                <div class="text-[10px] font-semibold text-slate-400 px-1 uppercase tracking-wider">{{ 'viewport.tools' | translate }}</div>
                <div class="flex items-center justify-between px-1">
                  <span class="text-slate-300">{{ 'viewport.grid' | translate }}</span>
                  <button
                    (click)="toggleGrid()"
                    [class.text-sky-400]="sceneService.showGrid()"
                    [class.text-slate-500]="!sceneService.showGrid()"
                    class="font-semibold text-xs px-2 py-0.5 rounded bg-slate-800">
                    {{ sceneService.showGrid() ? 'ON' : 'OFF' }}
                  </button>
                </div>
                <div class="flex items-center justify-between px-1">
                  <span class="text-slate-300">{{ 'viewport.cage' | translate }}</span>
                  <button
                    (click)="toggleCage()"
                    [class.text-sky-400]="sceneService.showCage()"
                    [class.text-slate-500]="!sceneService.showCage()"
                    class="font-semibold text-xs px-2 py-0.5 rounded bg-slate-800">
                    {{ sceneService.showCage() ? 'ON' : 'OFF' }}
                  </button>
                </div>
                <div class="flex items-center justify-between px-1">
                  <span class="text-slate-300">{{ 'header.height' | translate }}</span>
                  <button
                    (click)="toggleNodeHeight()"
                    class="font-semibold text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {{ projectStore.project().nodeHeight === 2 ? '2 Nodes' : '1 Node' }}
                  </button>
                </div>
                <div class="flex items-center justify-between px-1">
                  <span class="text-slate-300">{{ 'renderStudio.floor' | translate }}</span>
                  <select
                    [value]="sceneService.sceneFloor()"
                    (change)="onFloorChange($event)"
                    [attr.aria-label]="'renderStudio.floor' | translate"
                    class="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1 py-0.5 text-xs focus:outline-none cursor-pointer max-w-[95px] truncate">
                    <option value="none">None</option>
                    <option value="grid">Grid</option>
                    <option value="grass">Grass</option>
                    <option value="stone">Stone</option>
                    <option value="wood">Wood</option>
                    <option value="cobble">Cobble</option>
                    <option value="brick">Brick</option>
                    <option value="dirt">Dirt</option>
                    <option value="glass">Glass</option>
                    <option value="steel">Steel</option>
                    <option value="mese">Mese</option>
                    @for (tex of customFloorTextures(); track tex.id) {
                      <option [value]="tex.id">{{ tex.name }}</option>
                    }
                  </select>
                </div>

                <div class="h-px bg-slate-800 my-0.5"></div>
                <button
                  (click)="resetCamera(); closeMobileMenus()"
                  class="w-full text-center py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition">
                  {{ 'viewport.resetView' | translate }}
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Right Vertical Thumb Tool Rail (Gizmo Modes) -->
        <div class="flex lg:hidden absolute top-1/2 -translate-y-1/2 right-2.5 flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-2xl shadow-2xl z-20">
          <button
            (click)="setGizmo('position')"
            [class.bg-emerald-600]="sceneService.gizmoMode() === 'position'"
            [class.text-white]="sceneService.gizmoMode() === 'position'"
            [class.text-slate-400]="sceneService.gizmoMode() !== 'position'"
            [attr.aria-label]="'viewport.move' | translate"
            class="w-10 h-10 rounded-xl flex items-center justify-center transition active:scale-90"
            [title]="'viewport.move' | translate">
            <svg lucideMove class="w-4 h-4"></svg>
          </button>
          <button
            (click)="setGizmo('resize')"
            [class.bg-emerald-600]="sceneService.gizmoMode() === 'resize'"
            [class.text-white]="sceneService.gizmoMode() === 'resize'"
            [class.text-slate-400]="sceneService.gizmoMode() !== 'resize'"
            [attr.aria-label]="'viewport.resize' | translate"
            class="w-10 h-10 rounded-xl flex items-center justify-center transition active:scale-90"
            [title]="'viewport.resize' | translate">
            <svg lucideSquare class="w-4 h-4"></svg>
          </button>
          <button
            (click)="setGizmo('scale')"
            [class.bg-emerald-600]="sceneService.gizmoMode() === 'scale'"
            [class.text-white]="sceneService.gizmoMode() === 'scale'"
            [class.text-slate-400]="sceneService.gizmoMode() !== 'scale'"
            [attr.aria-label]="'viewport.scale' | translate"
            class="w-10 h-10 rounded-xl flex items-center justify-center transition active:scale-90"
            [title]="'viewport.scale' | translate">
            <svg lucideScaling class="w-4 h-4"></svg>
          </button>
          <button
            (click)="setGizmo('rotation')"
            [class.bg-emerald-600]="sceneService.gizmoMode() === 'rotation'"
            [class.text-white]="sceneService.gizmoMode() === 'rotation'"
            [class.text-slate-400]="sceneService.gizmoMode() !== 'rotation'"
            [attr.aria-label]="'viewport.rotate' | translate"
            class="w-10 h-10 rounded-xl flex items-center justify-center transition active:scale-90"
            [title]="'viewport.rotate' | translate">
            <svg lucideRotateCw class="w-4 h-4"></svg>
          </button>
          <button
            (click)="setGizmo('paint')"
            [class.bg-sky-600]="sceneService.gizmoMode() === 'paint'"
            [class.text-white]="sceneService.gizmoMode() === 'paint'"
            [class.text-slate-400]="sceneService.gizmoMode() !== 'paint'"
            [attr.aria-label]="'viewport.paint' | translate"
            class="w-10 h-10 rounded-xl flex items-center justify-center transition active:scale-90"
            [title]="'viewport.paint' | translate">
            <svg lucidePaintbrush class="w-4 h-4"></svg>
          </button>
          <button
            (click)="setGizmo('none')"
            [class.bg-slate-700]="sceneService.gizmoMode() === 'none'"
            [class.text-white]="sceneService.gizmoMode() === 'none'"
            [class.text-slate-500]="sceneService.gizmoMode() !== 'none'"
            [attr.aria-label]="'viewport.selectOff' | translate"
            class="w-10 h-10 rounded-xl flex items-center justify-center transition active:scale-90"
            [title]="'viewport.selectOff' | translate">
            <svg lucideX class="w-4 h-4"></svg>
          </button>
          <div class="w-full h-px bg-slate-800 my-0.5"></div>
          <button
            (click)="resetCamera()"
            [attr.aria-label]="'viewport.resetView' | translate"
            class="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition active:scale-90"
            [title]="'viewport.resetView' | translate">
            <svg lucideCrosshair class="w-4 h-4"></svg>
          </button>
        </div>
      }

      <!-- ========================================== -->
      <!-- DESKTOP VIEWPORT OVERLAY CONTROLS (>= lg)  -->
      <!-- ========================================== -->
      @if (!projectStore.isRenderMode()) {
        <div class="hidden lg:flex absolute top-3 left-3 flex-wrap items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 p-1.5 rounded-lg shadow-xl text-xs z-10">
          <!-- Camera View Presets -->
          <div class="flex items-center space-x-1 border-r border-slate-700/80 pr-2 mr-1">
            <button
              (click)="setPreset('iso')"
              [appTooltip]="'viewport.iso' | translate"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
              Iso
            </button>
            <button
              (click)="setPreset('top')"
              [appTooltip]="'viewport.top' | translate"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
              Top
            </button>
            <button
              (click)="setPreset('front')"
              [appTooltip]="'viewport.front' | translate"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
              Front
            </button>
            <button
              (click)="setPreset('back')"
              [appTooltip]="'viewport.back' | translate"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
              Back
            </button>
            <button
              (click)="setPreset('left')"
              [appTooltip]="'viewport.left' | translate"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
              Left
            </button>
            <button
              (click)="setPreset('right')"
              [appTooltip]="'viewport.right' | translate"
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
              [appTooltip]="'viewport.projection' | translate"
              [appTooltipShortcutId]="'view_ortho'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition font-mono font-medium">
              {{ sceneService.cameraMode() === 'orthographic' ? 'Ortho' : 'Persp' }}
            </button>
          </div>

          <!-- Render Shading Modes -->
          <div class="flex items-center space-x-1 border-r border-slate-700/80 pr-2 mr-1">
            <button
              (click)="setRenderMode('textured')"
              [appTooltip]="'viewport.textures' | translate"
              [class.bg-sky-600]="sceneService.viewportMode() === 'textured'"
              [class.text-white]="sceneService.viewportMode() === 'textured'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
              Textures
            </button>
            <button
              (click)="setRenderMode('colored')"
              [appTooltip]="'viewport.solid' | translate"
              [class.bg-sky-600]="sceneService.viewportMode() === 'colored'"
              [class.text-white]="sceneService.viewportMode() === 'colored'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
              Solid
            </button>
            <button
              (click)="setRenderMode('wireframe')"
              [appTooltip]="'viewport.wire' | translate"
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
              [appTooltip]="'viewport.move' | translate"
              [appTooltipShortcutId]="'tool_move'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
              Move
            </button>
            <button
              (click)="setGizmo('resize')"
              [class.bg-emerald-600]="sceneService.gizmoMode() === 'resize'"
              [class.text-white]="sceneService.gizmoMode() === 'resize'"
              [appTooltip]="'viewport.resize' | translate"
              [appTooltipShortcutId]="'tool_resize'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
              Resize
            </button>
            <button
              (click)="setGizmo('scale')"
              [class.bg-emerald-600]="sceneService.gizmoMode() === 'scale'"
              [class.text-white]="sceneService.gizmoMode() === 'scale'"
              [appTooltip]="'viewport.scale' | translate"
              [appTooltipShortcutId]="'tool_scale'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
              Scale
            </button>
            <button
              (click)="setGizmo('rotation')"
              [class.bg-emerald-600]="sceneService.gizmoMode() === 'rotation'"
              [class.text-white]="sceneService.gizmoMode() === 'rotation'"
              [appTooltip]="'viewport.rotate' | translate"
              [appTooltipShortcutId]="'tool_rotate'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
              Rotate
            </button>
            <button
              (click)="setGizmo('paint')"
              [class.bg-sky-600]="sceneService.gizmoMode() === 'paint'"
              [class.text-white]="sceneService.gizmoMode() === 'paint'"
              [appTooltip]="'viewport.paint' | translate"
              [appTooltipShortcutId]="'tool_paint'"
              class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition flex items-center gap-1">
              <svg lucidePaintbrush class="w-3.5 h-3.5"></svg>
              <span>Paint</span>
            </button>
            <button
              (click)="setGizmo('none')"
              [class.bg-slate-700]="sceneService.gizmoMode() === 'none'"
              [appTooltip]="'viewport.selectOff' | translate"
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
            [appTooltip]="'viewport.cage' | translate"
            [appTooltipShortcutId]="'view_cage'"
            class="px-2 py-1 rounded hover:bg-slate-800 transition flex items-center gap-1">
            Cage
          </button>
          <button
            (click)="toggleGrid()"
            [class.text-sky-400]="sceneService.showGrid()"
            [class.text-slate-500]="!sceneService.showGrid()"
            [appTooltip]="'viewport.grid' | translate"
            [appTooltipShortcutId]="'view_grid'"
            class="px-2 py-1 rounded hover:bg-slate-800 transition flex items-center gap-1">
            Grid
          </button>
          <button
            (click)="toggleNodeHeight()"
            [appTooltip]="(projectStore.project().nodeHeight === 2 ? 'viewport.height1' : 'viewport.height2') | translate"
            [class.bg-sky-600]="projectStore.project().nodeHeight === 2"
            [class.text-white]="projectStore.project().nodeHeight === 2"
            [class.text-slate-300]="projectStore.project().nodeHeight !== 2"
            class="px-2 py-1 rounded hover:bg-slate-800 transition font-mono font-medium flex items-center gap-1 text-[11px]">
            <svg lucideArrowUpDown class="w-3 h-3"></svg>
            <span>{{ projectStore.project().nodeHeight === 2 ? '2 Nodes' : '1 Node' }}</span>
          </button>
          <button
            (click)="resetCamera()"
            [appTooltip]="'viewport.resetView' | translate"
            [appTooltipShortcutId]="'view_reset'"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition">
            {{ 'viewport.resetView' | translate }}
          </button>
        </div>
      }

      <!-- Distraction-Free Render Mode Floating HUD -->
      @if (projectStore.isRenderMode()) {
        <div
          role="toolbar"
          [attr.aria-label]="'renderStudio.badge' | translate"
          class="absolute top-4 left-1/2 -translate-x-1/2 flex flex-wrap items-center gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-xl shadow-2xl text-xs z-30">
          <!-- Render Mode Badge -->
          <div class="flex items-center gap-1.5 border-r border-slate-700/80 pr-2.5 text-amber-400 font-semibold tracking-wide uppercase text-[10px]">
            <svg lucideEye class="w-3.5 h-3.5 animate-pulse"></svg>
            {{ 'renderStudio.badge' | translate }}
          </div>

          <!-- Sky & Atmosphere Popover Trigger -->
          <div class="relative border-r border-slate-700/80 pr-2">
            <button
              type="button"
              (click)="toggleSkyPopover()"
              [attr.aria-expanded]="showSkyPopover()"
              aria-haspopup="dialog"
              [attr.aria-label]="'renderStudio.skyTitle' | translate"
              [class.bg-sky-600]="sceneService.sceneSky() !== 'studio'"
              [class.text-white]="sceneService.sceneSky() !== 'studio'"
              [class.bg-slate-800]="sceneService.sceneSky() === 'studio'"
              [class.text-slate-300]="sceneService.sceneSky() === 'studio'"
              [title]="'renderStudio.skyTitle' | translate"
              class="px-2.5 py-1 rounded hover:bg-slate-700 transition flex items-center gap-1.5 border border-slate-700 font-medium">
              <svg lucideSun class="w-3.5 h-3.5 text-amber-400"></svg>
              <span>{{ 'renderStudio.sky' | translate }}</span>
              <span class="text-[9px] px-1 py-0.2 rounded font-mono uppercase bg-slate-950/60 text-sky-400">
                {{ skyPresetBadge() }}
              </span>
            </button>

            @if (showSkyPopover()) {
              <!-- Click-outside backdrop -->
              <div class="fixed inset-0 z-40" (click)="showSkyPopover.set(false)"></div>

              <div
                role="dialog"
                [attr.aria-label]="'renderStudio.skyTitle' | translate"
                class="absolute top-full mt-2 left-0 w-72 bg-slate-900 border border-slate-700/90 rounded-xl p-3 shadow-2xl z-50 text-xs space-y-3 backdrop-blur-md">
                <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span class="font-semibold text-slate-200">{{ 'renderStudio.skyTitle' | translate }}</span>
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-sky-400 uppercase">{{ skyPresetBadge() }}</span>
                    <button
                      type="button"
                      (click)="resetSkyDefaults()"
                      class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
                      {{ 'common.reset' | translate }}
                    </button>
                  </div>
                </div>

                <!-- Preset Selector Grid -->
                <div class="space-y-1.5">
                  <div class="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">{{ 'renderStudio.envPreset' | translate }}</div>
                  <div class="grid grid-cols-4 gap-1">
                    @for (preset of [
                      { id: 'studio', label: ('renderStudio.presetStudio' | translate) },
                      { id: 'minetest_day', label: ('renderStudio.presetDay' | translate) },
                      { id: 'minetest_sunset', label: ('renderStudio.presetSunset' | translate) },
                      { id: 'minetest_night', label: ('renderStudio.presetNight' | translate) }
                    ]; track preset.id) {
                      <button
                        type="button"
                        (click)="sceneService.setSceneSky($any(preset.id))"
                        [attr.aria-pressed]="sceneService.sceneSky() === preset.id"
                        [class.bg-sky-600]="sceneService.sceneSky() === preset.id"
                        [class.text-white]="sceneService.sceneSky() === preset.id"
                        [class.bg-slate-800]="sceneService.sceneSky() !== preset.id"
                        [class.text-slate-400]="sceneService.sceneSky() !== preset.id"
                        class="py-1 rounded text-center font-medium transition hover:bg-slate-700 truncate px-1">
                        {{ preset.label }}
                      </button>
                    }
                  </div>
                </div>

                <!-- Sun Elevation Slider -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-slate-300">{{ 'renderStudio.sunElevation' | translate }}</span>
                    <span class="font-mono text-sky-400">{{ sceneService.skyAtmosphere().sunElevation }}°</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="85"
                    step="1"
                    [attr.aria-label]="'renderStudio.sunElevation' | translate"
                    [value]="sceneService.skyAtmosphere().sunElevation"
                    (input)="onSunElevationInput($event)"
                    class="w-full accent-sky-500 cursor-pointer" />
                </div>

                <!-- Sun Azimuth Slider -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-slate-300">{{ 'renderStudio.sunAzimuth' | translate }}</span>
                    <span class="font-mono text-sky-400">{{ sceneService.skyAtmosphere().sunAzimuth }}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    [attr.aria-label]="'renderStudio.sunAzimuth' | translate"
                    [value]="sceneService.skyAtmosphere().sunAzimuth"
                    (input)="onSunAzimuthInput($event)"
                    class="w-full accent-sky-500 cursor-pointer" />
                </div>

                <!-- Atmospheric Haze (Turbidity) Slider -->
                @if (sceneService.sceneSky() === 'minetest_day' || sceneService.sceneSky() === 'minetest_sunset') {
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="text-slate-300">{{ 'renderStudio.atmosphericHaze' | translate }}</span>
                      <span class="font-mono text-sky-400">{{ sceneService.skyAtmosphere().turbidity }}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="0.5"
                      [attr.aria-label]="'renderStudio.atmosphericHaze' | translate"
                      [value]="sceneService.skyAtmosphere().turbidity"
                      (input)="onTurbidityInput($event)"
                      class="w-full accent-sky-500 cursor-pointer" />
                  </div>
                }

                <!-- Atmosphere Feature Toggles -->
                <div class="pt-1.5 border-t border-slate-800 space-y-1.5">
                  <div class="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">{{ 'renderStudio.atmosphereEffects' | translate }}</div>
                  <label class="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      [checked]="sceneService.skyAtmosphere().cloudsEnabled"
                      (change)="sceneService.setSkyAtmosphere({ cloudsEnabled: !sceneService.skyAtmosphere().cloudsEnabled })"
                      class="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0 cursor-pointer" />
                    <span>{{ 'renderStudio.voxelClouds' | translate }}</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      [checked]="sceneService.skyAtmosphere().horizonFog"
                      (change)="sceneService.setSkyAtmosphere({ horizonFog: !sceneService.skyAtmosphere().horizonFog })"
                      class="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0 cursor-pointer" />
                    <span>{{ 'renderStudio.horizonFog' | translate }}</span>
                  </label>
                </div>
              </div>
            }
          </div>

          <!-- Floor Platform Selector -->
          <div class="flex items-center gap-1 border-r border-slate-700/80 pr-2">
            <span class="text-slate-400 text-[11px]">{{ 'renderStudio.floor' | translate }}:</span>
            <select
              [value]="sceneService.sceneFloor()"
              (change)="onFloorChange($event)"
              [attr.aria-label]="'renderStudio.floor' | translate"
              class="bg-slate-800 text-slate-200 border border-slate-700 rounded px-1.5 py-1 text-xs focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[160px] truncate">
              <optgroup label="Environment">
                <option value="none">None (Void)</option>
                <option value="grid">Studio Grid</option>
              </optgroup>
              <optgroup label="Default Textures">
                <option value="grass">Grass</option>
                <option value="stone">Smooth Stone</option>
                <option value="wood">Wood Planks</option>
                <option value="cobble">Cobblestone</option>
                <option value="brick">Clay Brick</option>
                <option value="dirt">Dirt</option>
                <option value="glass">Glass</option>
                <option value="steel">Steel Block</option>
                <option value="mese">Mese Block</option>
              </optgroup>
              @if (customFloorTextures().length > 0) {
                <optgroup label="Custom Textures">
                  @for (tex of customFloorTextures(); track tex.id) {
                    <option [value]="tex.id">{{ tex.name }}</option>
                  }
                </optgroup>
              }
            </select>
          </div>

          <!-- Pixel Art Depth & Relief Popover Trigger -->
          <div class="relative border-r border-slate-700/80 pr-2">
            <button
              type="button"
              (click)="toggleDepthPopover()"
              [attr.aria-expanded]="showDepthPopover()"
              aria-haspopup="dialog"
              [attr.aria-label]="'renderStudio.depthTitle' | translate"
              [class.bg-sky-600]="sceneService.pixelDepth().enabled"
              [class.text-white]="sceneService.pixelDepth().enabled"
              [class.bg-slate-800]="!sceneService.pixelDepth().enabled"
              [class.text-slate-300]="!sceneService.pixelDepth().enabled"
              [title]="'viewport.pixelDepth' | translate"
              class="px-2.5 py-1 rounded hover:bg-slate-700 transition flex items-center gap-1.5 border border-slate-700 font-medium">
              <svg lucideBox class="w-3.5 h-3.5 text-amber-400"></svg>
              <span>{{ 'renderStudio.depth3d' | translate }}</span>
              <span class="text-[9px] px-1 py-0.2 rounded font-mono uppercase bg-slate-950/60 text-sky-400">
                {{ sceneService.pixelDepth().enabled ? sceneService.pixelDepth().intensity : 'off' }}
              </span>
            </button>

            <!-- Depth Popover Dialog -->
            @if (showDepthPopover()) {
              <!-- Click-outside backdrop -->
              <div class="fixed inset-0 z-40" (click)="showDepthPopover.set(false)"></div>

              <div
                role="dialog"
                [attr.aria-label]="'renderStudio.depthTitle' | translate"
                class="absolute top-full mt-2 left-0 w-72 bg-slate-900 border border-slate-700/90 rounded-xl p-3 shadow-2xl z-50 text-xs space-y-3 backdrop-blur-md">
                <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span class="font-semibold text-slate-200">{{ 'renderStudio.depthTitle' | translate }}</span>
                  <div class="flex items-center gap-2">
                    <label class="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        [checked]="sceneService.pixelDepth().enabled"
                        (change)="sceneService.setPixelDepth({ enabled: !sceneService.pixelDepth().enabled })"
                        class="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0 cursor-pointer" />
                      <span class="text-[11px] text-slate-300 font-medium">{{ 'renderStudio.enabled' | translate }}</span>
                    </label>
                    <button
                      type="button"
                      (click)="resetDepthDefaults()"
                      class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
                      {{ 'common.reset' | translate }}
                    </button>
                  </div>
                </div>

                <!-- Individual Style Checkboxes + Per-Style Intensity Sliders -->
                <div class="space-y-2.5">
                  <div class="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">{{ 'renderStudio.depthStyles' | translate }}</div>

                  <!-- 1. Pixel Bevel (Mosaic) -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <label class="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          [checked]="sceneService.pixelDepth().pixelBevel"
                          (change)="sceneService.setPixelDepth({ pixelBevel: !sceneService.pixelDepth().pixelBevel })"
                          class="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0 cursor-pointer" />
                        <span>{{ 'renderStudio.pixelBevel' | translate }}</span>
                      </label>
                      @if (sceneService.pixelDepth().pixelBevel) {
                        <span class="font-mono text-[11px] text-sky-400">{{ sceneService.pixelDepth().bevelIntensity ?? 20 }}%</span>
                      }
                    </div>
                    @if (sceneService.pixelDepth().pixelBevel) {
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="1"
                        [attr.aria-label]="'renderStudio.pixelBevel' | translate"
                        [value]="sceneService.pixelDepth().bevelIntensity ?? 20"
                        (input)="onDepthStyleIntensityInput('bevelIntensity', $event)"
                        class="w-full accent-sky-500 cursor-pointer" />
                    }
                  </div>

                  <!-- 2. Luminance Relief -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <label class="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          [checked]="sceneService.pixelDepth().luminanceRelief"
                          (change)="sceneService.setPixelDepth({ luminanceRelief: !sceneService.pixelDepth().luminanceRelief })"
                          class="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0 cursor-pointer" />
                        <span>{{ 'renderStudio.luminanceRelief' | translate }}</span>
                      </label>
                      @if (sceneService.pixelDepth().luminanceRelief) {
                        <span class="font-mono text-[11px] text-sky-400">{{ sceneService.pixelDepth().reliefIntensity ?? 20 }}%</span>
                      }
                    </div>
                    @if (sceneService.pixelDepth().luminanceRelief) {
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="1"
                        [attr.aria-label]="'renderStudio.luminanceRelief' | translate"
                        [value]="sceneService.pixelDepth().reliefIntensity ?? 20"
                        (input)="onDepthStyleIntensityInput('reliefIntensity', $event)"
                        class="w-full accent-sky-500 cursor-pointer" />
                    }
                  </div>

                  <!-- 3. 3D Pixel Extrusion (Voxel) -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <label class="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          [checked]="sceneService.pixelDepth().extrudePixels"
                          (change)="sceneService.setPixelDepth({ extrudePixels: !sceneService.pixelDepth().extrudePixels })"
                          class="rounded bg-slate-800 border-slate-700 text-sky-600 focus:ring-0 cursor-pointer" />
                        <span>{{ 'renderStudio.pixelExtrusion' | translate }}</span>
                      </label>
                      @if (sceneService.pixelDepth().extrudePixels) {
                        <span class="font-mono text-[11px] text-sky-400">{{ sceneService.pixelDepth().extrusionIntensity ?? 20 }}%</span>
                      }
                    </div>
                    @if (sceneService.pixelDepth().extrudePixels) {
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="1"
                        [attr.aria-label]="'renderStudio.pixelExtrusion' | translate"
                        [value]="sceneService.pixelDepth().extrusionIntensity ?? 20"
                        (input)="onDepthStyleIntensityInput('extrusionIntensity', $event)"
                        class="w-full accent-sky-500 cursor-pointer" />
                    }
                  </div>
                </div>

                <!-- Quick Intensity Presets -->
                <div class="space-y-1.5 pt-1 border-t border-slate-800">
                  <div class="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">{{ 'renderStudio.quickIntensity' | translate }}</div>
                  <div class="grid grid-cols-3 gap-1">
                    @for (lvl of [
                      { id: 'subtle', label: ('renderStudio.subtle' | translate) },
                      { id: 'medium', label: ('renderStudio.medium' | translate) },
                      { id: 'deep', label: ('renderStudio.deep' | translate) }
                    ]; track lvl.id) {
                      <button
                        type="button"
                        (click)="sceneService.setPixelDepth({ intensity: $any(lvl.id) })"
                        [attr.aria-pressed]="sceneService.pixelDepth().intensity === lvl.id"
                        [class.bg-sky-600]="sceneService.pixelDepth().intensity === lvl.id"
                        [class.text-white]="sceneService.pixelDepth().intensity === lvl.id"
                        [class.bg-slate-800]="sceneService.pixelDepth().intensity !== lvl.id"
                        [class.text-slate-400]="sceneService.pixelDepth().intensity !== lvl.id"
                        class="py-1 rounded text-center capitalize font-medium transition hover:bg-slate-700">
                        {{ lvl.label }}
                      </button>
                    }
                  </div>
                </div>

                <!-- Presets -->
                <div class="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span class="text-slate-500">{{ 'renderStudio.presets' | translate }}:</span>
                  <div class="flex gap-1">
                    <button
                      type="button"
                      (click)="sceneService.setPixelDepth({ enabled: true, pixelBevel: true, luminanceRelief: false, extrudePixels: false })"
                      class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">{{ 'renderStudio.presetMosaic' | translate }}</button>
                    <button
                      type="button"
                      (click)="sceneService.setPixelDepth({ enabled: true, pixelBevel: false, luminanceRelief: true, extrudePixels: false })"
                      class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">{{ 'renderStudio.presetRelief' | translate }}</button>
                    <button
                      type="button"
                      (click)="sceneService.setPixelDepth({ enabled: true, pixelBevel: true, luminanceRelief: true, extrudePixels: true })"
                      class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">{{ 'renderStudio.presetFull3d' | translate }}</button>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Turntable Auto-Rotation Button -->
          <button
            type="button"
            (click)="toggleTurntable()"
            [attr.aria-pressed]="sceneService.isTurntableActive()"
            [class.bg-amber-600]="sceneService.isTurntableActive()"
            [class.text-white]="sceneService.isTurntableActive()"
            class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1">
            <svg lucideRotateCw class="w-3.5 h-3.5" [class.animate-spin]="sceneService.isTurntableActive()"></svg>
            <span>{{ 'renderStudio.turntable' | translate }}</span>
          </button>

          <!-- Screenshot Capture Studio -->
          <div class="flex items-center gap-1 border-r border-slate-700/80 pr-2">
            <button
              type="button"
              (click)="captureScreenshot('1080p', false)"
              title="Download 1080p Screenshot"
              class="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium transition flex items-center gap-1">
              <svg lucideCamera class="w-3.5 h-3.5"></svg>
              <span>1080p</span>
            </button>

            <button
              type="button"
              (click)="captureScreenshot('4k', false)"
              title="Download 4K Ultra-HD Screenshot"
              class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
              4K
            </button>

            <button
              type="button"
              (click)="captureScreenshot('icon', true)"
              title="Download 512x512 Transparent Icon (Ideal for inventory/textures)"
              class="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition flex items-center gap-1">
              <span>{{ 'renderStudio.icon' | translate }}</span>
            </button>
          </div>

          <!-- Theme Toggle (Render Mode) -->
          <button
            type="button"
            (click)="themeService.toggleTheme()"
            [attr.aria-label]="'header.themeToggle' | translate"
            [title]="'header.themeToggle' | translate"
            class="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            @if (themeService.theme() === 'dark') {
              <svg lucideSun class="w-4 h-4 text-amber-400"></svg>
            } @else {
              <svg lucideMoon class="w-4 h-4 text-sky-400"></svg>
            }
          </button>

          <!-- Exit Render Mode Button -->
          <button
            type="button"
            (click)="projectStore.toggleRenderMode(false)"
            [title]="'renderStudio.exit' | translate"
            class="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white font-medium transition flex items-center gap-1">
            <svg lucideX class="w-3.5 h-3.5"></svg>
            <span>{{ 'renderStudio.exit' | translate }}</span>
          </button>
        </div>
      }

      <!-- Luanti Orientation / Axis Indicator Badge (Hidden on very narrow mobile screens) -->
      @if (!projectStore.isRenderMode()) {
        <div class="hidden sm:flex absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 px-2.5 py-1.5 rounded text-[11px] text-slate-300 pointer-events-none items-center gap-3">
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-red-500"></span> +X East
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-green-500"></span> +Y Up
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span> +Z North
          </span>
        </div>

        <!-- Quick Navigation Hint (Hidden on mobile) -->
        <div class="hidden md:block absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 px-2.5 py-1.5 rounded text-[11px] text-slate-400 pointer-events-none">
          Left Drag: Orbit | Right Drag: Pan | Wheel: Zoom | Click: Select Box
        </div>
      }

      <!-- Active Face Resize Status Badge (Hidden in Render Mode) -->
      @if (!projectStore.isRenderMode() && sceneService.gizmoMode() === 'resize' && sceneService.activeFace()) {
        <div class="absolute bottom-14 lg:bottom-12 left-1/2 -translate-x-1/2 bg-sky-950/90 text-sky-200 border border-sky-500/70 px-4 py-1.5 rounded-full text-xs font-medium shadow-2xl flex items-center gap-2 pointer-events-none backdrop-blur-md z-10">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Resizing Face: <strong class="text-white capitalize">{{ sceneService.activeFace() }}</strong></span>
          <span class="text-sky-300 font-mono text-[11px] font-semibold">({{ sceneService.getFaceAxisName(sceneService.activeFace()!) }})</span>
        </div>
      }

      <!-- ========================================== -->
      <!-- FLOATING 3D PAINT STUDIO BAR (Phone & Desktop) -->
      <!-- ========================================== -->
      @if (!projectStore.isRenderMode() && sceneService.gizmoMode() === 'paint') {
        <div
          role="toolbar"
          [attr.aria-label]="'viewport.paint' | translate"
          class="absolute bottom-3 lg:bottom-12 left-1/2 -translate-x-1/2 max-w-[96vw] bg-slate-900/95 backdrop-blur-md border border-sky-500/50 px-2.5 py-1.5 rounded-2xl shadow-2xl flex items-center gap-1.5 text-xs z-20 pointer-events-auto overflow-x-auto">
          <!-- Paint Tools -->
          <div class="flex items-center gap-1 pr-1.5 border-r border-slate-700/80">
            <button
              type="button"
              (click)="setPaintTool('pencil')"
              [class.bg-sky-600]="painterService.activeTool() === 'pencil'"
              [class.text-white]="painterService.activeTool() === 'pencil'"
              [class.text-slate-300]="painterService.activeTool() !== 'pencil'"
              [attr.aria-pressed]="painterService.activeTool() === 'pencil'"
              [attr.aria-label]="'textureStudio.toolPencil' | translate"
              [appTooltip]="'textureStudio.toolPencil' | translate"
              appTooltipPlacement="top"
              class="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center transition flex-shrink-0">
              <svg lucidePencil class="w-4 h-4"></svg>
            </button>
            <button
              type="button"
              (click)="setPaintTool('eraser')"
              [class.bg-sky-600]="painterService.activeTool() === 'eraser'"
              [class.text-white]="painterService.activeTool() === 'eraser'"
              [class.text-slate-300]="painterService.activeTool() !== 'eraser'"
              [attr.aria-pressed]="painterService.activeTool() === 'eraser'"
              [attr.aria-label]="'textureStudio.toolEraser' | translate"
              [appTooltip]="'textureStudio.toolEraser' | translate"
              appTooltipPlacement="top"
              class="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center transition flex-shrink-0">
              <svg lucideEraser class="w-4 h-4"></svg>
            </button>
            <button
              type="button"
              (click)="setPaintTool('fill')"
              [class.bg-sky-600]="painterService.activeTool() === 'fill'"
              [class.text-white]="painterService.activeTool() === 'fill'"
              [class.text-slate-300]="painterService.activeTool() !== 'fill'"
              [attr.aria-pressed]="painterService.activeTool() === 'fill'"
              [attr.aria-label]="'textureStudio.toolFill' | translate"
              [appTooltip]="'textureStudio.toolFill' | translate"
              appTooltipPlacement="top"
              class="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center transition flex-shrink-0">
              <svg lucidePaintBucket class="w-4 h-4"></svg>
            </button>
            <button
              type="button"
              (click)="setPaintTool('eyedropper')"
              [class.bg-sky-600]="painterService.activeTool() === 'eyedropper'"
              [class.text-white]="painterService.activeTool() === 'eyedropper'"
              [class.text-slate-300]="painterService.activeTool() !== 'eyedropper'"
              [attr.aria-pressed]="painterService.activeTool() === 'eyedropper'"
              [attr.aria-label]="'textureStudio.toolEyedropper' | translate"
              [appTooltip]="'textureStudio.toolEyedropper' | translate"
              appTooltipPlacement="top"
              class="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center transition flex-shrink-0">
              <svg lucidePipette class="w-4 h-4"></svg>
            </button>
            <button
              type="button"
              (click)="setPaintTool('noise')"
              [class.bg-sky-600]="painterService.activeTool() === 'noise'"
              [class.text-white]="painterService.activeTool() === 'noise'"
              [class.text-slate-300]="painterService.activeTool() !== 'noise'"
              [attr.aria-pressed]="painterService.activeTool() === 'noise'"
              [attr.aria-label]="'textureStudio.toolNoise' | translate"
              [appTooltip]="'textureStudio.toolNoise' | translate"
              appTooltipPlacement="top"
              class="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center transition flex-shrink-0">
              <svg lucideSparkles class="w-4 h-4"></svg>
            </button>
          </div>

          <!-- Active Color Picker + Brush Size -->
          <div class="flex items-center gap-1.5 pr-1.5 border-r border-slate-700/80">
            <label
              [appTooltip]="'textureStudio.primaryColor' | translate"
              appTooltipPlacement="top"
              class="relative w-7 h-7 rounded-lg border-2 border-slate-600 hover:border-white overflow-hidden cursor-pointer flex-shrink-0 shadow-inner"
              [style.background-color]="painterService.primaryColor()">
              <input
                type="color"
                [value]="painterService.primaryColor()"
                (input)="onPaintColorChange($event)"
                [attr.aria-label]="'textureStudio.primaryColor' | translate"
                class="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
            </label>

            <button
              type="button"
              (click)="cycleBrushSize()"
              [appTooltip]="'textureStudio.brushSize' | translate"
              appTooltipPlacement="top"
              [attr.aria-label]="'textureStudio.brushSize' | translate"
              class="px-2 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] font-bold flex items-center justify-center flex-shrink-0">
              {{ painterService.brushSize() }}px
            </button>
          </div>

          <!-- Painter Undo / Redo -->
          <div class="flex items-center gap-1 pr-1.5 border-r border-slate-700/80">
            <button
              type="button"
              (click)="painterService.undo()"
              [disabled]="!painterService.canUndo()"
              [appTooltip]="'common.undo' | translate"
              appTooltipPlacement="top"
              [attr.aria-label]="'common.undo' | translate"
              class="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition flex-shrink-0">
              <svg lucideUndo class="w-3.5 h-3.5"></svg>
            </button>
            <button
              type="button"
              (click)="painterService.redo()"
              [disabled]="!painterService.canRedo()"
              [appTooltip]="'common.redo' | translate"
              appTooltipPlacement="top"
              [attr.aria-label]="'common.redo' | translate"
              class="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition flex-shrink-0">
              <svg lucideRedo class="w-3.5 h-3.5"></svg>
            </button>
          </div>

          <!-- Open 2D Pixel Grid Studio -->
          <button
            type="button"
            (click)="open2DPixelGrid()"
            [appTooltip]="'textureStudio.open2DGrid' | translate"
            appTooltipPlacement="top"
            class="px-2.5 h-8 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 font-semibold text-[11px] flex items-center gap-1 transition flex-shrink-0 whitespace-nowrap">
            <svg lucideGrid3x3 class="w-3.5 h-3.5"></svg>
            <span>{{ 'textureStudio.open2DGrid' | translate }}</span>
          </button>
        </div>
      }

      <!-- ========================================== -->
      <!-- NODEBOX SIMULATION / PREVIEW OVERLAY       -->
      <!-- ========================================== -->
      @if (!projectStore.isRenderMode() && projectStore.project().nodeboxType !== 'fixed') {
        <div class="absolute top-14 lg:top-3 right-2.5 lg:right-3 flex flex-col items-end gap-1.5 z-20 pointer-events-auto">
          <div class="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-lg shadow-xl text-xs text-slate-200">
            <!-- Mode indicator / Toggle -->
            <span class="font-semibold text-[11px] uppercase tracking-wider text-sky-400 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full" [class.bg-emerald-400]="projectStore.simulationMode()" [class.bg-slate-500]="!projectStore.simulationMode()"></span>
              {{ projectStore.project().nodeboxType | uppercase }}
            </span>

            <div class="h-3 w-px bg-slate-700 mx-0.5"></div>

            <button
              (click)="toggleSimulationMode()"
              [class.bg-emerald-600]="projectStore.simulationMode()"
              [class.text-white]="projectStore.simulationMode()"
              [class.bg-slate-800]="!projectStore.simulationMode()"
              [class.text-slate-300]="!projectStore.simulationMode()"
              class="px-2 py-1 rounded font-medium transition hover:brightness-110 flex items-center gap-1">
              <span>{{ projectStore.simulationMode() ? 'Simulation On' : 'Simulate' }}</span>
            </button>
          </div>

          <!-- Connected Simulation Controls Panel -->
          @if (projectStore.project().nodeboxType === 'connected' && projectStore.simulationMode()) {
            <div class="flex flex-col gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-2 rounded-lg shadow-2xl text-xs text-slate-200 min-w-[210px]">
              <div class="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
                <span>Neighbors</span>
                <div class="flex items-center gap-1">
                  <button (click)="setConnectedPreset('line')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">Line</button>
                  <button (click)="setConnectedPreset('cross')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">Cross</button>
                  <button (click)="setConnectedPreset('all')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">All</button>
                  <button (click)="setConnectedPreset('none')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">None</button>
                </div>
              </div>

              <!-- 6 Directions Grid -->
              <div class="grid grid-cols-3 gap-1 text-[11px] font-mono text-center">
                <div></div>
                <button
                  (click)="toggleNeighbor('top')"
                  [class.bg-emerald-600]="projectStore.neighborState().top"
                  [class.text-white]="projectStore.neighborState().top"
                  [class.bg-slate-800]="!projectStore.neighborState().top"
                  [class.text-slate-400]="!projectStore.neighborState().top"
                  class="py-1 rounded border border-slate-700/50 hover:border-slate-500 transition">
                  +Y Top
                </button>
                <div></div>

                <button
                  (click)="toggleNeighbor('left')"
                  [class.bg-emerald-600]="projectStore.neighborState().left"
                  [class.text-white]="projectStore.neighborState().left"
                  [class.bg-slate-800]="!projectStore.neighborState().left"
                  [class.text-slate-400]="!projectStore.neighborState().left"
                  class="py-1 rounded border border-slate-700/50 hover:border-slate-500 transition">
                  -X Left
                </button>
                <div class="flex items-center justify-center text-[10px] text-slate-400 font-sans">Node</div>
                <button
                  (click)="toggleNeighbor('right')"
                  [class.bg-emerald-600]="projectStore.neighborState().right"
                  [class.text-white]="projectStore.neighborState().right"
                  [class.bg-slate-800]="!projectStore.neighborState().right"
                  [class.text-slate-400]="!projectStore.neighborState().right"
                  class="py-1 rounded border border-slate-700/50 hover:border-slate-500 transition">
                  +X Right
                </button>

                <button
                  (click)="toggleNeighbor('front')"
                  [class.bg-emerald-600]="projectStore.neighborState().front"
                  [class.text-white]="projectStore.neighborState().front"
                  [class.bg-slate-800]="!projectStore.neighborState().front"
                  [class.text-slate-400]="!projectStore.neighborState().front"
                  class="py-1 rounded border border-slate-700/50 hover:border-slate-500 transition">
                  -Z Front
                </button>
                <button
                  (click)="toggleNeighbor('bottom')"
                  [class.bg-emerald-600]="projectStore.neighborState().bottom"
                  [class.text-white]="projectStore.neighborState().bottom"
                  [class.bg-slate-800]="!projectStore.neighborState().bottom"
                  [class.text-slate-400]="!projectStore.neighborState().bottom"
                  class="py-1 rounded border border-slate-700/50 hover:border-slate-500 transition">
                  -Y Bot
                </button>
                <button
                  (click)="toggleNeighbor('back')"
                  [class.bg-emerald-600]="projectStore.neighborState().back"
                  [class.text-white]="projectStore.neighborState().back"
                  [class.bg-slate-800]="!projectStore.neighborState().back"
                  [class.text-slate-400]="!projectStore.neighborState().back"
                  class="py-1 rounded border border-slate-700/50 hover:border-slate-500 transition">
                  +Z Back
                </button>
              </div>
              <div class="text-[10px] text-slate-400 text-center italic mt-0.5">Click ghost blocks or buttons</div>
            </div>
          }

          <!-- Wallmounted Preview Controls Panel -->
          @if (projectStore.project().nodeboxType === 'wallmounted' && projectStore.simulationMode()) {
            <div class="flex flex-col gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-2 rounded-lg shadow-2xl text-xs text-slate-200 min-w-[200px]">
              <span class="text-[10px] text-slate-400 uppercase font-semibold">Mount Attachment</span>
              <div class="flex flex-col gap-1">
                <button
                  (click)="setWallmountedSlot('wall_side')"
                  [class.bg-sky-600]="projectStore.wallmountedPreviewSlot() === 'wall_side'"
                  [class.text-white]="projectStore.wallmountedPreviewSlot() === 'wall_side'"
                  [class.bg-slate-800]="projectStore.wallmountedPreviewSlot() !== 'wall_side'"
                  class="w-full text-left px-2 py-1 rounded text-[11px] transition">
                  Vertical Wall (-X)
                </button>
                <button
                  (click)="setWallmountedSlot('wall_bottom')"
                  [class.bg-sky-600]="projectStore.wallmountedPreviewSlot() === 'wall_bottom'"
                  [class.text-white]="projectStore.wallmountedPreviewSlot() === 'wall_bottom'"
                  [class.bg-slate-800]="projectStore.wallmountedPreviewSlot() !== 'wall_bottom'"
                  class="w-full text-left px-2 py-1 rounded text-[11px] transition">
                  Floor (-Y)
                </button>
                <button
                  (click)="setWallmountedSlot('wall_top')"
                  [class.bg-sky-600]="projectStore.wallmountedPreviewSlot() === 'wall_top'"
                  [class.text-white]="projectStore.wallmountedPreviewSlot() === 'wall_top'"
                  [class.bg-slate-800]="projectStore.wallmountedPreviewSlot() !== 'wall_top'"
                  class="w-full text-left px-2 py-1 rounded text-[11px] transition">
                  Ceiling (+Y)
                </button>
              </div>
            </div>
          }

          <!-- Leveled Preview Controls Panel -->
          @if (projectStore.project().nodeboxType === 'leveled' && projectStore.simulationMode()) {
            <div class="flex flex-col gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-2.5 rounded-lg shadow-2xl text-xs text-slate-200 min-w-[200px]">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-400 font-semibold">Leveled Height:</span>
                <span class="font-mono text-sky-400 font-bold">{{ projectStore.leveledPreviewHeight() }} / 16</span>
              </div>
              <input
                type="range"
                min="1"
                max="16"
                step="1"
                [value]="projectStore.leveledPreviewHeight()"
                (input)="onLeveledHeightInput($event)"
                class="w-full accent-sky-500 cursor-pointer" />
              <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>1 (0.06)</span>
                <span>8 (0.50)</span>
                <span>16 (1.00)</span>
              </div>
            </div>
          }
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
  public painterService = inject(TexturePainterService);
  public showDepthPopover = signal<boolean>(false);
  public showSkyPopover = signal<boolean>(false);
  public skyPresetBadge = computed(() => {
    switch (this.sceneService.sceneSky()) {
      case 'minetest_day':
        return 'day';
      case 'minetest_sunset':
        return 'sunset';
      case 'minetest_night':
        return 'night';
      default:
        return 'studio';
    }
  });
  public customFloorTextures = computed(() =>
    this.textureService.textures().filter((t) => t.isCustom)
  );

  // Mobile viewport interaction signals
  public showMobileCameraMenu = signal<boolean>(false);
  public showMobileShadingMenu = signal<boolean>(false);
  public activeCameraPreset = signal<CameraPreset>('iso');

  constructor() {
    // Re-sync 3D meshes when boxes, textures, selection, render mode, or texture transforms change
    effect(() => {
      const project = this.projectStore.project();
      const selectedId = this.projectStore.selectedBoxId();
      const isRender = this.projectStore.isRenderMode();
      this.textureService.textureUpdated();
      this.sceneService.onRenderModeChange(isRender);
      this.sceneService.updateBoxes(project.boxes, selectedId);
      this.sceneService.updateSimulationHelpers();
    });
  }

  ngOnInit(): void {
    this.sceneService.initialize(this.renderCanvas.nativeElement);
  }

  ngOnDestroy(): void {
    this.sceneService.destroy();
  }

  toggleMobileCameraMenu(): void {
    this.showMobileCameraMenu.update((v) => !v);
    this.showMobileShadingMenu.set(false);
  }

  toggleMobileShadingMenu(): void {
    this.showMobileShadingMenu.update((v) => !v);
    this.showMobileCameraMenu.set(false);
  }

  closeMobileMenus(): void {
    this.showMobileCameraMenu.set(false);
    this.showMobileShadingMenu.set(false);
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.showDepthPopover()) {
      this.showDepthPopover.set(false);
    }
    if (this.showSkyPopover()) {
      this.showSkyPopover.set(false);
    }
  }

  toggleSkyPopover(): void {
    this.showSkyPopover.update((v) => !v);
    this.showDepthPopover.set(false);
  }

  toggleDepthPopover(): void {
    this.showDepthPopover.update((v) => !v);
    this.showSkyPopover.set(false);
  }

  setPreset(preset: CameraPreset): void {
    this.activeCameraPreset.set(preset);
    this.sceneService.setCameraPreset(preset);
    this.showMobileCameraMenu.set(false);
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

  setPaintTool(tool: PaintTool): void {
    this.painterService.activeTool.set(tool);
  }

  onPaintColorChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (val) {
      this.painterService.primaryColor.set(val);
    }
  }

  cycleBrushSize(): void {
    const current = this.painterService.brushSize();
    const next = current === 1 ? 2 : current === 2 ? 3 : 1;
    this.painterService.brushSize.set(next);
  }

  open2DPixelGrid(): void {
    const face = this.painterService.activeFace();
    const key = this.projectStore.project().globalTextures[face] || 'default_wood.png';
    this.painterService.openTextureInPainter(key, face, false);
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

  onSunElevationInput(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.sceneService.setSkyAtmosphere({ sunElevation: val });
    }
  }

  onSunAzimuthInput(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.sceneService.setSkyAtmosphere({ sunAzimuth: val });
    }
  }

  onTurbidityInput(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.sceneService.setSkyAtmosphere({ turbidity: val });
    }
  }

  onDepthStyleIntensityInput(
    key: 'bevelIntensity' | 'reliefIntensity' | 'extrusionIntensity',
    event: Event
  ): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) {
      this.sceneService.setPixelDepth({ [key]: val });
    }
  }

  resetSkyDefaults(): void {
    this.sceneService.setSceneSky(this.sceneService.sceneSky());
  }

  resetDepthDefaults(): void {
    this.sceneService.setPixelDepth({
      enabled: false,
      pixelBevel: true,
      luminanceRelief: true,
      extrudePixels: false,
      intensity: 'subtle'
    });
  }

  onFloorChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as SceneFloor;
    this.sceneService.setSceneFloor(val);
  }

  captureScreenshot(resolution: ScreenshotResolution, transparent: boolean): void {
    this.sceneService.captureScreenshot({ resolution, transparent });
  }

  toggleSimulationMode(): void {
    this.projectStore.setSimulationMode(!this.projectStore.simulationMode());
  }

  toggleNeighbor(dir: keyof NeighborConnectionState): void {
    this.projectStore.toggleNeighbor(dir);
  }

  setConnectedPreset(preset: 'line' | 'cross' | 'all' | 'none'): void {
    if (preset === 'all') {
      const dirs: (keyof NeighborConnectionState)[] = ['top', 'bottom', 'front', 'back', 'left', 'right'];
      for (const d of dirs) {
        this.projectStore.setNeighbor(d, true);
      }
    } else if (preset === 'none') {
      const dirs: (keyof NeighborConnectionState)[] = ['top', 'bottom', 'front', 'back', 'left', 'right'];
      for (const d of dirs) {
        this.projectStore.setNeighbor(d, false);
      }
    } else if (preset === 'line') {
      this.projectStore.setNeighbor('front', true);
      this.projectStore.setNeighbor('back', true);
      this.projectStore.setNeighbor('left', false);
      this.projectStore.setNeighbor('right', false);
      this.projectStore.setNeighbor('top', false);
      this.projectStore.setNeighbor('bottom', false);
    } else if (preset === 'cross') {
      this.projectStore.setNeighbor('front', true);
      this.projectStore.setNeighbor('back', true);
      this.projectStore.setNeighbor('left', true);
      this.projectStore.setNeighbor('right', true);
      this.projectStore.setNeighbor('top', false);
      this.projectStore.setNeighbor('bottom', false);
    }
  }

  setWallmountedSlot(slot: 'wall_bottom' | 'wall_top' | 'wall_side'): void {
    this.projectStore.setWallmountedPreviewSlot(slot);
  }

  onLeveledHeightInput(e: Event): void {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val)) {
      this.projectStore.setLeveledPreviewHeight(val);
    }
  }
}
