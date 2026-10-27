import { Component, HostListener, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './features/header/header.component';
import { LayerListComponent } from './features/layers/layer-list.component';
import { ViewportComponent } from './features/viewport/viewport.component';
import { BoxInspectorComponent } from './features/inspector/box-inspector.component';
import { TextureStudioComponent } from './features/texture-studio/texture-studio.component';
import { CodeDrawerComponent } from './features/code-drawer/code-drawer.component';
import { PresetsDialogComponent } from './features/presets/presets-dialog.component';
import { ShortcutsDialogComponent } from './features/shortcuts/shortcuts-dialog.component';
import { HelpDialogComponent } from './features/help/help-dialog.component';
import { ShareDialogComponent } from './features/share/share-dialog.component';
import { ProjectStore } from './core/state/project.store';
import { KeyboardShortcutsService } from './core/services/keyboard-shortcuts.service';
import { TexturePainterService } from './core/services/texture-painter.service';
import { TranslationService } from './core/i18n/translation.service';
import { TranslatePipe } from './core/i18n/translate.pipe';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { LucideSparkles, LucideRefreshCw, LucideX } from '@lucide/angular';
import { safeGetItem, safeSetItem } from './core/utils/storage.utils';

export type RightTab = 'inspector' | 'textures';
export type DragTarget = 'left' | 'right' | null;
export type MobileTab = 'none' | 'layers' | 'inspector' | 'textures' | 'code';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    LayerListComponent,
    ViewportComponent,
    BoxInspectorComponent,
    TextureStudioComponent,
    CodeDrawerComponent,
    PresetsDialogComponent,
    ShortcutsDialogComponent,
    HelpDialogComponent,
    ShareDialogComponent,
    TranslatePipe,
    LucideSparkles,
    LucideRefreshCw,
    LucideX
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  public projectStore = inject(ProjectStore);
  public keyboardShortcuts = inject(KeyboardShortcutsService);
  public painterService = inject(TexturePainterService);
  public translation = inject(TranslationService);
  public pwaUpdateService = inject(PwaUpdateService);
  public activeRightTab = signal<RightTab>('inspector');
  public showPresetsModal = signal<boolean>(false);
  public showHelpModal = signal<boolean>(false);
  public showShareModal = signal<boolean>(false);

  // Mobile navigation and sheet state
  public mobileSheetTab = signal<MobileTab>('none');
  public mobileSheetTitle = computed(() => {
    switch (this.mobileSheetTab()) {
      case 'layers': return this.translation.t('layers.title');
      case 'inspector': return this.translation.t('inspector.title');
      case 'textures': return this.translation.t('textureStudio.title');
      case 'code': return this.translation.t('codeDrawer.title');
      default: return '';
    }
  });

  // Resizable panel dimensions (desktop)
  public leftWidth = signal<number>(this.loadStoredSize('left', 280));
  public rightWidth = signal<number>(this.loadStoredSize('right', 320));
  public activeDrag = signal<DragTarget>(null);

  constructor() {
    try {
      effect(() => {
        const req = this.painterService.requestOpenPainter();
        if (req > 0) {
          untracked(() => {
            this.activeRightTab.set('textures');
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              this.mobileSheetTab.set('textures');
            } else if (this.rightWidth() < 360) {
              this.rightWidth.set(360);
            }
          });
        }
      });
    } catch {
      // Ignore missing ChangeDetectionScheduler in unit test environment
    }
  }

  private loadStoredSize(panel: 'left' | 'right', fallback: number): number {
    const stored = safeGetItem(`luanti_panel_${panel}`);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 180 && parsed <= 700) {
        return parsed;
      }
    }
    return fallback;
  }

  public openMobileTab(tab: MobileTab): void {
    if (this.mobileSheetTab() === tab) {
      this.mobileSheetTab.set('none');
      return;
    }
    if (tab === 'inspector') {
      this.activeRightTab.set('inspector');
    } else if (tab === 'textures') {
      this.activeRightTab.set('textures');
    }
    this.mobileSheetTab.set(tab);
  }

  public closeMobileSheet(): void {
    this.mobileSheetTab.set('none');
  }

  // --- Left Splitter Resize (Horizontal) ---
  public startLeftResize(event: MouseEvent): void {
    event.preventDefault();
    this.activeDrag.set('left');
    const startX = event.clientX;
    const startWidth = this.leftWidth();

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(180, Math.min(window.innerWidth * 0.45, startWidth + deltaX));
      this.leftWidth.set(newWidth);
    };

    const onMouseUp = () => {
      this.activeDrag.set(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.dispatchEvent(new Event('resize'));
      safeSetItem('luanti_panel_left', this.leftWidth().toString());
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  public startLeftResizeTouch(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    this.activeDrag.set('left');
    const startX = event.touches[0].clientX;
    const startWidth = this.leftWidth();

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - startX;
      const newWidth = Math.max(180, Math.min(window.innerWidth * 0.45, startWidth + deltaX));
      this.leftWidth.set(newWidth);
    };

    const onTouchEnd = () => {
      this.activeDrag.set(null);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.dispatchEvent(new Event('resize'));
      safeSetItem('luanti_panel_left', this.leftWidth().toString());
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  }

  // --- Right Splitter Resize (Horizontal) ---
  public startRightResize(event: MouseEvent): void {
    event.preventDefault();
    this.activeDrag.set('right');
    const startX = event.clientX;
    const startWidth = this.rightWidth();

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX;
      const newWidth = Math.max(220, Math.min(window.innerWidth * 0.48, startWidth + deltaX));
      this.rightWidth.set(newWidth);
    };

    const onMouseUp = () => {
      this.activeDrag.set(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.dispatchEvent(new Event('resize'));
      safeSetItem('luanti_panel_right', this.rightWidth().toString());
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  public startRightResizeTouch(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    this.activeDrag.set('right');
    const startX = event.touches[0].clientX;
    const startWidth = this.rightWidth();

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const deltaX = startX - e.touches[0].clientX;
      const newWidth = Math.max(220, Math.min(window.innerWidth * 0.48, startWidth + deltaX));
      this.rightWidth.set(newWidth);
    };

    const onTouchEnd = () => {
      this.activeDrag.set(null);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.dispatchEvent(new Event('resize'));
      safeSetItem('luanti_panel_right', this.rightWidth().toString());
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  }

  // Keyboard accessibility & 3D workflow shortcuts
  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.mobileSheetTab() !== 'none') {
      this.closeMobileSheet();
      return;
    }
    this.keyboardShortcuts.handleKeyDown(event);
  }
}
