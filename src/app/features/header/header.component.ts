import { Component, EventEmitter, HostListener, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/state/project.store';
import { FractionFormat, NodeboxProject } from '../../core/models/nodebox.model';
import { TooltipDirective } from '../../shared/directives/tooltip.directive';
import { KeyboardShortcutsService } from '../../core/services/keyboard-shortcuts.service';
import { ThemeService } from '../../core/services/theme.service';
import { LucideUndo, LucideRedo, LucideKeyboard, LucideSun, LucideMoon } from '@lucide/angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipDirective, LucideUndo, LucideRedo, LucideKeyboard, LucideSun, LucideMoon],
  template: `
    <header class="h-12 bg-slate-950 border-b border-slate-800 px-3 flex items-center justify-between text-xs select-none z-20">
      <!-- Left: Logo & Project Naming -->
      <div class="flex items-center gap-3">
        <!-- Logo -->
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <div class="font-bold text-slate-100 text-xs tracking-tight flex items-center gap-1.5">
              <span>Luanti NodeBox Studio</span>
              <span class="text-[9px] bg-sky-950 text-sky-400 border border-sky-800 px-1.5 py-0.2 rounded font-mono">PWA</span>
            </div>
          </div>
        </div>

        <div class="h-5 w-px bg-slate-800 mx-1"></div>

        <!-- Project Title & Node Name -->
        <div class="flex items-center gap-2">
          <input
            type="text"
            [ngModel]="projectStore.project().name"
            (ngModelChange)="projectStore.setProjectName($event)"
            title="Project title"
            class="bg-transparent hover:bg-slate-900 focus:bg-slate-900 border border-transparent hover:border-slate-800 focus:border-slate-700 rounded px-2 py-1 text-slate-200 font-medium focus:outline-none transition w-36" />
          <span class="text-slate-500">:</span>
          <input
            type="text"
            [ngModel]="projectStore.project().nodeName"
            (ngModelChange)="projectStore.setNodeName($event)"
            title="Luanti node registration string (modname:nodename)"
            placeholder="mod:nodename"
            class="bg-transparent hover:bg-slate-900 focus:bg-slate-900 border border-transparent hover:border-slate-800 focus:border-slate-700 rounded px-2 py-1 text-slate-400 font-mono focus:outline-none transition w-44" />
        </div>
      </div>

      <!-- Center: History & Presets -->
      <div class="flex items-center gap-1">
        <!-- Undo / Redo -->
        <button
          (click)="projectStore.undo()"
          [disabled]="!projectStore.canUndo()"
          [appTooltip]="'Undo'"
          [appTooltipShortcutId]="'edit_undo'"
          class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition">
          <svg lucideUndo class="w-4 h-4"></svg>
        </button>
        <button
          (click)="projectStore.redo()"
          [disabled]="!projectStore.canRedo()"
          [appTooltip]="'Redo'"
          [appTooltipShortcutId]="'edit_redo'"
          class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition">
          <svg lucideRedo class="w-4 h-4"></svg>
        </button>

        <div class="h-4 w-px bg-slate-800 mx-1"></div>

        <!-- Presets Button -->
        <button
          (click)="openPresets.emit()"
          [appTooltip]="'Model presets and starter templates'"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 font-medium transition">
          <svg class="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Presets
        </button>

        <!-- Presentation Render Mode Button -->
        <button
          (click)="projectStore.toggleRenderMode(true)"
          [appTooltip]="'Distraction-free presentation render mode'"
          [appTooltipShortcutId]="'view_render_mode'"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium transition text-xs">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Render</span>
        </button>

        <!-- Keyboard Shortcuts Button -->
        <button
          (click)="shortcutsService.openShortcutsModal()"
          [appTooltip]="'Keyboard Shortcuts'"
          [appTooltipShortcutId]="'help_shortcuts'"
          class="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 font-medium transition text-xs">
          <svg lucideKeyboard class="w-3.5 h-3.5 text-sky-400"></svg>
          <span class="hidden sm:inline">Shortcuts</span>
        </button>

        <!-- New Button -->
        <button
          (click)="confirmReset()"
          [appTooltip]="'Reset and start new model'"
          class="px-2.5 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
          New
        </button>
      </div>

      <!-- Right: Grid Snap, JSON Export/Import, PWA Install -->
      <div class="flex items-center gap-2">
        <!-- Snap Resolution Selector -->
        <div class="flex items-center gap-1 text-[11px] bg-slate-900 border border-slate-800 rounded px-2 py-0.5">
          <span class="text-slate-500 font-mono">Snap:</span>
          <select
            [ngModel]="projectStore.project().snapResolution"
            (ngModelChange)="projectStore.setSnapResolution($event)"
            class="bg-transparent text-slate-300 focus:outline-none cursor-pointer font-mono">
            <option [value]="16">1/16</option>
            <option [value]="32">1/32</option>
            <option [value]="64">1/64</option>
          </select>
        </div>

        <!-- Model Height Selector (1 Node vs 2 Nodes) -->
        <div class="flex items-center gap-1 text-[11px] bg-slate-900 border border-slate-800 rounded px-2 py-0.5">
          <span class="text-slate-500 font-mono">Height:</span>
          <select
            [ngModel]="projectStore.project().nodeHeight"
            (ngModelChange)="projectStore.setNodeHeight(+$event)"
            class="bg-transparent text-slate-300 focus:outline-none cursor-pointer font-mono">
            <option [value]="1">1 Node</option>
            <option [value]="2">2 Nodes</option>
          </select>
        </div>

        <!-- Project JSON Save / Load -->
        <button
          (click)="exportProjectJson()"
          title="Save project as JSON"
          class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        </button>

        <label
          title="Load project JSON"
          class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer transition">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <input type="file" accept=".json" (change)="importProjectJson($event)" class="hidden" />
        </label>

        <!-- Theme Toggle (Dark / Light) -->
        <button
          (click)="themeService.toggleTheme()"
          [appTooltip]="themeService.theme() === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">
          @if (themeService.theme() === 'dark') {
            <svg lucideSun class="w-4 h-4 text-amber-400"></svg>
          } @else {
            <svg lucideMoon class="w-4 h-4 text-sky-400"></svg>
          }
        </button>

        <!-- Install PWA App Button (if available) -->
        @if (canInstallPwa()) {
          <button
            (click)="installPwa()"
            class="flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-medium px-2.5 py-1 rounded shadow transition">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Install App
          </button>
        }
      </div>
    </header>
  `
})
export class HeaderComponent {
  @Output() openPresets = new EventEmitter<void>();

  public projectStore = inject(ProjectStore);
  public shortcutsService = inject(KeyboardShortcutsService);
  public themeService = inject(ThemeService);
  public canInstallPwa = signal<boolean>(false);
  private deferredPrompt: any = null;

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: any): void {
    event.preventDefault();
    this.deferredPrompt = event;
    this.canInstallPwa.set(true);
  }

  installPwa(): void {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then(() => {
      this.deferredPrompt = null;
      this.canInstallPwa.set(false);
    });
  }

  confirmReset(): void {
    if (confirm('Start a new project? Any unsaved changes to this model will be replaced.')) {
      this.projectStore.resetProject();
    }
  }

  exportProjectJson(): void {
    const data = JSON.stringify(this.projectStore.project(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.projectStore.project().nodeName.replace(':', '_') || 'nodebox'}_project.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importProjectJson(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as NodeboxProject;
        if (parsed && Array.isArray(parsed.boxes)) {
          this.projectStore.loadProject(parsed);
        }
      } catch {
        alert('Invalid JSON project file.');
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file);
  }
}
