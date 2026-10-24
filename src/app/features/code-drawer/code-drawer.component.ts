import { Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/state/project.store';
import { LuaGeneratorService } from '../../core/services/lua-generator.service';
import { LuaParserService, ParseResult } from '../../core/services/lua-parser.service';
import { ExportTemplate, FractionFormat } from '../../core/models/nodebox.model';
import { TextureService } from '../../core/services/texture.service';
import { safeGetItem, safeSetItem } from '../../core/utils/storage.utils';

const STORAGE_HEIGHT_KEY = 'luanti_drawer_height';

@Component({
  selector: 'app-code-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      [style.height.px]="isEmbedded ? null : (isExpanded() ? drawerHeight() : 40)"
      [class.h-full]="isEmbedded"
      class="bg-slate-900 border-t border-slate-800 flex flex-col select-none relative transition-[height] duration-75">
      
      @if (!isEmbedded) {
        <!-- Top Resizing Handle Bar (Desktop only) -->
        <div
          (mousedown)="startResize($event)"
          (touchstart)="startResizeTouch($event)"
          (dblclick)="isExpanded.set(!isExpanded())"
          title="Drag up/down to resize code drawer, double-click to toggle"
          class="h-1.5 w-full bg-slate-950/60 hover:bg-sky-500 active:bg-sky-400 cursor-row-resize flex items-center justify-center transition-colors group">
          <div class="w-12 h-0.5 rounded-full bg-slate-700 group-hover:bg-white transition-colors"></div>
        </div>
      }

      <!-- Drawer Header Bar -->
      <div class="min-h-9 py-1 px-3 bg-slate-950 flex flex-wrap items-center justify-between border-b border-slate-800 text-xs gap-2">
        <div class="flex items-center gap-3">
          @if (!isEmbedded) {
            <!-- Expand/Collapse Button -->
            <button
              (click)="isExpanded.set(!isExpanded())"
              class="flex items-center gap-1.5 font-semibold text-slate-200 hover:text-white transition">
              <svg
                [class.rotate-180]="isExpanded()"
                class="w-4 h-4 transition-transform text-slate-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
              </svg>
              <span>Lua Code & Import/Export</span>
            </button>
          }

          <!-- Tabs -->
          @if (isEmbedded || isExpanded()) {
            <div class="flex bg-slate-900 p-0.5 rounded border border-slate-800" [class.ml-2]="!isEmbedded">
              <button
                (click)="activeTab.set('export')"
                [class.bg-sky-600]="activeTab() === 'export'"
                [class.text-white]="activeTab() === 'export'"
                [class.text-slate-400]="activeTab() !== 'export'"
                class="px-2.5 py-1 rounded text-xs font-medium transition">
                Export Lua
              </button>
              <button
                (click)="activeTab.set('import')"
                [class.bg-sky-600]="activeTab() === 'import'"
                [class.text-white]="activeTab() === 'import'"
                [class.text-slate-400]="activeTab() !== 'import'"
                class="px-2.5 py-1 rounded text-xs font-medium transition">
                Import from Mod
              </button>
            </div>
          }
        </div>

        <!-- Right Header Actions (Export Options) -->
        @if ((isEmbedded || isExpanded()) && activeTab() === 'export') {
          <div class="flex items-center gap-1.5 flex-wrap">
            <!-- Fraction Format Selector -->
            <select
              [ngModel]="projectStore.project().format"
              (ngModelChange)="onFormatChange($event)"
              class="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-500 font-mono">
              <option value="fractions_16">Fractions (16ths: -8/16)</option>
              <option value="divisible_16_8">Divisible 16/8 (-4/8, 16/8)</option>
              <option value="fractions_simplified">Simplified (-1/2, 1/4)</option>
              <option value="decimals">Decimals (-0.5, 0.3125)</option>
              <option value="grid_integers">Grid Integers (-8, 5)</option>
            </select>

            <!-- Template Selector -->
            <select
              [ngModel]="projectStore.project().exportTemplate"
              (ngModelChange)="onTemplateChange($event)"
              class="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-500 font-mono">
              <option value="register_node">core.register_node</option>
              <option value="node_box">node_box = &#123; ... &#125;</option>
              <option value="fixed_only">fixed = &#123; ... &#125;</option>
            </select>

            <!-- Copy Code Button -->
            <button
              (click)="copyCode()"
              class="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1 rounded font-medium shadow-sm transition active:scale-95 text-xs">
              <svg *ngIf="!copied()" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              <svg *ngIf="copied()" class="w-3.5 h-3.5 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ copied() ? 'Copied!' : 'Copy Code' }}</span>
            </button>

            <!-- Download Lua File -->
            <button
              (click)="downloadLua()"
              title="Download as .lua file"
              class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>
        }
      </div>

      <!-- Drawer Content -->
      @if (isEmbedded || isExpanded()) {
        <div class="flex-1 overflow-hidden p-3 flex flex-col min-h-0">
          <!-- TAB 1: EXPORT LUA -->
          @if (activeTab() === 'export') {
            <div class="relative flex-1 bg-slate-950 rounded-lg border border-slate-800 p-3 overflow-auto font-mono text-xs text-slate-200">
              <pre class="leading-relaxed select-text">{{ generatedLua() }}</pre>
            </div>
          }

          <!-- TAB 2: IMPORT FROM MOD -->
          @if (activeTab() === 'import') {
            <div class="flex-1 flex flex-col space-y-2 min-h-0">
              <div class="flex flex-wrap items-center justify-between text-xs gap-2">
                <span class="text-slate-400">
                  Paste Lua code from any Luanti mod:
                </span>
                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input type="radio" name="importMode" [(ngModel)]="importReplace" [value]="true" />
                    Replace current boxes
                  </label>
                  <label class="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input type="radio" name="importMode" [(ngModel)]="importReplace" [value]="false" />
                    Append to existing
                  </label>
                </div>
              </div>

              <!-- Paste textarea -->
              <textarea
                [(ngModel)]="pastedCode"
                placeholder="-- Paste Lua nodebox definition here, e.g.:&#10;fixed = {&#10;    {-8/16, -8/16, -8/16, 8/16, 0, 8/16},&#10;    {-4/16, 0, -4/16, 4/16, 8/16, 4/16},&#10;}"
                class="flex-1 bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none select-text min-h-[140px]"></textarea>

              <!-- Import Actions & Feedback -->
              <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div class="text-xs">
                  @if (lastParseResult(); as res) {
                    @if (res.warnings.length > 0) {
                      <span class="text-amber-400">{{ res.warnings.join(' | ') }}</span>
                    } @else if (res.boxes.length > 0) {
                      <span class="text-emerald-400">
                        Successfully imported {{ res.boxes.length }} boxes!
                        {{ res.nodeName ? 'Node: ' + res.nodeName : '' }}
                      </span>
                    }
                  }
                </div>

                <button
                  (click)="executeImport()"
                  [disabled]="!pastedCode.trim()"
                  class="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium text-xs shadow-sm transition active:scale-95">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Parse & Visualize in 3D
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class CodeDrawerComponent {
  @Input() isEmbedded: boolean = false;

  public projectStore = inject(ProjectStore);
  public luaGenerator = inject(LuaGeneratorService);
  public luaParser = inject(LuaParserService);
  public textureService = inject(TextureService);

  public isExpanded = signal<boolean>(false);
  public drawerHeight = signal<number>(this.loadStoredHeight());
  public activeTab = signal<'export' | 'import'>('export');
  public copied = signal<boolean>(false);

  public pastedCode = '';
  public importReplace = true;
  public lastParseResult = signal<ParseResult | null>(null);

  public generatedLua = computed(() => {
    return this.luaGenerator.generate(this.projectStore.project());
  });

  private loadStoredHeight(): number {
    const val = safeGetItem(STORAGE_HEIGHT_KEY);
    if (val) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 100 && num <= 800) return num;
    }
    return 280;
  }

  public startResize(event: MouseEvent): void {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = this.drawerHeight();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(120, Math.min(window.innerHeight * 0.75, startHeight + deltaY));
      this.drawerHeight.set(newHeight);
      if (!this.isExpanded()) {
        this.isExpanded.set(true);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.dispatchEvent(new Event('resize'));
      safeSetItem(STORAGE_HEIGHT_KEY, this.drawerHeight().toString());
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  public startResizeTouch(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    const startY = event.touches[0].clientY;
    const startHeight = this.drawerHeight();

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) return;
      const deltaY = startY - moveEvent.touches[0].clientY;
      const newHeight = Math.max(120, Math.min(window.innerHeight * 0.75, startHeight + deltaY));
      this.drawerHeight.set(newHeight);
      if (!this.isExpanded()) {
        this.isExpanded.set(true);
      }
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.dispatchEvent(new Event('resize'));
      safeSetItem(STORAGE_HEIGHT_KEY, this.drawerHeight().toString());
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  }

  public onFormatChange(format: FractionFormat): void {
    this.projectStore.setFormat(format);
  }

  public onTemplateChange(template: ExportTemplate): void {
    this.projectStore.setExportTemplate(template);
  }

  public copyCode(): void {
    navigator.clipboard.writeText(this.generatedLua()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  public downloadLua(): void {
    const code = this.generatedLua();
    const filename = `${this.projectStore.project().nodeName.replace(':', '_') || 'nodebox'}.lua`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  public executeImport(): void {
    const result = this.luaParser.parse(this.pastedCode);
    this.lastParseResult.set(result);

    if (result.boxes.length > 0) {
      if (this.importReplace) {
        this.projectStore.loadBoxes(result.boxes, result.nodeName, result.tiles);
      } else {
        result.boxes.forEach((b) => this.projectStore.addBox(b));
      }

      if (result.tiles && result.tiles.length > 0) {
        this.textureService.applyParsedTiles(result.tiles);
      }
    }
  }
}
