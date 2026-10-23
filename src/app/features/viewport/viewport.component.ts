import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BabylonSceneService, CameraPreset, GizmoMode, ViewportMode } from './services/babylon-scene.service';
import { ProjectStore } from '../../core/state/project.store';

@Component({
  selector: 'app-viewport',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col">
      <!-- 3D Canvas -->
      <canvas #renderCanvas class="w-full h-full block outline-none cursor-grab active:cursor-grabbing"></canvas>

      <!-- Viewport Floating Overlay Controls -->
      <div class="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 p-1.5 rounded-lg shadow-xl text-xs z-10">
        <!-- Camera View Presets -->
        <div class="flex items-center space-x-1 border-r border-slate-700/80 pr-2 mr-1">
          <button
            (click)="setPreset('iso')"
            title="Isometric View"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
            Iso
          </button>
          <button
            (click)="setPreset('top')"
            title="Top View (+Y)"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
            Top
          </button>
          <button
            (click)="setPreset('front')"
            title="Front View (-Z)"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
            Front
          </button>
          <button
            (click)="setPreset('back')"
            title="Back View (+Z)"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
            Back
          </button>
          <button
            (click)="setPreset('left')"
            title="Left View (-X)"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
            Left
          </button>
          <button
            (click)="setPreset('right')"
            title="Right View (+X)"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition font-mono font-medium">
            Right
          </button>
        </div>

        <!-- Render Modes -->
        <div class="flex items-center space-x-1 border-r border-slate-700/80 pr-2 mr-1">
          <button
            (click)="setRenderMode('textured')"
            [class.bg-sky-600]="sceneService.viewportMode === 'textured'"
            [class.text-white]="sceneService.viewportMode === 'textured'"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
            Textures
          </button>
          <button
            (click)="setRenderMode('colored')"
            [class.bg-sky-600]="sceneService.viewportMode === 'colored'"
            [class.text-white]="sceneService.viewportMode === 'colored'"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
            Solid
          </button>
          <button
            (click)="setRenderMode('wireframe')"
            [class.bg-sky-600]="sceneService.viewportMode === 'wireframe'"
            [class.text-white]="sceneService.viewportMode === 'wireframe'"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
            Wire
          </button>
        </div>

        <!-- Transform Gizmo Mode -->
        <div class="flex items-center space-x-1 border-r border-slate-700/80 pr-2 mr-1">
          <button
            (click)="setGizmo('position')"
            [class.bg-emerald-600]="sceneService.gizmoMode === 'position'"
            [class.text-white]="sceneService.gizmoMode === 'position'"
            title="Translate Gizmo with 1/16th Snap"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
            Move
          </button>
          <button
            (click)="setGizmo('scale')"
            [class.bg-emerald-600]="sceneService.gizmoMode === 'scale'"
            [class.text-white]="sceneService.gizmoMode === 'scale'"
            title="Scale Gizmo"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
            Scale
          </button>
          <button
            (click)="setGizmo('rotation')"
            [class.bg-emerald-600]="sceneService.gizmoMode === 'rotation'"
            [class.text-white]="sceneService.gizmoMode === 'rotation'"
            title="Rotate Gizmo (Snapped to 90° Luanti Angles)"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 transition">
            Rotate (90°)
          </button>
          <button
            (click)="setGizmo('none')"
            [class.bg-slate-700]="sceneService.gizmoMode === 'none'"
            class="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 transition">
            Off
          </button>
        </div>

        <!-- Toggles -->
        <button
          (click)="toggleCage()"
          [class.text-sky-400]="sceneService.showCage"
          [class.text-slate-500]="!sceneService.showCage"
          title="Toggle 1x1x1 Node Boundary Cage"
          class="px-2 py-1 rounded hover:bg-slate-800 transition flex items-center gap-1">
          Cage
        </button>
        <button
          (click)="toggleGrid()"
          [class.text-sky-400]="sceneService.showGrid"
          [class.text-slate-500]="!sceneService.showGrid"
          title="Toggle 16x16 Subdivided Floor Grid"
          class="px-2 py-1 rounded hover:bg-slate-800 transition flex items-center gap-1">
          Grid
        </button>
        <button
          (click)="resetCamera()"
          title="Reset Camera Center"
          class="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition">
          Reset View
        </button>
      </div>

      <!-- Luanti Orientation / Axis Indicator Badge -->
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
    </div>
  `
})
export class ViewportComponent implements OnInit, OnDestroy {
  @ViewChild('renderCanvas', { static: true })
  renderCanvas!: ElementRef<HTMLCanvasElement>;

  public sceneService = inject(BabylonSceneService);
  private projectStore = inject(ProjectStore);

  constructor() {
    // Re-sync 3D meshes when boxes, textures, or selection changes
    effect(() => {
      const boxes = this.projectStore.boxes();
      const selectedId = this.projectStore.selectedBoxId();
      this.sceneService.updateBoxes(boxes, selectedId);
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

  resetCamera(): void {
    this.sceneService.resetCamera();
  }
}
