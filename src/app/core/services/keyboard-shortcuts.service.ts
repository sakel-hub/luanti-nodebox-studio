import { Injectable, inject, signal } from '@angular/core';
import { ProjectStore } from '../state/project.store';
import { BabylonSceneService } from '../../features/viewport/services/babylon-scene.service';

export interface ShortcutDefinition {
  id: string;
  name: string;
  description: string;
  category: 'Tools' | 'Viewport' | 'Box' | 'Edit' | 'General';
  macKey: string;
  winKey: string;
  keyDisplay: string;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService {
  private projectStore: ProjectStore | null = null;
  private sceneService: BabylonSceneService | null = null;

  public readonly isShortcutsModalOpen = signal<boolean>(false);
  public readonly isMac: boolean;

  public readonly shortcuts: ShortcutDefinition[] = [
    // Tools
    {
      id: 'tool_move',
      name: 'Move Tool',
      description: 'Translate box along snapped grid axes',
      category: 'Tools',
      macKey: 'W',
      winKey: 'W',
      keyDisplay: 'W'
    },
    {
      id: 'tool_rotate',
      name: 'Rotate Tool',
      description: 'Rotate box in 90° Luanti increments',
      category: 'Tools',
      macKey: 'E',
      winKey: 'E',
      keyDisplay: 'E'
    },
    {
      id: 'tool_scale',
      name: 'Scale (Center) Tool',
      description: 'Symmetrically scale box from its center',
      category: 'Tools',
      macKey: 'R',
      winKey: 'R',
      keyDisplay: 'R'
    },
    {
      id: 'tool_resize',
      name: 'Resize (Faces) Tool',
      description: 'Resize selected face anchored to opposite side',
      category: 'Tools',
      macKey: 'T',
      winKey: 'T',
      keyDisplay: 'T'
    },
    {
      id: 'tool_paint',
      name: '3D Paint Brush',
      description: 'Paint pixels directly on 3D nodebox faces',
      category: 'Tools',
      macKey: 'P',
      winKey: 'P',
      keyDisplay: 'P'
    },
    {
      id: 'tool_select',
      name: 'Select Mode / Gizmo Off',
      description: 'Hide gizmos, pointer selection only',
      category: 'Tools',
      macKey: 'Q',
      winKey: 'Q',
      keyDisplay: 'Q'
    },

    // Viewport
    {
      id: 'view_reset',
      name: 'Reset Camera View',
      description: 'Center and frame camera view on the model',
      category: 'Viewport',
      macKey: 'F',
      winKey: 'F',
      keyDisplay: 'F'
    },
    {
      id: 'view_grid',
      name: 'Toggle Floor Grid',
      description: 'Show or hide 16x16 reference floor grid',
      category: 'Viewport',
      macKey: 'G',
      winKey: 'G',
      keyDisplay: 'G'
    },
    {
      id: 'view_cage',
      name: 'Toggle Node Cage',
      description: 'Show or hide 1x1x1 boundary node cage',
      category: 'Viewport',
      macKey: 'C',
      winKey: 'C',
      keyDisplay: 'C'
    },
    {
      id: 'view_ortho',
      name: 'Perspective / Ortho View',
      description: 'Toggle perspective or orthographic camera projection',
      category: 'Viewport',
      macKey: '5',
      winKey: '5',
      keyDisplay: '5'
    },
    {
      id: 'view_render_mode',
      name: 'Render Mode',
      description: 'Toggle distraction-free presentation render mode',
      category: 'Viewport',
      macKey: 'F10',
      winKey: 'F10',
      keyDisplay: 'F10'
    },

    // Edit & History
    {
      id: 'edit_undo',
      name: 'Undo',
      description: 'Revert last modification',
      category: 'Edit',
      macKey: '⌘Z',
      winKey: 'Ctrl+Z',
      keyDisplay: ''
    },
    {
      id: 'edit_redo',
      name: 'Redo',
      description: 'Reapply undone modification',
      category: 'Edit',
      macKey: '⌘⇧Z or ⌘Y',
      winKey: 'Ctrl+Y or Ctrl+Shift+Z',
      keyDisplay: ''
    },

    // Box & Layers
    {
      id: 'box_new',
      name: 'Add Box',
      description: 'Add a new default nodebox layer',
      category: 'Box',
      macKey: 'N',
      winKey: 'N',
      keyDisplay: 'N'
    },
    {
      id: 'box_duplicate',
      name: 'Duplicate Box',
      description: 'Clone the currently selected box',
      category: 'Box',
      macKey: '⌘D',
      winKey: 'Ctrl+D',
      keyDisplay: ''
    },
    {
      id: 'box_delete',
      name: 'Delete Box',
      description: 'Remove selected box',
      category: 'Box',
      macKey: '⌫ or Delete',
      winKey: 'Delete or Backspace',
      keyDisplay: ''
    },
    {
      id: 'box_deselect',
      name: 'Deselect Box',
      description: 'Clear current box selection',
      category: 'Box',
      macKey: 'Esc',
      winKey: 'Esc',
      keyDisplay: 'Esc'
    },
    {
      id: 'box_visibility',
      name: 'Toggle Visibility',
      description: 'Show or hide selected box in 3D',
      category: 'Box',
      macKey: 'H',
      winKey: 'H',
      keyDisplay: 'H'
    },
    {
      id: 'box_lock',
      name: 'Toggle Lock',
      description: 'Lock or unlock selected box against accidental edits',
      category: 'Box',
      macKey: 'L',
      winKey: 'L',
      keyDisplay: 'L'
    },
    {
      id: 'box_nudge_xz',
      name: 'Nudge X / Z',
      description: 'Nudge selected box 1 grid step along ground axes',
      category: 'Box',
      macKey: '← ↑ → ↓',
      winKey: 'Arrow Keys',
      keyDisplay: 'Arrow Keys'
    },
    {
      id: 'box_nudge_y',
      name: 'Nudge Y (Up / Down)',
      description: 'Nudge selected box 1 grid step vertically',
      category: 'Box',
      macKey: '⇧↑ / ⇧↓',
      winKey: 'Shift + ↑ / ↓',
      keyDisplay: ''
    },

    // General
    {
      id: 'help_shortcuts',
      name: 'Keyboard Shortcuts Cheat Sheet',
      description: 'Open this shortcuts overview modal dialog',
      category: 'General',
      macKey: '?',
      winKey: '?',
      keyDisplay: '?'
    }
  ];

  constructor() {
    try {
      this.projectStore = inject(ProjectStore, { optional: true });
    } catch {
      this.projectStore = null;
    }

    try {
      this.sceneService = inject(BabylonSceneService, { optional: true });
    } catch {
      this.sceneService = null;
    }

    this.isMac = typeof navigator !== 'undefined' &&
      /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent || '');

    // Initialize keyDisplay dynamically based on OS
    for (const s of this.shortcuts) {
      if (!s.keyDisplay) {
        s.keyDisplay = this.isMac ? s.macKey : s.winKey;
      }
    }
  }

  public setDependencies(projectStore: ProjectStore, sceneService: BabylonSceneService): void {
    this.projectStore = projectStore;
    this.sceneService = sceneService;
  }

  public getShortcut(id: string): ShortcutDefinition | undefined {
    return this.shortcuts.find(s => s.id === id);
  }

  public getFormattedKey(id: string): string {
    const s = this.getShortcut(id);
    if (!s) return '';
    return this.isMac ? s.macKey : s.winKey;
  }

  public openShortcutsModal(): void {
    this.isShortcutsModalOpen.set(true);
  }

  public closeShortcutsModal(): void {
    this.isShortcutsModalOpen.set(false);
  }

  public toggleShortcutsModal(): void {
    this.isShortcutsModalOpen.update(v => !v);
  }

  /**
   * Evaluates a keydown event and executes the appropriate editor command.
   * Returns true if handled (and prevented default), false otherwise.
   */
  public handleKeyDown(event: KeyboardEvent): boolean {
    const isModifier = event.ctrlKey || event.metaKey;
    const target = event.target as HTMLElement | null;
    const isInput = target ? (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
      target.isContentEditable
    ) : false;

    // Inside text inputs, let native browser text editing and undo/redo function freely
    if (isInput) {
      // Only allow Escape to blur input
      if (event.key === 'Escape') {
        target?.blur();
        return true;
      }
      return false;
    }

    // In Render Mode, only allow exiting render mode (Escape, F10) and toggling camera projection (5)
    if (this.projectStore?.isRenderMode()) {
      if (event.key === 'Escape' || event.key === 'F10') {
        this.projectStore.toggleRenderMode(false);
        event.preventDefault();
        return true;
      }
      if (event.key === '5') {
        this.sceneService?.toggleCameraMode();
        event.preventDefault();
        return true;
      }
      // Block all other editing shortcuts (W, E, R, T, Q, N, Delete, nudging, undo/redo) in Render Mode
      return false;
    }

    // F10 toggles Presentation Render Mode
    if (event.key === 'F10') {
      this.projectStore?.toggleRenderMode(true);
      event.preventDefault();
      return true;
    }

    // Modal dialog open -> Escape closes it
    if (this.isShortcutsModalOpen()) {
      if (event.key === 'Escape') {
        this.closeShortcutsModal();
        event.preventDefault();
        return true;
      }
      return false;
    }

    // 1. Undo / Redo
    if (isModifier && event.key.toLowerCase() === 'z') {
      if (event.shiftKey) {
        this.projectStore?.redo();
      } else {
        this.projectStore?.undo();
      }
      event.preventDefault();
      return true;
    }
    if (isModifier && event.key.toLowerCase() === 'y') {
      this.projectStore?.redo();
      event.preventDefault();
      return true;
    }

    // 2. Duplicate Box (Ctrl/Cmd + D)
    if (isModifier && event.key.toLowerCase() === 'd') {
      const selectedId = this.projectStore?.selectedBoxId();
      if (selectedId) {
        this.projectStore?.duplicateBox(selectedId);
        event.preventDefault();
        return true;
      }
    }

    // If any modifier (Ctrl/Meta/Alt) is pressed, don't trigger single-letter tools
    if (isModifier || event.altKey) {
      return false;
    }

    // 3. Question mark (?) opens shortcuts dialog
    if (event.key === '?') {
      this.toggleShortcutsModal();
      event.preventDefault();
      return true;
    }

    // 4. Viewport Gizmo Tools (W / E / R / T / Q)
    const keyLower = event.key.toLowerCase();
    if (keyLower === 'w') {
      this.sceneService?.setGizmoMode('position');
      event.preventDefault();
      return true;
    }
    if (keyLower === 'e') {
      this.sceneService?.setGizmoMode('rotation');
      event.preventDefault();
      return true;
    }
    if (keyLower === 'r') {
      this.sceneService?.setGizmoMode('scale');
      event.preventDefault();
      return true;
    }
    if (keyLower === 't') {
      this.sceneService?.setGizmoMode('resize');
      event.preventDefault();
      return true;
    }
    if (keyLower === 'p') {
      this.sceneService?.setGizmoMode('paint');
      event.preventDefault();
      return true;
    }
    if (keyLower === 'q') {
      this.sceneService?.setGizmoMode('none');
      event.preventDefault();
      return true;
    }

    // 5. Viewport Toggles & Camera
    if (event.key === '5') {
      this.sceneService?.toggleCameraMode();
      event.preventDefault();
      return true;
    }
    if (keyLower === 'f') {
      this.sceneService?.resetCamera();
      event.preventDefault();
      return true;
    }
    if (keyLower === 'g') {
      this.sceneService?.toggleGrid();
      event.preventDefault();
      return true;
    }
    if (keyLower === 'c') {
      this.sceneService?.toggleCage();
      event.preventDefault();
      return true;
    }

    // 6. Box & Layer Actions
    if (keyLower === 'n') {
      this.projectStore?.addBox();
      event.preventDefault();
      return true;
    }

    const selectedId = this.projectStore?.selectedBoxId();

    if (event.key === 'Escape') {
      if (selectedId) {
        this.projectStore?.setSelectedBoxId(null);
        event.preventDefault();
        return true;
      }
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectedId) {
        this.projectStore?.removeBox(selectedId);
        event.preventDefault();
        return true;
      }
    }

    if (selectedId) {
      if (keyLower === 'h') {
        this.projectStore?.toggleBoxVisibility(selectedId);
        event.preventDefault();
        return true;
      }
      if (keyLower === 'l') {
        this.projectStore?.toggleBoxLock(selectedId);
        event.preventDefault();
        return true;
      }

      // Vertical Nudge with Shift + Up / Down
      if (event.shiftKey) {
        if (event.key === 'ArrowUp') {
          this.projectStore?.nudgeBox(selectedId, 'y', 1);
          event.preventDefault();
          return true;
        } else if (event.key === 'ArrowDown') {
          this.projectStore?.nudgeBox(selectedId, 'y', -1);
          event.preventDefault();
          return true;
        }
      } else {
        // Horizontal Nudge with Arrow Keys
        if (event.key === 'ArrowLeft') {
          this.projectStore?.nudgeBox(selectedId, 'x', -1);
          event.preventDefault();
          return true;
        } else if (event.key === 'ArrowRight') {
          this.projectStore?.nudgeBox(selectedId, 'x', 1);
          event.preventDefault();
          return true;
        } else if (event.key === 'ArrowUp') {
          this.projectStore?.nudgeBox(selectedId, 'z', 1);
          event.preventDefault();
          return true;
        } else if (event.key === 'ArrowDown') {
          this.projectStore?.nudgeBox(selectedId, 'z', -1);
          event.preventDefault();
          return true;
        }
      }
    }

    return false;
  }
}
