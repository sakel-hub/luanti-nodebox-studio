import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './features/header/header.component';
import { LayerListComponent } from './features/layers/layer-list.component';
import { ViewportComponent } from './features/viewport/viewport.component';
import { BoxInspectorComponent } from './features/inspector/box-inspector.component';
import { TextureStudioComponent } from './features/texture-studio/texture-studio.component';
import { CodeDrawerComponent } from './features/code-drawer/code-drawer.component';
import { PresetsDialogComponent } from './features/presets/presets-dialog.component';
import { ProjectStore } from './core/state/project.store';

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
    PresetsDialogComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  public projectStore = inject(ProjectStore);
  public activeRightTab = signal<RightTab>('inspector');
  public showPresetsModal = signal<boolean>(false);

  // Resizable panel dimensions
  public leftWidth = signal<number>(this.loadStoredSize('left', 280));
  public rightWidth = signal<number>(this.loadStoredSize('right', 320));
  public activeDrag = signal<DragTarget>(null);

  private loadStoredSize(panel: 'left' | 'right', fallback: number): number {
    try {
      const stored = localStorage.getItem(`luanti_panel_${panel}`);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 180 && parsed <= 700) {
          return parsed;
        }
      }
    } catch {}
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
      window.dispatchEvent(new Event('resize'));
    };

    const onMouseUp = () => {
      this.activeDrag.set(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        localStorage.setItem('luanti_panel_left', this.leftWidth().toString());
      } catch {}
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
      window.dispatchEvent(new Event('resize'));
    };

    const onTouchEnd = () => {
      this.activeDrag.set(null);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      try {
        localStorage.setItem('luanti_panel_left', this.leftWidth().toString());
      } catch {}
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
      window.dispatchEvent(new Event('resize'));
    };

    const onMouseUp = () => {
      this.activeDrag.set(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        localStorage.setItem('luanti_panel_right', this.rightWidth().toString());
      } catch {}
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
      window.dispatchEvent(new Event('resize'));
    };

    const onTouchEnd = () => {
      this.activeDrag.set(null);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      try {
        localStorage.setItem('luanti_panel_right', this.rightWidth().toString());
      } catch {}
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  }

  // Keyboard accessibility shortcuts
  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent): void {
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName);

    // Ctrl+Z (Undo) / Ctrl+Y (Redo)
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      if (event.shiftKey) {
        this.projectStore.redo();
      } else {
        this.projectStore.undo();
      }
      event.preventDefault();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      this.projectStore.redo();
      event.preventDefault();
      return;
    }

    if (isInput) return;

    // Delete or Backspace to delete selected box
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedId = this.projectStore.selectedBoxId();
      if (selectedId) {
        this.projectStore.removeBox(selectedId);
        event.preventDefault();
      }
      return;
    }

    // Arrow keys to nudge box on X / Z planes
    const selectedId = this.projectStore.selectedBoxId();
    if (selectedId) {
      if (event.key === 'ArrowLeft') {
        this.projectStore.nudgeBox(selectedId, 'x', -1);
        event.preventDefault();
      } else if (event.key === 'ArrowRight') {
        this.projectStore.nudgeBox(selectedId, 'x', 1);
        event.preventDefault();
      } else if (event.key === 'ArrowUp') {
        this.projectStore.nudgeBox(selectedId, 'z', 1);
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        this.projectStore.nudgeBox(selectedId, 'z', -1);
        event.preventDefault();
      }
    }
  }
}
