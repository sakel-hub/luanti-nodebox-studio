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
