import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/state/project.store';
import { formatCoordinate } from '../../core/utils/fraction.utils';
import { TooltipDirective } from '../../shared/directives/tooltip.directive';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { NodeboxSlot, CONNECTED_SLOTS, WALLMOUNTED_SLOTS } from '../../core/models/nodebox.model';
import {
  LucidePlus,
  LucideEye,
  LucideEyeOff,
  LucideLock,
  LucideUnlock,
  LucideCopy,
  LucideTrash2,
  LucideArrowUp,
  LucideArrowDown,
  LucideRotateCw
} from '@lucide/angular';

@Component({
  selector: 'app-layer-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TooltipDirective,
    TranslatePipe,
    LucidePlus,
    LucideEye,
    LucideEyeOff,
    LucideLock,
    LucideUnlock,
    LucideCopy,
    LucideTrash2,
    LucideArrowUp,
    LucideArrowDown,
    LucideRotateCw
  ],
  template: `
    <div class="h-full flex flex-col bg-slate-900 border-r border-slate-800 select-none">
      <!-- Panel Header -->
      <div class="p-3 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-sm text-slate-200">{{ 'layers.title' | translate }}</span>
          <span class="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full font-mono">
            {{ projectStore.boxes().length }}
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            (click)="projectStore.rotateAllBoxes('y', 1)"
            [appTooltip]="'inspector.rotate90' | translate"
            class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition active:scale-95 flex items-center justify-center">
            <svg lucideRotateCw class="w-3.5 h-3.5"></svg>
          </button>
          <button
            (click)="addBox()"
            [appTooltip]="'layers.addBox' | translate"
            [appTooltipShortcutId]="'box_new'"
            class="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white text-xs px-2.5 py-1.5 rounded-md font-medium shadow-sm transition active:scale-95">
            <svg lucidePlus class="w-3.5 h-3.5"></svg>
            {{ 'layers.addBox' | translate }}
          </button>
        </div>
      </div>

      <!-- Search Input -->
      <div class="p-2 border-b border-slate-800">
        <input
          type="text"
          [ngModel]="searchQuery()"
          (ngModelChange)="searchQuery.set($event)"
          [placeholder]="'common.search' | translate"
          class="w-full bg-slate-950/80 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition" />
      </div>

      <!-- Slot Filter (When connected or wallmounted) -->
      @if (projectStore.project().nodeboxType === 'connected' || projectStore.project().nodeboxType === 'wallmounted') {
        <div class="p-2 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-1.5">
          <div class="flex items-center gap-1 min-w-0 flex-1">
            <span class="text-[10px] text-slate-400 font-semibold uppercase">Slot:</span>
            <select
              [ngModel]="slotFilter()"
              (ngModelChange)="onSlotFilterChange($event)"
              class="bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs text-sky-400 font-medium focus:outline-none flex-1 truncate">
              <option value="all">All Slots</option>
              @if (projectStore.project().nodeboxType === 'connected') {
                @for (slot of connectedSlots; track slot) {
                  <option [value]="slot">{{ slot }}</option>
                }
              } @else {
                @for (slot of wallmountedSlots; track slot) {
                  <option [value]="slot">{{ slot }}</option>
                }
              }
            </select>
          </div>
          @if (canReplicate()) {
            <button
              (click)="replicateCurrentSlot()"
              [appTooltip]="'Replicate to 4 Sides'"
              class="px-2 py-0.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded text-[10px] font-medium transition flex items-center gap-1 flex-shrink-0">
              <span>↻ 4-Way</span>
            </button>
          }
        </div>
      }

      <!-- Box List -->
      <div
        (click)="onBackgroundClick($event)"
        class="flex-1 overflow-y-auto divide-y divide-slate-800/60"
        role="listbox"
        [attr.aria-label]="'layers.title' | translate">
        @for (box of filteredBoxes(); track box.id; let idx = $index) {
          <div
            (click)="selectBox(box.id, $event)"
            [class.bg-sky-950]="box.id === projectStore.selectedBoxId()"
            [class.border-l-4]="box.id === projectStore.selectedBoxId()"
            [class.border-sky-500]="box.id === projectStore.selectedBoxId()"
            [class.opacity-50]="!box.visible"
            role="option"
            [attr.aria-selected]="box.id === projectStore.selectedBoxId()"
            class="group p-2.5 flex items-center justify-between hover:bg-slate-800/60 cursor-pointer transition">
            
            <!-- Left Info & Color -->
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <!-- Color Indicator / Picker -->
              <input
                type="color"
                [ngModel]="box.color"
                (ngModelChange)="updateColor(box.id, $event)"
                (click)="$event.stopPropagation()"
                [title]="'layers.color' | translate"
                class="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0 flex-shrink-0" />

              <!-- Box Name (Editable) -->
              <div class="min-w-0 flex-1">
                <input
                  type="text"
                  [ngModel]="box.name"
                  (ngModelChange)="updateName(box.id, $event)"
                  (click)="$event.stopPropagation()"
                  class="bg-transparent text-xs font-medium text-slate-200 focus:bg-slate-950 px-1 py-0.5 rounded border border-transparent focus:border-slate-600 focus:outline-none w-full truncate" />
                <div class="flex items-center gap-1.5">
                  <div class="text-[10px] text-slate-400 font-mono pl-1">
                    {{ formatCoord(box.minX) }}, {{ formatCoord(box.minY) }}, {{ formatCoord(box.minZ) }} &rarr;
                    {{ formatCoord(box.maxX) }}, {{ formatCoord(box.maxY) }}, {{ formatCoord(box.maxZ) }}
                  </div>
                  @if (projectStore.project().nodeboxType !== 'fixed') {
                    <span class="bg-sky-950 text-sky-400 border border-sky-800/60 rounded px-1 py-0 text-[9px] font-mono">
                      {{ box.slot || 'fixed' }}
                    </span>
                  }
                </div>
              </div>
            </div>

            <!-- Actions (Visibility, Lock, Clone, Delete, Reorder) -->
            <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 flex-shrink-0" (click)="$event.stopPropagation()">
              <!-- Visibility -->
              <button
                (click)="toggleVisibility(box.id)"
                [appTooltip]="(box.visible ? 'layers.hide' : 'layers.show') | translate"
                [appTooltipShortcutId]="'box_visibility'"
                class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition">
                <svg *ngIf="box.visible" lucideEye class="w-3.5 h-3.5"></svg>
                <svg *ngIf="!box.visible" lucideEyeOff class="w-3.5 h-3.5 text-slate-600"></svg>
              </button>

              <!-- Lock -->
              <button
                (click)="toggleLock(box.id)"
                [appTooltip]="(box.locked ? 'layers.unlock' : 'layers.lock') | translate"
                [appTooltipShortcutId]="'box_lock'"
                class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition">
                <svg *ngIf="box.locked" lucideLock class="w-3.5 h-3.5 text-amber-400"></svg>
                <svg *ngIf="!box.locked" lucideUnlock class="w-3.5 h-3.5 opacity-40 hover:opacity-100"></svg>
              </button>

              <!-- Duplicate -->
              <button
                (click)="duplicateBox(box.id)"
                [appTooltip]="'layers.duplicate' | translate"
                [appTooltipShortcutId]="'box_duplicate'"
                class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition">
                <svg lucideCopy class="w-3.5 h-3.5"></svg>
              </button>

              <!-- Move Up / Down -->
              <button
                *ngIf="canMoveUp(box.id)"
                (click)="moveBox(box.id, -1)"
                [appTooltip]="'layers.moveUp' | translate"
                class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition">
                <svg lucideArrowUp class="w-3.5 h-3.5"></svg>
              </button>
              <button
                *ngIf="canMoveDown(box.id)"
                (click)="moveBox(box.id, 1)"
                [appTooltip]="'layers.moveDown' | translate"
                class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition">
                <svg lucideArrowDown class="w-3.5 h-3.5"></svg>
              </button>

              <!-- Delete -->
              <button
                (click)="deleteBox(box.id)"
                [appTooltip]="'layers.deleteBox' | translate"
                [appTooltipShortcutId]="'box_delete'"
                class="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition">
                <svg lucideTrash2 class="w-3.5 h-3.5"></svg>
              </button>
            </div>
          </div>
        } @empty {
          <div class="p-6 text-center text-xs text-slate-500">
            {{ 'layers.empty' | translate }}
          </div>
        }
      </div>
    </div>
  `
})
export class LayerListComponent {
  public projectStore = inject(ProjectStore);
  public searchQuery = signal<string>('');
  public slotFilter = signal<string>('all');
  public connectedSlots = CONNECTED_SLOTS;
  public wallmountedSlots = WALLMOUNTED_SLOTS;

  public filteredBoxes = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const slot = this.slotFilter();
    let list = this.projectStore.boxes();
    if (slot !== 'all') {
      list = list.filter(b => (b.slot || 'fixed') === slot);
    }
    if (q) {
      list = list.filter(b => b.name.toLowerCase().includes(q));
    }
    return list;
  });

  onSlotFilterChange(slot: string): void {
    this.slotFilter.set(slot);
    if (slot !== 'all') {
      this.projectStore.setActiveSlot(slot as NodeboxSlot);
    }
  }

  canReplicate(): boolean {
    if (this.projectStore.project().nodeboxType !== 'connected') return false;
    const filter = this.slotFilter();
    if (['connect_front', 'connect_back', 'connect_left', 'connect_right'].includes(filter)) return true;
    const selected = this.projectStore.selectedBox();
    return !!selected?.slot && ['connect_front', 'connect_back', 'connect_left', 'connect_right'].includes(selected.slot);
  }

  replicateCurrentSlot(): void {
    type HorizontalSlot = 'connect_front' | 'connect_left' | 'connect_back' | 'connect_right';
    const filter = this.slotFilter();
    if (['connect_front', 'connect_back', 'connect_left', 'connect_right'].includes(filter)) {
      this.projectStore.replicateSlotToSides(filter as HorizontalSlot);
      return;
    }
    const selected = this.projectStore.selectedBox();
    if (selected?.slot && ['connect_front', 'connect_back', 'connect_left', 'connect_right'].includes(selected.slot)) {
      this.projectStore.replicateSlotToSides(selected.slot as HorizontalSlot);
    }
  }

  selectBox(id: string, event?: MouseEvent): void {
    event?.stopPropagation();
    this.projectStore.setSelectedBoxId(id);
  }

  onBackgroundClick(event: MouseEvent): void {
    if (this.projectStore.selectedBoxId()) {
      this.projectStore.setSelectedBoxId(null);
    }
  }

  addBox(): void {
    this.projectStore.addBox();
  }

  updateName(id: string, name: string): void {
    this.projectStore.updateBox(id, { name });
  }

  updateColor(id: string, color: string): void {
    this.projectStore.updateBox(id, { color });
  }

  toggleVisibility(id: string): void {
    this.projectStore.toggleBoxVisibility(id);
  }

  toggleLock(id: string): void {
    this.projectStore.toggleBoxLock(id);
  }

  duplicateBox(id: string): void {
    this.projectStore.duplicateBox(id);
  }

  deleteBox(id: string): void {
    this.projectStore.removeBox(id);
  }

  canMoveUp(id: string): boolean {
    const all = this.projectStore.boxes();
    const idx = all.findIndex(b => b.id === id);
    return idx > 0;
  }

  canMoveDown(id: string): boolean {
    const all = this.projectStore.boxes();
    const idx = all.findIndex(b => b.id === id);
    return idx !== -1 && idx < all.length - 1;
  }

  moveBox(id: string, delta: -1 | 1): void {
    const all = this.projectStore.boxes();
    const fromIndex = all.findIndex(b => b.id === id);
    if (fromIndex === -1) return;
    const toIndex = fromIndex + delta;
    if (toIndex < 0 || toIndex >= all.length) return;
    this.projectStore.reorderBoxes(fromIndex, toIndex);
  }

  formatCoord(val: number): string {
    return formatCoordinate(val, this.projectStore.project().format, this.projectStore.project().snapResolution);
  }
}
