import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/state/project.store';
import { formatCoordinate } from '../../core/utils/fraction.utils';

@Component({
  selector: 'app-layer-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-slate-900 border-r border-slate-800 select-none">
      <!-- Panel Header -->
      <div class="p-3 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-sm text-slate-200">Boxes & Layers</span>
          <span class="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full font-mono">
            {{ projectStore.boxes().length }}
          </span>
        </div>
        <button
          (click)="addBox()"
          class="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white text-xs px-2.5 py-1.5 rounded-md font-medium shadow-sm transition active:scale-95"
          title="Add new bounding box to nodebox">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Box
        </button>
      </div>

      <!-- Search Input -->
      <div class="p-2 border-b border-slate-800">
        <input
          type="text"
          [ngModel]="searchQuery()"
          (ngModelChange)="searchQuery.set($event)"
          placeholder="Filter boxes..."
          class="w-full bg-slate-950/80 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition" />
      </div>

      <!-- Box List -->
      <div class="flex-1 overflow-y-auto divide-y divide-slate-800/60" role="listbox" aria-label="Boxes list">
        @for (box of filteredBoxes(); track box.id; let idx = $index) {
          <div
            (click)="selectBox(box.id)"
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
                title="Change display color"
                class="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0 flex-shrink-0" />

              <!-- Box Name (Editable) -->
              <div class="min-w-0 flex-1">
                <input
                  type="text"
                  [ngModel]="box.name"
                  (ngModelChange)="updateName(box.id, $event)"
                  (click)="$event.stopPropagation()"
                  class="bg-transparent text-xs font-medium text-slate-200 focus:bg-slate-950 px-1 py-0.5 rounded border border-transparent focus:border-slate-600 focus:outline-none w-full truncate" />
                <div class="text-[10px] text-slate-400 font-mono pl-1">
                  {{ formatCoord(box.minX) }}, {{ formatCoord(box.minY) }}, {{ formatCoord(box.minZ) }} &rarr;
                  {{ formatCoord(box.maxX) }}, {{ formatCoord(box.maxY) }}, {{ formatCoord(box.maxZ) }}
                </div>
              </div>
            </div>

            <!-- Actions (Visibility, Lock, Clone, Delete, Reorder) -->
            <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 flex-shrink-0" (click)="$event.stopPropagation()">
              <!-- Visibility -->
              <button
                (click)="toggleVisibility(box.id)"
                [title]="box.visible ? 'Hide box' : 'Show box'"
                class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition">
                <svg *ngIf="box.visible" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg *ngIf="!box.visible" class="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              </button>

              <!-- Lock -->
              <button
                (click)="toggleLock(box.id)"
                [title]="box.locked ? 'Unlock box' : 'Lock box against accidental edits'"
                class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition">
                <svg *ngIf="box.locked" class="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <svg *ngIf="!box.locked" class="w-3.5 h-3.5 opacity-40 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </button>

              <!-- Duplicate -->
              <button
                (click)="duplicateBox(box.id)"
                title="Duplicate box"
                class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
              </button>

              <!-- Move Up / Down -->
              <button
                *ngIf="idx > 0"
                (click)="moveBox(idx, idx - 1)"
                title="Move up"
                class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                *ngIf="idx < filteredBoxes().length - 1"
                (click)="moveBox(idx, idx + 1)"
                title="Move down"
                class="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Delete -->
              <button
                (click)="deleteBox(box.id)"
                title="Delete box"
                class="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        } @empty {
          <div class="p-6 text-center text-xs text-slate-500">
            No boxes found. Click <strong>Add Box</strong> or load a preset.
          </div>
        }
      </div>
    </div>
  `
})
export class LayerListComponent {
  public projectStore = inject(ProjectStore);
  public searchQuery = signal<string>('');

  public filteredBoxes = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const all = this.projectStore.boxes();
    if (!q) return all;
    return all.filter(b => b.name.toLowerCase().includes(q));
  });

  selectBox(id: string): void {
    this.projectStore.setSelectedBoxId(id);
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

  moveBox(from: number, to: number): void {
    this.projectStore.reorderBoxes(from, to);
  }

  formatCoord(val: number): string {
    return formatCoordinate(val, this.projectStore.project().format, this.projectStore.project().snapResolution);
  }
}
