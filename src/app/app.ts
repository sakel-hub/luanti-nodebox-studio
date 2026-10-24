import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './features/header/header.component';
import { LayerListComponent } from './features/layers/layer-list.component';
import { ViewportComponent } from './features/viewport/viewport.component';
import { BoxInspectorComponent } from './features/inspector/box-inspector.component';
import { TextureStudioComponent } from './features/texture-studio/texture-studio.component';
import { CodeDrawerComponent } from './features/code-drawer/code-drawer.component';
import { PresetsDialogComponent } from './features/presets/presets-dialog.component';
import { ShortcutsDialogComponent } from './features/shortcuts/shortcuts-dialog.component';
import { ProjectStore } from './core/state/project.store';
import { KeyboardShortcutsService } from './core/services/keyboard-shortcuts.service';
import { safeGetItem, safeSetItem } from './core/utils/storage.utils';

export type RightTab = 'inspector' | 'textures';
export type DragTarget = 'left' | 'right' | null;

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
    ShortcutsDialogComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  public projectStore = inject(ProjectStore);
  public keyboardShortcuts = inject(KeyboardShortcutsService);
  public activeRightTab = signal<RightTab>('inspector');
  public showPresetsModal = signal<boolean>(false);

  // Resizable panel dimensions
  public leftWidth = signal<number>(this.loadStoredSize('left', 280));
  public rightWidth = signal<number>(this.loadStoredSize('right', 320));
  public activeDrag = signal<DragTarget>(null);

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
    this.keyboardShortcuts.handleKeyDown(event);
  }
}
