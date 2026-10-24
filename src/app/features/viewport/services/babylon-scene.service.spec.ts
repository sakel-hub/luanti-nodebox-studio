import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, NgZone } from '@angular/core';
import { BabylonSceneService } from './babylon-scene.service';
import { ProjectStore } from '../../../core/state/project.store';
import { TextureService } from '../../../core/services/texture.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('BabylonSceneService', () => {
  let service: BabylonSceneService;

  beforeEach(() => {
    const mockNgZone = {
      run: (fn: () => any) => fn(),
      runOutsideAngular: (fn: () => any) => fn(),
    };
    const injector = createEnvironmentInjector([
      { provide: NgZone, useValue: mockNgZone },
      ProjectStore,
      TextureService,
      ThemeService,
      BabylonSceneService
    ], null as any);
    service = runInInjectionContext(injector, () => new BabylonSceneService());
  });

  it('initializes with default camera and scene signals', () => {
    expect(service.cameraMode()).toBe('perspective');
    expect(service.sceneFloor()).toBe('none');
    expect(service.sceneSky()).toBe('studio');
    expect(service.isTurntableActive()).toBe(false);
    expect(service.showCage()).toBe(true);
    expect(service.showGrid()).toBe(true);
  });

  it('toggles camera projection mode between perspective and orthographic', () => {
    expect(service.cameraMode()).toBe('perspective');

    const mode1 = service.toggleCameraMode();
    expect(mode1).toBe('orthographic');
    expect(service.cameraMode()).toBe('orthographic');

    const mode2 = service.toggleCameraMode();
    expect(mode2).toBe('perspective');
    expect(service.cameraMode()).toBe('perspective');
  });

  it('updates scene floor platform signal', () => {
    service.setSceneFloor('grass');
    expect(service.sceneFloor()).toBe('grass');

    service.setSceneFloor('stone');
    expect(service.sceneFloor()).toBe('stone');

    service.setSceneFloor('grid');
    expect(service.sceneFloor()).toBe('grid');

    service.setSceneFloor('none');
    expect(service.sceneFloor()).toBe('none');
  });

  it('updates scene sky preset signal', () => {
    service.setSceneSky('minetest_day');
    expect(service.sceneSky()).toBe('minetest_day');

    service.setSceneSky('minetest_sunset');
    expect(service.sceneSky()).toBe('minetest_sunset');

    service.setSceneSky('minetest_night');
    expect(service.sceneSky()).toBe('minetest_night');

    service.setSceneSky('studio');
    expect(service.sceneSky()).toBe('studio');
  });

  it('toggles turntable state signal', () => {
    expect(service.isTurntableActive()).toBe(false);
    service.toggleTurntable(true);
    expect(service.isTurntableActive()).toBe(true);
    service.toggleTurntable(false);
    expect(service.isTurntableActive()).toBe(false);
  });

  it('supports toggleCage and toggleGrid signals', () => {
    service.toggleCage(false);
    expect(service.showCage()).toBe(false);
    service.toggleCage(true);
    expect(service.showCage()).toBe(true);

    service.toggleGrid(false);
    expect(service.showGrid()).toBe(false);
    service.toggleGrid(true);
    expect(service.showGrid()).toBe(true);
  });

  it('handles onRenderModeChange safely without throwing', () => {
    expect(() => service.onRenderModeChange(true)).not.toThrow();
    expect(() => service.onRenderModeChange(false)).not.toThrow();
  });

  it('updates pixelDepth configuration signal', () => {
    expect(service.pixelDepth().enabled).toBe(false);
    service.setPixelDepth({ enabled: true });
    expect(service.pixelDepth().enabled).toBe(true);

    service.setPixelDepth({ enabled: true, intensity: 'deep', pixelBevel: true, luminanceRelief: false });
    expect(service.pixelDepth().intensity).toBe('deep');
    expect(service.pixelDepth().pixelBevel).toBe(true);
    expect(service.pixelDepth().luminanceRelief).toBe(false);
  });

  it('creates and updates meshes for all boxes', async () => {
    const { NullEngine, Scene } = await import('@babylonjs/core');
    const engine = new NullEngine();
    (service as any).engine = engine;
    (service as any).scene = new Scene(engine);

    const testBoxes = [
      { id: 'b1', name: 'M1 Stem', minX: -0.3125, minY: -0.5, minZ: -0.3125, maxX: -0.25, maxY: 0, maxZ: -0.25, visible: true, locked: false, color: '#f59e0b' },
      { id: 'b2', name: 'M1 Top A', minX: -0.5, minY: 0, minZ: -0.5, maxX: -0.0625, maxY: 0.0625, maxZ: -0.0625, visible: true, locked: false, color: '#38bdf8' },
      { id: 'b3', name: 'M1 Top B', minX: -0.4375, minY: 0.0625, minZ: -0.4375, maxX: -0.125, maxY: 0.125, maxZ: -0.125, visible: true, locked: false, color: '#06b6d4' },
      { id: 'b4', name: 'M2 Top', minX: 0.3125, minY: -0.3125, minZ: -0.25, maxX: 0.5, maxY: -0.25, maxZ: -0.0625, visible: true, locked: false, color: '#a855f7' },
      { id: 'b5', name: 'M2 Stem', minX: 0.375, minY: -0.5, minZ: -0.1875, maxX: 0.4375, maxY: -0.3125, maxZ: -0.125, visible: true, locked: false, color: '#38bdf8' },
      { id: 'b6', name: 'M3 Top', minX: 0.0625, minY: -0.375, minZ: -0.5, maxX: 0.25, maxY: -0.3125, maxZ: -0.3125, visible: true, locked: false, color: '#10b981' },
      { id: 'b7', name: 'M3 Stem', minX: 0.125, minY: -0.5, minZ: -0.4375, maxX: 0.1875, maxY: -0.375, maxZ: -0.375, visible: true, locked: false, color: '#f43f5e' },
      { id: 'b8', name: 'M4 Top A', minX: 0.0625, minY: -0.1875, minZ: 0.0625, maxX: 0.5, maxY: -0.125, maxZ: 0.5, visible: true, locked: false, color: '#ec4899' },
      { id: 'b9', name: 'M4 Top B', minX: 0.125, minY: -0.125, minZ: 0.125, maxX: 0.4375, maxY: -0.0625, maxZ: 0.4375, visible: true, locked: false, color: '#6366f1' },
      { id: 'b10', name: 'M4 Stem', minX: 0.25, minY: -0.5, minZ: 0.25, maxX: 0.3125, maxY: -0.1875, maxZ: 0.3125, visible: true, locked: false, color: '#14b8a6' },
    ];

    service.updateBoxes(testBoxes as any, 'b1');
    expect((service as any).boxMeshes.size).toBe(10);

    const mesh1 = (service as any).boxMeshes.get('b1');
    expect(mesh1).toBeDefined();
    expect(mesh1.position.x).toBeCloseTo((-0.3125 + -0.25) / 2);
    expect(mesh1.scaling.x).toBeCloseTo(0.0625);

    const mesh4 = (service as any).boxMeshes.get('b4');
    expect(mesh4).toBeDefined();
    expect(mesh4.position.x).toBeCloseTo((0.3125 + 0.5) / 2);
    expect(mesh4.scaling.x).toBeCloseTo(0.1875);

    // Verify all meshes are initialized with 6 directional SubMeshes for Luanti 6-face MultiMaterial
    for (const mesh of (service as any).boxMeshes.values()) {
      expect(mesh.metadata?.isNodeBoxWrap).toBe(true);
      expect(mesh.subMeshes.length).toBe(6);
      expect(mesh.material).toBeDefined();
      const multiMat = mesh.material;
      expect(multiMat.subMaterials.length).toBe(6);
      for (const subMat of multiMat.subMaterials) {
        expect(subMat).toBeDefined();
      }

      // Verify node-projected UV buffer is attached
      const uvs = mesh.getVerticesData('uv');
      expect(uvs).toBeDefined();
      expect(uvs!.length).toBe(48);
    }

    // Verify fractional node-projected UVs on M1 Top A (box b2)
    const mesh2 = (service as any).boxMeshes.get('b2');
    const uvs2 = mesh2.getVerticesData('uv')!;
    // Face 4 (Top, +Y): vertices start at index 32
    // Top-Right v0: u = maxX + 0.5 = 0.4375, v = 0.5 - maxZ = 0.5625
    expect(uvs2[32]).toBeCloseTo(0.4375);
    expect(uvs2[33]).toBeCloseTo(0.5625);
    // Bottom-Left v2: u = minX + 0.5 = 0.0, v = 0.5 - minZ = 1.0
    expect(uvs2[36]).toBeCloseTo(0.0);
    expect(uvs2[37]).toBeCloseTo(1.0);
  });

  it('safely refreshes all materials and clears texture/material caches', async () => {
    const { NullEngine, Scene } = await import('@babylonjs/core');
    const engine = new NullEngine();
    (service as any).engine = engine;
    (service as any).scene = new Scene(engine);

    expect(() => service.refreshAllMaterials()).not.toThrow();
    // After refreshAllMaterials, updateBoxes repopulates fresh materials for current project boxes
    expect((service as any).materialCache.size).toBeGreaterThanOrEqual(1);
  });

  it('configures balanced directional and hemispheric lighting for normal relief', async () => {
    const { NullEngine, Scene, HemisphericLight, DirectionalLight, Vector3 } = await import('@babylonjs/core');
    const engine = new NullEngine();
    const scene = new Scene(engine);
    (service as any).engine = engine;
    (service as any).scene = scene;
    (service as any).hemiLight = new HemisphericLight('Hemi', new Vector3(0, 1, 0), scene);
    (service as any).dirLight = new DirectionalLight('Dir', new Vector3(-1, -2, -1), scene);

    service.setSceneSky('studio');
    expect((service as any).hemiLight.intensity).toBeLessThanOrEqual(0.6);
    expect((service as any).dirLight.intensity).toBeGreaterThanOrEqual(0.9);

    service.setSceneSky('minetest_day');
    expect((service as any).hemiLight.intensity).toBe(0.55);
    expect((service as any).dirLight.intensity).toBe(1.05);
  });

  it('builds 2-node tall node cage, reference grid, and adjusts camera target to y = 0.5', async () => {
    const { NullEngine, Scene, ArcRotateCamera, Vector3 } = await import('@babylonjs/core');
    const engine = new NullEngine();
    const scene = new Scene(engine);
    (service as any).engine = engine;
    (service as any).scene = scene;
    (service as any).camera = new ArcRotateCamera('Cam', 0, 0, 2.5, new Vector3(0, 0, 0), scene);

    const projectStore = (service as any).projectStore as ProjectStore;
    projectStore.setNodeHeight(1);
    (service as any).buildNodeCage();
    (service as any).buildReferenceGrid();

    expect((service as any).cageMesh).toBeDefined();
    expect((service as any).gridMesh).toBeDefined();

    // Now switch to 2 nodes tall
    projectStore.setNodeHeight(2);
    (service as any).buildNodeCage();
    (service as any).buildReferenceGrid();

    expect((service as any).cageMesh).toBeDefined();
    expect((service as any).gridMesh).toBeDefined();

    // Camera preset and reset target vertical center (y = 0.5)
    service.resetCamera();
    expect((service as any).camera.target.y).toBeCloseTo(0.5);
    expect((service as any).camera.radius).toBe(3.2);

    service.setCameraPreset('front');
    expect((service as any).camera.target.y).toBeCloseTo(0.5);
  });
});
