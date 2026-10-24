import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LUANTI_PRESETS } from '../../core/models/presets.data';
import { PresetTemplate } from '../../core/models/nodebox.model';
import { ProjectStore } from '../../core/state/project.store';
import { LucideX } from '@lucide/angular';

@Component({
  selector: 'app-presets-dialog',
  standalone: true,
  imports: [CommonModule, LucideX],
  template: `
    <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <!-- Header -->
        <div class="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-100">Luanti NodeBox Presets</h2>
            <p class="text-xs text-slate-400">Choose a starting template to quickly model common Luanti shapes</p>
          </div>
          <button
            (click)="close.emit()"
            class="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label="Close dialog">
            <svg lucideX class="w-5 h-5"></svg>
          </button>
        </div>

        <!-- Preset Cards Grid -->
        <div class="p-4 grid grid-cols-2 gap-3 overflow-y-auto">
          @for (preset of presets; track preset.name) {
            <div
              (click)="applyPreset(preset)"
              class="p-3.5 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/80 rounded-lg cursor-pointer transition flex flex-col justify-between group">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="font-semibold text-sm text-slate-100 group-hover:text-sky-400 transition">
                    {{ preset.name }}
                  </span>
                  <span class="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                    {{ preset.boxes.length }} {{ preset.boxes.length === 1 ? 'box' : 'boxes' }}
                  </span>
                </div>
                <p class="text-xs text-slate-400 line-clamp-2">{{ preset.description }}</p>
              </div>

              <div class="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Load template</span>
                <span class="text-sky-400 group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            (click)="close.emit()"
            class="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `
})
export class PresetsDialogComponent {
  @Output() close = new EventEmitter<void>();

  private projectStore = inject(ProjectStore);
  public readonly presets = LUANTI_PRESETS;

  applyPreset(preset: PresetTemplate): void {
    this.projectStore.loadPreset(preset);
    this.close.emit();
  }
}
