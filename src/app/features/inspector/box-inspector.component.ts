import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/state/project.store';
import {
  floatToGridStep,
  formatCoordinate,
  gridStepToFloat,
  parseCoordinateString
} from '../../core/utils/fraction.utils';

import { TooltipDirective } from '../../shared/directives/tooltip.directive';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export type InputMode = 'grid' | 'fractions' | 'decimals';

@Component({
  selector: 'app-box-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipDirective, TranslatePipe],
  template: `
    <div class="h-full flex flex-col bg-slate-900 border-l border-slate-800 text-xs select-none overflow-y-auto">
      @if (projectStore.selectedBox(); as box) {
        <!-- Panel Header -->
        <div class="p-3 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-3 h-3 rounded-full flex-shrink-0" [style.backgroundColor]="box.color"></span>
            <span class="font-semibold text-slate-200 truncate">{{ box.name }}</span>
          </div>

          <!-- Input Mode Switch -->
          <div class="flex bg-slate-950 p-0.5 rounded border border-slate-800">
            <button
              (click)="inputMode.set('grid')"
              [class.bg-sky-600]="inputMode() === 'grid'"
              [class.text-white]="inputMode() === 'grid'"
              [class.text-slate-400]="inputMode() !== 'grid'"
              [appTooltip]="'inspector.gridUnits' | translate"
              class="px-2 py-0.5 rounded text-[11px] font-medium transition">
              Grid
            </button>
            <button
              (click)="inputMode.set('fractions')"
              [class.bg-sky-600]="inputMode() === 'fractions'"
              [class.text-white]="inputMode() === 'fractions'"
              [class.text-slate-400]="inputMode() !== 'fractions'"
              [appTooltip]="'inspector.fractions' | translate"
              class="px-2 py-0.5 rounded text-[11px] font-medium transition">
              Fraction
            </button>
            <button
              (click)="inputMode.set('decimals')"
              [class.bg-sky-600]="inputMode() === 'decimals'"
              [class.text-white]="inputMode() === 'decimals'"
              [class.text-slate-400]="inputMode() !== 'decimals'"
              [appTooltip]="'inspector.decimals' | translate"
              class="px-2 py-0.5 rounded text-[11px] font-medium transition">
              Float
            </button>
          </div>
        </div>

        <div class="p-3 space-y-4">
          <!-- Locked Box Warning Banner -->
          <div *ngIf="box.locked" class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <span>🔒</span>
              <span>{{ 'inspector.lockedWarning' | translate }}</span>
            </div>
            <button
              (click)="projectStore.toggleBoxLock(box.id)"
              class="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-medium transition">
              {{ 'layers.unlock' | translate }}
            </button>
          </div>

          <!-- Slot Assignment (When connected or wallmounted) -->
          @if (projectStore.project().nodeboxType === 'connected' || projectStore.project().nodeboxType === 'wallmounted') {
            <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <div class="flex items-center justify-between text-[11px]">
                <span class="font-semibold text-slate-400 uppercase tracking-wider">NodeBox Slot</span>
                <span class="text-[10px] text-sky-400 font-mono font-medium">{{ box.slot || (projectStore.project().nodeboxType === 'wallmounted' ? 'wall_bottom' : 'fixed') }}</span>
              </div>
              <select
                [ngModel]="box.slot || (projectStore.project().nodeboxType === 'wallmounted' ? 'wall_bottom' : 'fixed')"
                (ngModelChange)="projectStore.setBoxSlot(box.id, $event)"
                [disabled]="box.locked"
                class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-sky-500 transition cursor-pointer">
                @if (projectStore.project().nodeboxType === 'connected') {
                  <optgroup label="Base">
                    <option value="fixed">fixed (Always present)</option>
                  </optgroup>
                  <optgroup label="Connected Pieces">
                    <option value="connect_top">connect_top (+Y)</option>
                    <option value="connect_bottom">connect_bottom (-Y)</option>
                    <option value="connect_front">connect_front (-Z)</option>
                    <option value="connect_left">connect_left (-X)</option>
                    <option value="connect_back">connect_back (+Z)</option>
                    <option value="connect_right">connect_right (+X)</option>
                  </optgroup>
                  <optgroup label="Disconnected Fallbacks">
                    <option value="disconnected_top">disconnected_top</option>
                    <option value="disconnected_bottom">disconnected_bottom</option>
                    <option value="disconnected_front">disconnected_front</option>
                    <option value="disconnected_left">disconnected_left</option>
                    <option value="disconnected_back">disconnected_back</option>
                    <option value="disconnected_right">disconnected_right</option>
                    <option value="disconnected_sides">disconnected_sides (None on 4 sides)</option>
                    <option value="disconnected">disconnected (None connected)</option>
                  </optgroup>
                } @else {
                  <option value="wall_bottom">wall_bottom (Attached to floor)</option>
                  <option value="wall_top">wall_top (Attached to ceiling)</option>
                  <option value="wall_side">wall_side (Attached to wall)</option>
                }
              </select>
            </div>
          }

          <!-- Coordinates Group -->
          <div class="space-y-3">
            <div class="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
              {{ 'inspector.minCoords' | translate }}
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="text-[10px] text-red-400 font-mono block mb-1">Min X</label>
                <input
                  type="text"
                  [ngModel]="getCoordDisplay(box.minX)"
                  (change)="onCoordInput('minX', $event)"
                  [disabled]="box.locked"
                  class="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1.5 text-slate-200 font-mono text-center focus:outline-none focus:border-red-400 transition" />
              </div>
              <div>
                <label class="text-[10px] text-green-400 font-mono block mb-1">Min Y (Bottom)</label>
                <input
                  type="text"
                  [ngModel]="getCoordDisplay(box.minY)"
                  (change)="onCoordInput('minY', $event)"
                  [disabled]="box.locked"
                  class="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1.5 text-slate-200 font-mono text-center focus:outline-none focus:border-green-400 transition" />
              </div>
              <div>
                <label class="text-[10px] text-blue-400 font-mono block mb-1">Min Z (Front)</label>
                <input
                  type="text"
                  [ngModel]="getCoordDisplay(box.minZ)"
                  (change)="onCoordInput('minZ', $event)"
                  [disabled]="box.locked"
                  class="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1.5 text-slate-200 font-mono text-center focus:outline-none focus:border-blue-400 transition" />
              </div>
            </div>

            <div class="text-[11px] font-semibold tracking-wider uppercase text-slate-400 pt-1">
              {{ 'inspector.maxCoords' | translate }}
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="text-[10px] text-red-400 font-mono block mb-1">Max X</label>
                <input
                  type="text"
                  [ngModel]="getCoordDisplay(box.maxX)"
                  (change)="onCoordInput('maxX', $event)"
                  [disabled]="box.locked"
                  class="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1.5 text-slate-200 font-mono text-center focus:outline-none focus:border-red-400 transition" />
              </div>
              <div>
                <label class="text-[10px] text-green-400 font-mono block mb-1">Max Y (Top)</label>
                <input
                  type="text"
                  [ngModel]="getCoordDisplay(box.maxY)"
                  (change)="onCoordInput('maxY', $event)"
                  [disabled]="box.locked"
                  class="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1.5 text-slate-200 font-mono text-center focus:outline-none focus:border-green-400 transition" />
              </div>
              <div>
                <label class="text-[10px] text-blue-400 font-mono block mb-1">Max Z (Back)</label>
                <input
                  type="text"
                  [ngModel]="getCoordDisplay(box.maxZ)"
                  (change)="onCoordInput('maxZ', $event)"
                  [disabled]="box.locked"
                  class="w-full bg-slate-950 border border-slate-700/80 rounded px-2 py-1.5 text-slate-200 font-mono text-center focus:outline-none focus:border-blue-400 transition" />
              </div>
            </div>
          </div>

          <!-- Dimensions & Center Info -->
          <div class="bg-slate-950/70 p-2.5 rounded border border-slate-800 space-y-1.5 font-mono text-[11px]">
            <div class="flex justify-between text-slate-400">
              <span>{{ 'inspector.dimensions' | translate }}:</span>
              <span class="text-slate-200">
                {{ formatVal(box.maxX - box.minX) }} &times;
                {{ formatVal(box.maxY - box.minY) }} &times;
                {{ formatVal(box.maxZ - box.minZ) }}
              </span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>Center (X, Y, Z):</span>
              <span class="text-slate-200">
                ({{ formatVal((box.minX + box.maxX) / 2) }},
                 {{ formatVal((box.minY + box.maxY) / 2) }},
                 {{ formatVal((box.minZ + box.maxZ) / 2) }})
              </span>
            </div>
          </div>

          <!-- Nudge Controls -->
          <div class="space-y-2">
            <div class="flex justify-between items-center text-[11px] font-semibold tracking-wider uppercase text-slate-400">
              <span>{{ 'inspector.nudge' | translate }}</span>
              <span class="text-[10px] font-mono text-slate-500">Step: 1/{{ projectStore.project().snapResolution }}</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <!-- X Nudge -->
              <div class="flex items-center bg-slate-950 border border-slate-800 rounded overflow-hidden">
                <button
                  (click)="nudge(box.id, 'x', -1)"
                  [disabled]="box.locked"
                  [appTooltip]="'inspector.nudge' | translate"
                  class="flex-1 py-1 text-center hover:bg-slate-800 text-red-400 active:bg-slate-700 transition">
                  -X
                </button>
                <div class="w-px h-4 bg-slate-800"></div>
                <button
                  (click)="nudge(box.id, 'x', 1)"
                  [disabled]="box.locked"
                  [appTooltip]="'inspector.nudge' | translate"
                  class="flex-1 py-1 text-center hover:bg-slate-800 text-red-400 active:bg-slate-700 transition">
                  +X
                </button>
              </div>

              <!-- Y Nudge -->
              <div class="flex items-center bg-slate-950 border border-slate-800 rounded overflow-hidden">
                <button
                  (click)="nudge(box.id, 'y', -1)"
                  [disabled]="box.locked"
                  [appTooltip]="'inspector.nudge' | translate"
                  class="flex-1 py-1 text-center hover:bg-slate-800 text-green-400 active:bg-slate-700 transition">
                  -Y
                </button>
                <div class="w-px h-4 bg-slate-800"></div>
                <button
                  (click)="nudge(box.id, 'y', 1)"
                  [disabled]="box.locked"
                  [appTooltip]="'inspector.nudge' | translate"
                  class="flex-1 py-1 text-center hover:bg-slate-800 text-green-400 active:bg-slate-700 transition">
                  +Y
                </button>
              </div>

              <!-- Z Nudge -->
              <div class="flex items-center bg-slate-950 border border-slate-800 rounded overflow-hidden">
                <button
                  (click)="nudge(box.id, 'z', -1)"
                  [disabled]="box.locked"
                  [appTooltip]="'inspector.nudge' | translate"
                  class="flex-1 py-1 text-center hover:bg-slate-800 text-blue-400 active:bg-slate-700 transition">
                  -Z
                </button>
                <div class="w-px h-4 bg-slate-800"></div>
                <button
                  (click)="nudge(box.id, 'z', 1)"
                  [disabled]="box.locked"
                  [appTooltip]="'inspector.nudge' | translate"
                  class="flex-1 py-1 text-center hover:bg-slate-800 text-blue-400 active:bg-slate-700 transition">
                  +Z
                </button>
              </div>
            </div>
          </div>

          <!-- Symmetry / Mirroring -->
          <div class="space-y-2">
            <div class="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
              {{ 'inspector.flip' | translate }}
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button
                (click)="flip(box.id, 'x')"
                [disabled]="box.locked"
                [appTooltip]="'inspector.flip' | translate"
                class="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 font-medium transition text-center active:scale-95">
                Flip X
              </button>
              <button
                (click)="flip(box.id, 'y')"
                [disabled]="box.locked"
                [appTooltip]="'inspector.flip' | translate"
                class="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 font-medium transition text-center active:scale-95">
                Flip Y
              </button>
              <button
                (click)="flip(box.id, 'z')"
                [disabled]="box.locked"
                [appTooltip]="'inspector.flip' | translate"
                class="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 font-medium transition text-center active:scale-95">
                Flip Z
              </button>
            </div>
          </div>

          <!-- Rotation 90° -->
          <div class="space-y-2">
            <div class="flex justify-between items-center text-[11px] font-semibold tracking-wider uppercase text-slate-400">
              <span>{{ 'inspector.rotate90' | translate }}</span>
              <div class="flex bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px]">
                <button
                  (click)="rotateOrigin.set('center')"
                  [class.text-sky-400]="rotateOrigin() === 'center'"
                  [class.font-bold]="rotateOrigin() === 'center'"
                  [appTooltip]="'inspector.rotateCenter' | translate"
                  class="px-1.5 py-0.5 text-slate-400 hover:text-slate-200 transition">
                  Center
                </button>
                <button
                  (click)="rotateOrigin.set('origin')"
                  [class.text-sky-400]="rotateOrigin() === 'origin'"
                  [class.font-bold]="rotateOrigin() === 'origin'"
                  [appTooltip]="'inspector.rotateOrigin' | translate"
                  class="px-1.5 py-0.5 text-slate-400 hover:text-slate-200 transition">
                  Origin (0,0,0)
                </button>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button
                (click)="rotate(box.id, 'x', 1)"
                [disabled]="box.locked"
                [appTooltip]="'inspector.rotate90' | translate"
                class="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-red-400 font-medium transition text-center active:scale-95 disabled:opacity-40">
                &circlearrowright; 90&deg; X
              </button>
              <button
                (click)="rotate(box.id, 'y', 1)"
                [disabled]="box.locked"
                [appTooltip]="'inspector.rotate90' | translate"
                class="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-green-400 font-medium transition text-center active:scale-95 disabled:opacity-40">
                &circlearrowright; 90&deg; Y
              </button>
              <button
                (click)="rotate(box.id, 'z', 1)"
                [disabled]="box.locked"
                [appTooltip]="'inspector.rotate90' | translate"
                class="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-blue-400 font-medium transition text-center active:scale-95 disabled:opacity-40">
                &circlearrowright; 90&deg; Z
              </button>
            </div>
          </div>

          <!-- Quick Centering & Clamping -->
          <div class="flex gap-2 pt-1">
            <button
              (click)="centerBox(box.id)"
              [disabled]="box.locked"
              [appTooltip]="'inspector.center' | translate"
              class="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-medium transition text-center">
              {{ 'inspector.center' | translate }}
            </button>
            <button
              (click)="snapToGrid(box.id)"
              [disabled]="box.locked"
              [appTooltip]="'inspector.snapGrid' | translate"
              class="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-medium transition text-center">
              {{ 'inspector.snapGrid' | translate }}
            </button>
          </div>
        </div>
      } @else {
        <div class="p-8 text-center text-slate-500">
          {{ 'inspector.noBoxSelected' | translate }}
        </div>
      }
    </div>
  `
})
export class BoxInspectorComponent {
  public projectStore = inject(ProjectStore);
  public inputMode = signal<InputMode>('fractions');
  public rotateOrigin = signal<'center' | 'origin'>('center');

  rotate(id: string, axis: 'x' | 'y' | 'z', direction: 1 | -1): void {
    this.projectStore.rotateBox(id, axis, direction, this.rotateOrigin());
  }

  getCoordDisplay(value: number): string {
    const res = this.projectStore.project().snapResolution;
    switch (this.inputMode()) {
      case 'grid':
        return `${floatToGridStep(value, res)}`;
      case 'decimals':
        return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '.0');
      case 'fractions':
      default:
        return formatCoordinate(value, 'fractions_16', res);
    }
  }

  onCoordInput(field: 'minX' | 'minY' | 'minZ' | 'maxX' | 'maxY' | 'maxZ', event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value;
    const res = this.projectStore.project().snapResolution;

    let parsedVal: number;
    if (this.inputMode() === 'grid') {
      const step = parseInt(raw, 10);
      parsedVal = isNaN(step) ? 0 : gridStepToFloat(step, res);
    } else {
      parsedVal = parseCoordinateString(raw, 0);
    }

    const box = this.projectStore.selectedBox();
    if (!box) return;

    this.projectStore.updateBox(box.id, { [field]: parsedVal });
  }

  nudge(id: string, axis: 'x' | 'y' | 'z', deltaStep: number): void {
    this.projectStore.nudgeBox(id, axis, deltaStep);
  }

  flip(id: string, axis: 'x' | 'y' | 'z'): void {
    this.projectStore.flipBox(id, axis);
  }

  centerBox(id: string): void {
    const box = this.projectStore.selectedBox();
    if (!box) return;
    const width = box.maxX - box.minX;
    const depth = box.maxZ - box.minZ;
    this.projectStore.updateBox(id, {
      minX: -width / 2,
      maxX: width / 2,
      minZ: -depth / 2,
      maxZ: depth / 2
    });
  }

  snapToGrid(id: string): void {
    const box = this.projectStore.selectedBox();
    if (!box) return;
    const res = this.projectStore.project().snapResolution;
    const snap = (v: number) => gridStepToFloat(floatToGridStep(v, res), res);

    this.projectStore.updateBox(id, {
      minX: snap(box.minX),
      maxX: snap(box.maxX),
      minY: snap(box.minY),
      maxY: snap(box.maxY),
      minZ: snap(box.minZ),
      maxZ: snap(box.maxZ)
    });
  }

  formatVal(val: number): string {
    return formatCoordinate(val, this.projectStore.project().format, this.projectStore.project().snapResolution);
  }
}
