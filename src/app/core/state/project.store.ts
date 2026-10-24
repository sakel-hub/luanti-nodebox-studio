import { rotateAABB90, rotateFaceTextures90 } from "../utils/rotation.utils";
import { Injectable, computed, effect, signal } from '@angular/core';
import {
  AABB,
  BOX_PALETTE,
  Box,
  ExportTemplate,
  FaceDirection,
  FractionFormat,
  LUANTI_FACE_DIRECTIONS,
  NeighborConnectionState,
  NodeboxProject,
  NodeboxSlot,
  NodeboxType,
  PresetTemplate
} from '../models/nodebox.model';
import { gridStepToFloat } from '../utils/fraction.utils';
import { safeGetItem, safeSetItem } from '../utils/storage.utils';

const STORAGE_KEY = 'luanti_nodebox_active_project';

const DEFAULT_PROJECT: NodeboxProject = {
  id: 'proj_default',
  name: 'Wooden Slab',
  nodeName: 'stairs:slab_wood',
  nodeHeight: 1,
  nodeboxType: 'fixed',
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
      slot: 'fixed',
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

  // Active slot for slot-based nodeboxes (connected / wallmounted)
  public readonly activeSlot = signal<NodeboxSlot>('fixed');

  // Simulation mode for connected nodeboxes (renders compound preview with neighbor toggles)
  public readonly simulationMode = signal<boolean>(false);

  // 6-way neighbor connection state for simulation mode
  public readonly neighborState = signal<NeighborConnectionState>({
    top: false,
    bottom: false,
    front: true,
    back: true,
    left: false,
    right: false
  });

  // Leveled nodebox interactive test height (1..16)
  public readonly leveledPreviewHeight = signal<number>(8);

  // Wallmounted nodebox active preview attachment plane
  public readonly wallmountedPreviewSlot = signal<'wall_bottom' | 'wall_top' | 'wall_side'>('wall_side');

  // Undo / Redo history stacks
  private undoStack: NodeboxProject[] = [];
  private redoStack: NodeboxProject[] = [];
  public readonly canUndo = signal<boolean>(false);
  public readonly canRedo = signal<boolean>(false);
  public readonly isRenderMode = signal<boolean>(false);


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
    try {
      effect(() => {
        const current = this.project();
        safeSetItem(STORAGE_KEY, JSON.stringify(current));
      });
    } catch {
      // In isolated environments outside injection context, effect is safely bypassed
    }
  }

  private sanitizeProject(parsed: any): NodeboxProject {
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PROJECT;
    return {
      ...DEFAULT_PROJECT,
      ...parsed,
      id: parsed.id || `proj_${Date.now()}`,
      name: parsed.name || DEFAULT_PROJECT.name,
      nodeName: parsed.nodeName || DEFAULT_PROJECT.nodeName,
      nodeHeight: parsed.nodeHeight ?? 1,
      nodeboxType: parsed.nodeboxType || DEFAULT_PROJECT.nodeboxType || 'fixed',
      connectsTo: Array.isArray(parsed.connectsTo) ? parsed.connectsTo : undefined,
      format: parsed.format || DEFAULT_PROJECT.format,
      exportTemplate: parsed.exportTemplate || DEFAULT_PROJECT.exportTemplate,
      snapResolution: parsed.snapResolution || DEFAULT_PROJECT.snapResolution,
      globalTextures: {
        ...DEFAULT_PROJECT.globalTextures,
        ...(parsed.globalTextures || {})
      },
      boxes: Array.isArray(parsed.boxes) && parsed.boxes.length > 0 ? parsed.boxes.map((b: any, idx: number) => ({
        id: b.id || `box_${Date.now()}_${idx}`,
        name: b.name || `Box ${idx + 1}`,
        slot: b.slot || 'fixed',
        minX: typeof b.minX === 'number' ? b.minX : -0.5,
        minY: typeof b.minY === 'number' ? b.minY : -0.5,
        minZ: typeof b.minZ === 'number' ? b.minZ : -0.5,
        maxX: typeof b.maxX === 'number' ? b.maxX : 0.5,
        maxY: typeof b.maxY === 'number' ? b.maxY : 0.5,
        maxZ: typeof b.maxZ === 'number' ? b.maxZ : 0.5,
        visible: b.visible ?? true,
        locked: b.locked ?? false,
        textures: b.textures ? { ...b.textures } : undefined
      })) : DEFAULT_PROJECT.boxes
    };
  }

  private loadInitialProject(): NodeboxProject {
    const saved = safeGetItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return this.sanitizeProject(parsed);
      } catch {
        // Fallback to default on corrupted JSON
      }
    }
    return DEFAULT_PROJECT;
  }

  private recordState(): void {
    // Push a deep copy to undo stack
    this.undoStack.push(structuredClone(this.project()));
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
    this.redoStack.push(structuredClone(this.project()));
    this.project.set(previous);
    this.updateUndoRedoSignals();
  }

  public redo(): void {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(structuredClone(this.project()));
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
      slot: partial?.slot ?? this.activeSlot() ?? 'fixed',
      minX: partial?.minX ?? -0.25,
      minY: partial?.minY ?? 0.0,
      minZ: partial?.minZ ?? -0.25,
      maxX: partial?.maxX ?? 0.25,
      maxY: partial?.maxY ?? 0.5,
      maxZ: partial?.maxZ ?? 0.25,
      visible: true,
      locked: false,
      color: partial?.color ?? BOX_PALETTE[this.project().boxes.length % BOX_PALETTE.length],
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
      ...structuredClone(target),
      id: `box_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${target.name} (Copy)`,
      slot: target.slot || 'fixed'
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

  public toggleRenderMode(enabled?: boolean): void {
    const next = enabled !== undefined ? enabled : !this.isRenderMode();
    this.isRenderMode.set(next);
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

  public setNodeHeight(nodeHeight: number): void {
    if (this.project().nodeHeight === nodeHeight) return;
    this.recordState();
    this.project.update(p => ({ ...p, nodeHeight, updatedAt: Date.now() }));
  }

  public setNodeboxType(type: NodeboxType): void {
    if (this.project().nodeboxType === type) return;
    this.recordState();
    this.project.update(p => ({ ...p, nodeboxType: type, updatedAt: Date.now() }));
    if (type === 'connected') {
      this.activeSlot.set('fixed');
    } else if (type === 'wallmounted') {
      this.activeSlot.set('wall_bottom');
    } else {
      this.activeSlot.set('fixed');
    }
  }

  public setConnectsTo(connectsTo: string[] | undefined): void {
    this.recordState();
    this.project.update(p => ({ ...p, connectsTo, updatedAt: Date.now() }));
  }

  public setActiveSlot(slot: NodeboxSlot): void {
    this.activeSlot.set(slot);
  }

  public setBoxSlot(id: string, slot: NodeboxSlot): void {
    this.updateBox(id, { slot });
  }

  public setSimulationMode(enabled: boolean): void {
    this.simulationMode.set(enabled);
  }

  public toggleNeighbor(direction: keyof NeighborConnectionState): void {
    this.neighborState.update(s => ({
      ...s,
      [direction]: !s[direction]
    }));
  }

  public setNeighbor(direction: keyof NeighborConnectionState, enabled: boolean): void {
    this.neighborState.update(s => ({
      ...s,
      [direction]: enabled
    }));
  }

  public setLeveledPreviewHeight(height: number): void {
    const clamped = Math.max(1, Math.min(16, Math.round(height)));
    this.leveledPreviewHeight.set(clamped);
  }

  public setWallmountedPreviewSlot(slot: 'wall_bottom' | 'wall_top' | 'wall_side'): void {
    this.wallmountedPreviewSlot.set(slot);
  }

  public replicateSlotToSides(sourceSlot: 'connect_front' | 'connect_back' | 'connect_left' | 'connect_right'): void {
    const currentBoxes = this.project().boxes;
    const sourceBoxes = currentBoxes.filter(b => b.slot === sourceSlot);
    if (sourceBoxes.length === 0) return;

    this.recordState();
    const res = this.project().snapResolution;
    const origin = { x: 0, y: 0, z: 0 };

    const slotAngles: Record<'connect_front' | 'connect_left' | 'connect_back' | 'connect_right', number> = {
      connect_back: 0,
      connect_right: 1, // +90 deg CW
      connect_front: 2, // +180 deg
      connect_left: 3   // +270 deg CW
    };

    const targetSlots: Array<'connect_front' | 'connect_left' | 'connect_back' | 'connect_right'> = [
      'connect_front', 'connect_left', 'connect_back', 'connect_right'
    ];

    // Remove existing boxes in other 3 target slots
    const updatedBoxes = currentBoxes.filter(b => b.slot === sourceSlot || !targetSlots.includes(b.slot as any));

    const sourceQuarter = slotAngles[sourceSlot];

    for (const targetSlot of targetSlots) {
      if (targetSlot === sourceSlot) continue;
      const targetQuarter = slotAngles[targetSlot];
      const rotationsNeeded = (targetQuarter - sourceQuarter + 4) % 4;

      for (const src of sourceBoxes) {
        let currentAABB: AABB = { minX: src.minX, minY: src.minY, minZ: src.minZ, maxX: src.maxX, maxY: src.maxY, maxZ: src.maxZ };
        let currentTextures = src.textures ? { ...src.textures } : undefined;

        for (let r = 0; r < rotationsNeeded; r++) {
          currentAABB = rotateAABB90(currentAABB, 'y', 1, origin, res);
          currentTextures = rotateFaceTextures90(currentTextures, 'y', 1);
        }

        const slotLabel = targetSlot.replace('connect_', '');
        updatedBoxes.push({
          ...src,
          id: `box_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: `${src.name.replace(/\s*\([^)]*\)$/, '')} (${slotLabel})`,
          slot: targetSlot,
          ...currentAABB,
          textures: currentTextures
        });
      }
    }

    this.project.update(p => ({
      ...p,
      boxes: updatedBoxes,
      updatedAt: Date.now()
    }));
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

  public getUsedTextureBaseIds(): Set<string> {
    const p = this.project();
    const used = new Set<string>();

    const extractBase = (key?: string) => {
      if (!key) return;
      const base = key.replace(/\^\[transformFX$/, '');
      used.add(base);
    };

    LUANTI_FACE_DIRECTIONS.forEach(dir => {
      extractBase(p.globalTextures[dir]);
    });

    p.boxes.forEach(b => {
      if (b.textures) {
        LUANTI_FACE_DIRECTIONS.forEach(dir => {
          extractBase(b.textures?.[dir]);
        });
      }
    });

    return used;
  }

  public replaceTextureUsage(oldBaseId: string, fallbackTextureId: string = 'default_wood.png'): void {
    this.recordState();
    this.project.update(p => {
      const updatedGlobal = { ...p.globalTextures };
      let changed = false;

      LUANTI_FACE_DIRECTIONS.forEach(dir => {
        const val = updatedGlobal[dir];
        if (val === oldBaseId || val === `${oldBaseId}^[transformFX`) {
          const isFlipped = val.endsWith('^[transformFX');
          updatedGlobal[dir] = isFlipped ? `${fallbackTextureId}^[transformFX` : fallbackTextureId;
          changed = true;
        }
      });

      const updatedBoxes = p.boxes.map(b => {
        if (!b.textures) return b;
        let boxChanged = false;
        const boxTextures = { ...b.textures };
        LUANTI_FACE_DIRECTIONS.forEach(dir => {
          const val = boxTextures[dir];
          if (val === oldBaseId || val === `${oldBaseId}^[transformFX`) {
            const isFlipped = val.endsWith('^[transformFX');
            boxTextures[dir] = isFlipped ? `${fallbackTextureId}^[transformFX` : fallbackTextureId;
            boxChanged = true;
            changed = true;
          }
        });
        return boxChanged ? { ...b, textures: boxTextures } : b;
      });

      if (!changed) return p;
      return {
        ...p,
        globalTextures: updatedGlobal,
        boxes: updatedBoxes,
        updatedAt: Date.now()
      };
    });
  }

  public importBoxes(
    boxes: Box[],
    replace: boolean,
    nodeName?: string,
    tiles?: string[],
    nodeboxType?: NodeboxType,
    connectsTo?: string[]
  ): void {
    this.recordState();
    this.project.update(p => {
      const normalizedBoxes = boxes.map(b => ({
        ...b,
        slot: b.slot || 'fixed'
      }));
      const mergedBoxes = replace ? normalizedBoxes : [...p.boxes, ...normalizedBoxes];
      const updatedGlobalTextures = { ...p.globalTextures };

      if (tiles && tiles.length > 0) {
        LUANTI_FACE_DIRECTIONS.forEach((dir, i) => {
          updatedGlobalTextures[dir] = tiles[i] ?? tiles[0];
        });
      }

      const hasTallBoxes = mergedBoxes.some(b => b.maxY > 0.55);
      const nodeHeight = hasTallBoxes ? Math.max(p.nodeHeight ?? 1, 2) : p.nodeHeight;

      return {
        ...p,
        boxes: mergedBoxes,
        nodeHeight,
        nodeboxType: nodeboxType || p.nodeboxType || 'fixed',
        connectsTo: connectsTo !== undefined ? connectsTo : p.connectsTo,
        nodeName: nodeName || p.nodeName,
        globalTextures: updatedGlobalTextures,
        updatedAt: Date.now()
      };
    });

    if (nodeboxType === 'connected') {
      this.activeSlot.set('fixed');
    } else if (nodeboxType === 'wallmounted') {
      this.activeSlot.set('wall_bottom');
    }

    if (boxes.length > 0) {
      this.selectedBoxId.set(boxes[0].id);
    }
  }

  public loadPreset(preset: PresetTemplate): void {
    this.recordState();
    const newBoxes: Box[] = preset.boxes.map((b, idx) => ({
      ...b,
      slot: b.slot || 'fixed',
      id: `box_preset_${Date.now()}_${idx}`
    }));

    const nodeHeight = preset.nodeHeight ?? 1;
    const nodeboxType = preset.nodeboxType ?? 'fixed';

    this.project.update(p => ({
      ...p,
      name: preset.name,
      nodeName: preset.nodeName ?? p.nodeName,
      nodeHeight,
      nodeboxType,
      connectsTo: preset.connectsTo ? [...preset.connectsTo] : undefined,
      globalTextures: preset.globalTextures ? { ...preset.globalTextures } : p.globalTextures,
      boxes: newBoxes,
      updatedAt: Date.now()
    }));

    if (nodeboxType === 'connected') {
      this.activeSlot.set('fixed');
    } else if (nodeboxType === 'wallmounted') {
      this.activeSlot.set('wall_bottom');
    } else {
      this.activeSlot.set('fixed');
    }

    if (newBoxes.length > 0) {
      this.selectedBoxId.set(newBoxes[0].id);
    }
  }


  public loadProject(project: NodeboxProject): void {
    this.recordState();
    const sanitized = this.sanitizeProject(project);
    this.project.set(sanitized);
    this.selectedBoxId.set(sanitized.boxes[0]?.id ?? null);
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
