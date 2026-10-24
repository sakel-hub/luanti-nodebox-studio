import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectStore } from './project.store';
import { LUANTI_PRESETS } from '../models/presets.data';

describe('ProjectStore', () => {
  let store: ProjectStore;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    store = new ProjectStore();
    store.resetProject();
  });

  it('initializes with default slab project', () => {
    expect(store.project().name).toBe('Wooden Slab');
    expect(store.boxes().length).toBe(1);
    expect(store.selectedBoxId()).toBeTruthy();
  });

  it('adds and removes boxes', () => {
    const initialCount = store.boxes().length;
    store.addBox({ name: 'Upper Box', minY: 0, maxY: 0.5 });
    expect(store.boxes().length).toBe(initialCount + 1);

    const added = store.boxes()[store.boxes().length - 1];
    expect(added.name).toBe('Upper Box');
    expect(store.selectedBoxId()).toBe(added.id);

    store.removeBox(added.id);
    expect(store.boxes().length).toBe(initialCount);
  });

  it('supports undo and redo', () => {
    const initialCount = store.boxes().length;
    expect(store.canUndo()).toBe(false);

    store.addBox({ name: 'New Box' });
    expect(store.canUndo()).toBe(true);
    expect(store.boxes().length).toBe(initialCount + 1);

    store.undo();
    expect(store.boxes().length).toBe(initialCount);
    expect(store.canRedo()).toBe(true);

    store.redo();
    expect(store.boxes().length).toBe(initialCount + 1);
  });

  it('nudges boxes along axes', () => {
    const box = store.boxes()[0];
    const initialMinX = box.minX;
    store.nudgeBox(box.id, 'x', 1); // 1 step of 1/16 = 0.0625

    const updated = store.boxes().find(b => b.id === box.id)!;
    expect(updated.minX).toBeCloseTo(initialMinX + 0.0625, 4);
  });

  it('flips boxes symmetrically', () => {
    const box = store.boxes()[0];
    // Set asymmetric minX and maxX
    store.updateBox(box.id, { minX: 0.125, maxX: 0.375 });
    store.flipBox(box.id, 'x');

    const updated = store.boxes().find(b => b.id === box.id)!;
    expect(updated.minX).toBeCloseTo(-0.375, 4);
    expect(updated.maxX).toBeCloseTo(-0.125, 4);
  });

  it('loads presets correctly', () => {
    const stairsPreset = LUANTI_PRESETS.find(p => p.name === 'Stairs')!;
    store.loadPreset(stairsPreset);

    expect(store.project().name).toBe('Stairs');
    expect(store.boxes().length).toBe(2);
    expect(store.boxes()[0].name).toBe('Lower Step');
    expect(store.boxes()[1].name).toBe('Upper Step');
  });

  it('toggles render mode', () => {
    expect(store.isRenderMode()).toBe(false);
    store.toggleRenderMode();
    expect(store.isRenderMode()).toBe(true);
    store.toggleRenderMode(false);
    expect(store.isRenderMode()).toBe(false);
    store.toggleRenderMode(true);
    expect(store.isRenderMode()).toBe(true);
  });

  it('correctly tracks used texture base IDs across global and box faces', () => {
    store.setGlobalTexture('top', 'my_custom_texture');
    store.setGlobalTexture('left', 'my_custom_texture^[transformFX');

    const used = store.getUsedTextureBaseIds();
    expect(used.has('my_custom_texture')).toBe(true);
    expect(used.has('default_wood.png')).toBe(true);
  });

  it('replaces texture usage across global and box faces when a texture is deleted', () => {
    store.setGlobalTexture('right', 'temp_texture');
    store.setGlobalTexture('left', 'temp_texture^[transformFX');

    store.replaceTextureUsage('temp_texture', 'default_wood.png');

    expect(store.project().globalTextures.right).toBe('default_wood.png');
    expect(store.project().globalTextures.left).toBe('default_wood.png^[transformFX');
  });

  it('manages nodeHeight and supports 2-node tall models', () => {
    expect(store.project().nodeHeight).toBe(1);

    store.setNodeHeight(2);
    expect(store.project().nodeHeight).toBe(2);
    expect(store.canUndo()).toBe(true);

    store.undo();
    expect(store.project().nodeHeight).toBe(1);

    store.redo();
    expect(store.project().nodeHeight).toBe(2);
  });

  it('auto-detects tall boxes on import and sets nodeHeight to 2', () => {
    expect(store.project().nodeHeight).toBe(1);

    // Import a tall box spanning up to Y = 1.5
    store.importBoxes([
      {
        id: 'box_tall',
        name: 'Tall Pillar',
        minX: -0.5,
        minY: -0.5,
        minZ: -0.5,
        maxX: 0.5,
        maxY: 1.5,
        maxZ: 0.5,
        visible: true,
        locked: false,
        color: '#38bdf8'
      }
    ], true);

    expect(store.project().nodeHeight).toBe(2);
  });

  it('loads 2-node presets with nodeHeight = 2', () => {
    const doorPreset = LUANTI_PRESETS.find(p => p.name === 'Wooden Door (2 Nodes)')!;
    expect(doorPreset).toBeDefined();
    expect(doorPreset.nodeHeight).toBe(2);

    store.loadPreset(doorPreset);
    expect(store.project().nodeHeight).toBe(2);
    expect(store.project().name).toBe('Wooden Door (2 Nodes)');
    expect(store.boxes().length).toBe(3);
  });

  it('switches nodebox types and updates active slots', () => {
    expect(store.project().nodeboxType).toBe('fixed');
    expect(store.activeSlot()).toBe('fixed');

    store.setNodeboxType('connected');
    expect(store.project().nodeboxType).toBe('connected');
    expect(store.activeSlot()).toBe('fixed');

    store.setNodeboxType('wallmounted');
    expect(store.project().nodeboxType).toBe('wallmounted');
    expect(store.activeSlot()).toBe('wall_bottom');

    store.setActiveSlot('wall_side');
    expect(store.activeSlot()).toBe('wall_side');

    store.setLeveledPreviewHeight(12);
    expect(store.leveledPreviewHeight()).toBe(12);

    store.toggleNeighbor('front');
    expect(store.neighborState().front).toBe(false);
    store.toggleNeighbor('front');
    expect(store.neighborState().front).toBe(true);
  });

  it('loads connected fence preset with slots intact', () => {
    const fencePreset = LUANTI_PRESETS.find(p => p.name === 'Wooden Fence (Connected)')!;
    expect(fencePreset).toBeDefined();
    expect(fencePreset.nodeboxType).toBe('connected');

    store.loadPreset(fencePreset);
    expect(store.project().nodeboxType).toBe('connected');
    const fixedBoxes = store.boxes().filter(b => b.slot === 'fixed');
    const frontBoxes = store.boxes().filter(b => b.slot === 'connect_front');
    expect(fixedBoxes.length).toBe(1);
    expect(frontBoxes.length).toBe(2);
  });

  it('replicates boxes from connect_front to all 4 horizontal sides', () => {
    store.setNodeboxType('connected');
    // Clear boxes and add 1 box in connect_front
    store.importBoxes([
      {
        id: 'rail_f',
        name: 'Rail',
        slot: 'connect_front',
        minX: -0.0625,
        minY: 0.1875,
        minZ: -0.5,
        maxX: 0.0625,
        maxY: 0.3125,
        maxZ: -0.125,
        visible: true,
        locked: false,
        color: '#f59e0b'
      }
    ], true);

    expect(store.boxes().length).toBe(1);
    store.replicateSlotToSides('connect_front');

    // Should now have 1 box for each of the 4 horizontal slots: front, left, back, right
    expect(store.boxes().length).toBe(4);
    const slots = store.boxes().map(b => b.slot);
    expect(slots).toContain('connect_front');
    expect(slots).toContain('connect_left');
    expect(slots).toContain('connect_back');
    expect(slots).toContain('connect_right');

    const backBox = store.boxes().find(b => b.slot === 'connect_back')!;
    expect(backBox.minZ).toBeCloseTo(0.125);
    expect(backBox.maxZ).toBeCloseTo(0.5);
  });
});


