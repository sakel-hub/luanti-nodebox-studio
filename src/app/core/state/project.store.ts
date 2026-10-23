import { rotateAABB90, rotateFaceTextures90 } from "../utils/rotation.utils";
import { Injectable, computed, effect, signal } from '@angular/core';
import {
  Box,
  ExportTemplate,
  FaceDirection,
  FractionFormat,
  LUANTI_FACE_DIRECTIONS,
  NodeboxProject,
  PresetTemplate
} from '../models/nodebox.model';
import { gridStepToFloat } from '../utils/fraction.utils';

const STORAGE_KEY = 'luanti_nodebox_active_project';

const DEFAULT_PROJECT: NodeboxProject = {
  id: 'proj_default',
  name: 'Wooden Slab',
  nodeName: 'stairs:slab_wood',
  format: 'fractions_16',
  exportTemplate: 'register_node',
  snapResolution: 16,
  updatedAt: Date.now(),
  globalTextures: {
    top: 'default_wood.png',
    bottom: 'default_wood.png',
    right: 'default_wood.png',
    left: 'default_wood.png',
    back: 'default_wood.png',
    front: 'default_wood.png'
  },
  boxes: [
    {
      id: 'box_slab_base',
      name: 'Base Slab',
      minX: -0.5,
      minY: -0.5,
      minZ: -0.5,
      maxX: 0.5,
      maxY: 0.0,
      maxZ: 0.5,
      visible: true,
      locked: false,
      color: '#38bdf8'
    }
  ]
};

@Injectable({
  providedIn: 'root'
})
export class ProjectStore {
  public readonly project = signal<NodeboxProject>(this.loadInitialProject());
  public readonly selectedBoxId = signal<string | null>(this.project().boxes[0]?.id ?? null);

  // Undo / Redo history stacks
  private undoStack: NodeboxProject[] = [];
  private redoStack: NodeboxProject[] = [];
  public readonly canUndo = signal<boolean>(false);
  public readonly canRedo = signal<boolean>(false);

  // Active box computed
  public readonly selectedBox = computed<Box | null>(() => {
    const id = this.selectedBoxId();
    if (!id) return null;
    return this.project().boxes.find(b => b.id === id) ?? null;
  });

  // Active boxes computed
  public readonly boxes = computed<Box[]>(() => this.project().boxes);

  constructor() {
    // Autosave whenever project changes
    effect(() => {
      const current = this.project();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      } catch {
        // LocalStorage quota or error
      }
    });
  }

  private loadInitialProject(): NodeboxProject {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PROJECT;
  }

  private recordState(): void {
    // Push a deep copy to undo stack
    this.undoStack.push(JSON.parse(JSON.stringify(this.project())));
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.updateUndoRedoSignals();
  }

  private updateUndoRedoSignals(): void {
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
  }

  public undo(): void {
    if (this.undoStack.length === 0) return;
    const previous = this.undoStack.pop()!;
    this.redoStack.push(JSON.parse(JSON.stringify(this.project())));
    this.project.set(previous);
    this.updateUndoRedoSignals();
  }

  public redo(): void {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(JSON.parse(JSON.stringify(this.project())));
    this.project.set(next);
    this.updateUndoRedoSignals();
  }

  public setSelectedBoxId(id: string | null): void {
    this.selectedBoxId.set(id);
  }

  public addBox(partial?: Partial<Box>): void {
    this.recordState();
    const count = this.project().boxes.length + 1;
    const newBox: Box = {
      id: `box_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: partial?.name ?? `Box ${count}`,
      minX: partial?.minX ?? -0.25,
      minY: partial?.minY ?? 0.0,
      minZ: partial?.minZ ?? -0.25,
      maxX: partial?.maxX ?? 0.25,
      maxY: partial?.maxY ?? 0.5,
      maxZ: partial?.maxZ ?? 0.25,
      visible: true,
      locked: false,
      color: partial?.color ?? '#f59e0b',
      textures: partial?.textures
    };

    this.project.update(p => ({
      ...p,
      boxes: [...p.boxes, newBox],
      updatedAt: Date.now()
    }));

    this.selectedBoxId.set(newBox.id);
  }

  public updateBox(id: string, updates: Partial<Box>): void {
    this.recordState();
    this.project.update(p => ({
      ...p,
      boxes: p.boxes.map(b => (b.id === id ? { ...b, ...updates } : b)),
      updatedAt: Date.now()
    }));
  }

  public removeBox(id: string): void {
    this.recordState();
    this.project.update(p => {
      const remaining = p.boxes.filter(b => b.id !== id);
      return {
        ...p,
        boxes: remaining,
        updatedAt: Date.now()
      };
    });

    if (this.selectedBoxId() === id) {
      const remaining = this.project().boxes;
      this.selectedBoxId.set(remaining[0]?.id ?? null);
    }
  }

  public duplicateBox(id: string): void {
    const target = this.project().boxes.find(b => b.id === id);
    if (!target) return;

    this.recordState();
    const duplicated: Box = {
      ...JSON.parse(JSON.stringify(target)),
      id: `box_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${target.name} (Copy)`
    };

    this.project.update(p => ({
      ...p,
      boxes: [...p.boxes, duplicated],
      updatedAt: Date.now()
    }));

    this.selectedBoxId.set(duplicated.id);
  }

  public reorderBoxes(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    this.recordState();
    this.project.update(p => {
      const items = [...p.boxes];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return { ...p, boxes: items, updatedAt: Date.now() };
    });
  }

  public toggleBoxVisibility(id: string): void {
    this.project.update(p => ({
      ...p,
      boxes: p.boxes.map(b => (b.id === id ? { ...b, visible: !b.visible } : b)),
      updatedAt: Date.now()
    }));
  }

  public toggleBoxLock(id: string): void {
    this.project.update(p => ({
      ...p,
      boxes: p.boxes.map(b => (b.id === id ? { ...b, locked: !b.locked } : b)),
      updatedAt: Date.now()
    }));
  }

  public nudgeBox(id: string, axis: 'x' | 'y' | 'z', deltaStep: number): void {
    const box = this.project().boxes.find(b => b.id === id);
    if (!box || box.locked) return;

    const res = this.project().snapResolution;
    const deltaFloat = gridStepToFloat(deltaStep, res);

    let { minX, minY, minZ, maxX, maxY, maxZ } = box;
    if (axis === 'x') {
      minX += deltaFloat;
      maxX += deltaFloat;
    } else if (axis === 'y') {
      minY += deltaFloat;
      maxY += deltaFloat;
    } else if (axis === 'z') {
      minZ += deltaFloat;
      maxZ += deltaFloat;
    }

    this.updateBox(id, { minX, minY, minZ, maxX, maxY, maxZ });
  }

  public flipBox(id: string, axis: 'x' | 'y' | 'z'): void {
    const box = this.project().boxes.find(b => b.id === id);
    if (!box || box.locked) return;

    let { minX, minY, minZ, maxX, maxY, maxZ } = box;
    if (axis === 'x') {
      const newMin = -maxX;
      const newMax = -minX;
      minX = newMin;
      maxX = newMax;
    } else if (axis === 'y') {
      const newMin = -maxY;
      const newMax = -minY;
      minY = newMin;
      maxY = newMax;
    } else if (axis === 'z') {
      const newMin = -maxZ;
      const newMax = -minZ;
      minZ = newMin;
      maxZ = newMax;
    }

    this.updateBox(id, { minX, minY, minZ, maxX, maxY, maxZ });
  }

  public setFormat(format: FractionFormat): void {
    this.project.update(p => ({ ...p, format, updatedAt: Date.now() }));
  }

  public setExportTemplate(exportTemplate: ExportTemplate): void {
    this.project.update(p => ({ ...p, exportTemplate, updatedAt: Date.now() }));
  }

  public setSnapResolution(snapResolution: number): void {
    this.project.update(p => ({ ...p, snapResolution, updatedAt: Date.now() }));
  }

  public setProjectName(name: string): void {
    this.project.update(p => ({ ...p, name, updatedAt: Date.now() }));
  }

  public setNodeName(nodeName: string): void {
    this.project.update(p => ({ ...p, nodeName, updatedAt: Date.now() }));
  }

  public setGlobalTexture(dir: FaceDirection, textureId: string): void {
    this.recordState();
    this.project.update(p => ({
      ...p,
      globalTextures: {
        ...p.globalTextures,
        [dir]: textureId
      },
      updatedAt: Date.now()
    }));
  }

  public setGlobalAllTextures(textureId: string): void {
    this.recordState();
    this.project.update(p => {
      const updated: Record<FaceDirection, string> = { ...p.globalTextures };
      LUANTI_FACE_DIRECTIONS.forEach(dir => {
        updated[dir] = textureId;
      });
      return { ...p, globalTextures: updated, updatedAt: Date.now() };
    });
  }

  public setBoxFaceTexture(boxId: string, dir: FaceDirection, textureId: string): void {
    const box = this.project().boxes.find(b => b.id === boxId);
    if (!box) return;

    this.recordState();
    const textures = { ...(box.textures ?? {}), [dir]: textureId };
    this.updateBox(boxId, { textures });
  }

  public setBoxAllFacesTexture(boxId: string, textureId: string): void {
    const box = this.project().boxes.find(b => b.id === boxId);
    if (!box) return;

    this.recordState();
    const textures: any = {};
    LUANTI_FACE_DIRECTIONS.forEach(dir => {
      textures[dir] = textureId;
    });
    this.updateBox(boxId, { textures });
  }

  public clearBoxTextures(boxId: string): void {
    this.recordState();
    this.updateBox(boxId, { textures: undefined });
  }

  public importBoxes(boxes: Box[], replace: boolean, nodeName?: string, tiles?: string[]): void {
    this.recordState();
    this.project.update(p => {
      const mergedBoxes = replace ? boxes : [...p.boxes, ...boxes];
      const updatedProject: NodeboxProject = {
        ...p,
        boxes: mergedBoxes,
        nodeName: nodeName || p.nodeName,
        updatedAt: Date.now()
      };

      if (tiles && tiles.length > 0) {
        LUANTI_FACE_DIRECTIONS.forEach((dir, i) => {
          updatedProject.globalTextures[dir] = tiles[i] ?? tiles[0];
        });
      }

      return updatedProject;
    });

    if (boxes.length > 0) {
      this.selectedBoxId.set(boxes[0].id);
    }
  }

  public loadPreset(preset: PresetTemplate): void {
    this.recordState();
    const newBoxes: Box[] = preset.boxes.map((b, idx) => ({
      ...b,
      id: `box_preset_${Date.now()}_${idx}`
    }));

    this.project.update(p => ({
      ...p,
      name: preset.name,
      boxes: newBoxes,
      updatedAt: Date.now()
    }));

    if (newBoxes.length > 0) {
      this.selectedBoxId.set(newBoxes[0].id);
    }
  }

  public resetProject(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.updateUndoRedoSignals();
    this.project.set({
      ...DEFAULT_PROJECT,
      id: `proj_${Date.now()}`,
      updatedAt: Date.now()
    });
    this.selectedBoxId.set(DEFAULT_PROJECT.boxes[0].id);
  }
  public rotateBox(id: string, axis: "x" | "y" | "z", direction: 1 | -1, around: "center" | "origin" = "center"): void {
    const box = this.project().boxes.find(b => b.id === id);
    if (!box || box.locked) return;

    this.recordState();
    const res = this.project().snapResolution;
    const origin = around === "origin"
      ? { x: 0, y: 0, z: 0 }
      : {
          x: (box.minX + box.maxX) / 2,
          y: (box.minY + box.maxY) / 2,
          z: (box.minZ + box.maxZ) / 2
        };

    const rotated = rotateAABB90(box, axis, direction, origin, res);
    const newTextures = rotateFaceTextures90(box.textures, axis, direction);

    this.project.update(p => ({
      ...p,
      boxes: p.boxes.map(b => (b.id === id ? { ...b, ...rotated, textures: newTextures } : b)),
      updatedAt: Date.now()
    }));
  }

  public rotateAllBoxes(axis: "x" | "y" | "z", direction: 1 | -1): void {
    this.recordState();
    const res = this.project().snapResolution;
    const origin = { x: 0, y: 0, z: 0 };

    this.project.update(p => ({
      ...p,
      boxes: p.boxes.map(b => {
        if (b.locked) return b;
        const rotated = rotateAABB90(b, axis, direction, origin, res);
        const newTextures = rotateFaceTextures90(b.textures, axis, direction);
        return { ...b, ...rotated, textures: newTextures };
      }),
      updatedAt: Date.now()
    }));
  }

}
