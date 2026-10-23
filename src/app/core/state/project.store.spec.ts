import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ProjectStore } from './project.store';
import { LUANTI_PRESETS } from '../models/presets.data';

describe('ProjectStore', () => {
  let store: ProjectStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [ProjectStore]
    });
    store = TestBed.inject(ProjectStore);
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
});
