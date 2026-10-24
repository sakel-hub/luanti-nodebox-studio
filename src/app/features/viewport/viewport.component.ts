import {
  Component,
  ElementRef,
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
  SceneSky,
  ScreenshotResolution
} from './services/babylon-scene.service';
import { ProjectStore } from '../../core/state/project.store';
import { TooltipDirective } from '../../shared/directives/tooltip.directive';
import { ThemeService } from '../../core/services/theme.service';
import { TextureService } from '../../core/services/texture.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { NeighborConnectionState } from '../../core/models/nodebox.model';

@Component({
  selector: 'app-viewport',
  standalone: true,
  imports: [CommonModule, TooltipDirective, TranslatePipe],
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
              <span class="font-mono">📷 {{ activeCameraPreset() | uppercase }}</span>
              <span class="text-[10px] text-slate-400">▾</span>
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
              <span>🎨 {{ sceneService.viewportMode() | titlecase }}</span>
              <span class="text-[10px] text-slate-400">▾</span>
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
                  <span class="text-slate-300">Floor</span>
                  <select
                    [value]="sceneService.sceneFloor()"
                    (change)="onFloorChange($event)"
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
            class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition active:scale-90"
            [title]="'viewport.move' | translate">
            ✥
          </button>
          <button
            (click)="setGizmo('resize')"
            [class.bg-emerald-600]="sceneService.gizmoMode() === 'resize'"
            [class.text-white]="sceneService.gizmoMode() === 'resize'"
            [class.text-slate-400]="sceneService.gizmoMode() !== 'resize'"
            [attr.aria-label]="'viewport.resize' | translate"
            class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition active:scale-90"
            [title]="'viewport.resize' | translate">
            ⬚
          </button>
          <button
            (click)="setGizmo('scale')"
            [class.bg-emerald-600]="sceneService.gizmoMode() === 'scale'"
            [class.text-white]="sceneService.gizmoMode() === 'scale'"
            [class.text-slate-400]="sceneService.gizmoMode() !== 'scale'"
            [attr.aria-label]="'viewport.scale' | translate"
            class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition active:scale-90"
            [title]="'viewport.scale' | translate">
            ⤢
          </button>
          <button
            (click)="setGizmo('rotation')"
            [class.bg-emerald-600]="sceneService.gizmoMode() === 'rotation'"
            [class.text-white]="sceneService.gizmoMode() === 'rotation'"
            [class.text-slate-400]="sceneService.gizmoMode() !== 'rotation'"
            [attr.aria-label]="'viewport.rotate' | translate"
            class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition active:scale-90"
            [title]="'viewport.rotate' | translate">
            ↻
          </button>
          <button
            (click)="setGizmo('none')"
            [class.bg-slate-700]="sceneService.gizmoMode() === 'none'"
            [class.text-white]="sceneService.gizmoMode() === 'none'"
            [class.text-slate-500]="sceneService.gizmoMode() !== 'none'"
            [attr.aria-label]="'viewport.selectOff' | translate"
            class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition active:scale-90"
            [title]="'viewport.selectOff' | translate">
            ✕
          </button>
          <div class="w-full h-px bg-slate-800 my-0.5"></div>
          <button
            (click)="resetCamera()"
            [attr.aria-label]="'viewport.resetView' | translate"
            class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-slate-400 hover:text-white transition active:scale-90"
            [title]="'viewport.resetView' | translate">
            ⌖
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
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>
            </svg>
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

          <!-- Turntable Auto-Rotation Button -->
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
              <span>Icon</span>
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
  public showDepthPopover = signal<boolean>(false);
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
