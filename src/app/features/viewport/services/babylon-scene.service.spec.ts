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

  it('updates scene floor platform signal and supports all default and custom floor textures', () => {
    service.setSceneFloor('grass');
    expect(service.sceneFloor()).toBe('grass');

    service.setSceneFloor('stone');
    expect(service.sceneFloor()).toBe('stone');

    service.setSceneFloor('wood');
    expect(service.sceneFloor()).toBe('wood');

    service.setSceneFloor('cobble');
    expect(service.sceneFloor()).toBe('cobble');

    service.setSceneFloor('brick');
    expect(service.sceneFloor()).toBe('brick');

    service.setSceneFloor('dirt');
    expect(service.sceneFloor()).toBe('dirt');

    service.setSceneFloor('glass');
    expect(service.sceneFloor()).toBe('glass');

    service.setSceneFloor('steel');
    expect(service.sceneFloor()).toBe('steel');

    service.setSceneFloor('mese');
    expect(service.sceneFloor()).toBe('mese');

    service.setSceneFloor('custom_rug');
    expect(service.sceneFloor()).toBe('custom_rug');

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
        expect(subMat.transparencyMode).toBe(1); // Material.MATERIAL_ALPHATEST
        expect(subMat.alphaCutOff).toBe(0.5);
        expect(subMat.backFaceCulling).toBe(true);
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

  it('correctly creates 2D plane meshes with 0.001 minimum rendering thickness', async () => {
    const { NullEngine, Scene } = await import('@babylonjs/core');
    const engine = new NullEngine();
    (service as any).engine = engine;
    (service as any).scene = new Scene(engine);

    // Box b_plane is a 2D floor plate (carpet): minY === maxY === 0.0
    const planeBoxes = [
      { id: 'b_plane', name: 'Carpet Plate', minX: -0.5, minY: 0.0, minZ: -0.5, maxX: 0.5, maxY: 0.0, maxZ: 0.5, visible: true, locked: false, color: '#f59e0b' }
    ];

    service.updateBoxes(planeBoxes as any, 'b_plane');
    const mesh = (service as any).boxMeshes.get('b_plane');
    expect(mesh).toBeDefined();

    // In Babylon, height is clamped to 0.001 to prevent singular matrices
    expect(mesh.scaling.x).toBe(1.0);
    expect(mesh.scaling.y).toBe(0.001);
    expect(mesh.scaling.z).toBe(1.0);
    expect(mesh.position.y).toBe(0.0);
  });

  it('saves exact snapped coordinates, clamps 3D boxes to 1 grid unit minimum, and expands 2D planes on upward drag', async () => {
    const { NullEngine, Scene, MeshBuilder } = await import('@babylonjs/core');
    const engine = new NullEngine();
    const scene = new Scene(engine);
    (service as any).engine = engine;
    (service as any).scene = scene;

    const projectStore = (service as any).projectStore as ProjectStore;
    const testBox = { id: 'b_test', name: 'Test Box', minX: -0.5, minY: -0.5, minZ: -0.5, maxX: 0.5, maxY: 0.5, maxZ: 0.5, visible: true, locked: false, color: '#38bdf8' };
    projectStore.loadProject({
      name: 'Test',
      format: 'regular',
      snapResolution: 16,
      nodeHeight: 1,
      boxes: [testBox],
      textures: []
    });
    projectStore.setSelectedBoxId('b_test');

    const mesh = MeshBuilder.CreateBox('box_b_test', { size: 1 }, scene);
    (service as any).boxMeshes.set('b_test', mesh);

    // 1. Simulate ScaleGizmo scaling a 3D box down past 0 along Y -> clamps to 1 grid unit (1/16 = 0.0625)
    (service as any).dragInitialBox = { ...testBox };
    mesh.scaling.set(1.0, 0.0, 1.0);
    mesh.position.set(0.0, 0.0, 0.0);

    (service as any).onScaleGizmoDragEnd();

    const clampedBox = projectStore.project().boxes.find(b => b.id === 'b_test')!;
    expect(clampedBox.maxY - clampedBox.minY).toBe(0.0625); // clamped to 1 grid unit, never stuck at 0!

    // 2. Set box to exact 2D plane via store (as done by Box Inspector input fields)
    projectStore.updateBox('b_test', { minY: 0, maxY: 0 });
    const planeBox = projectStore.project().boxes.find(b => b.id === 'b_test')!;
    expect(planeBox.maxY - planeBox.minY).toBe(0);

    // 3. User scales X on this 2D plane (red handle): Y should remain a 2D plane!
    (service as any).dragInitialBox = { ...planeBox };
    mesh.scaling.set(1.0, 0.001, 1.0); // Y scaling remained at 0.001
    mesh.position.set(0.0, 0.0, 0.0);

    (service as any).onScaleGizmoDragEnd();
    const scaledPlane = projectStore.project().boxes.find(b => b.id === 'b_test')!;
    expect(scaledPlane.maxY - scaledPlane.minY).toBe(0); // Y remains 2D plane!

    // 4. User drags Y handle UP on this 2D plane: expands back to 3D!
    (service as any).dragInitialBox = { ...scaledPlane };
    mesh.scaling.set(1.0, 0.003, 1.0); // Y scaling increased by dragging green handle up
    mesh.position.set(0.0, 0.0, 0.0);

    (service as any).onScaleGizmoDragEnd();
    const expandedBox = projectStore.project().boxes.find(b => b.id === 'b_test')!;
    expect(expandedBox.minX).toBe(-0.5);
    expect(expandedBox.maxX).toBe(0.5);
    expect(expandedBox.maxY - expandedBox.minY).toBe(0.0625); // expanded into 3D!

    // 5. Simulate BoundingBoxGizmo dragging right face to 0.25 while anchored
    (service as any).dragInitialBox = { ...expandedBox };
    (service as any).activeDragFace = 'right';
    mesh.scaling.set(0.75, 0.0625, 1.0);
    mesh.position.set(-0.125, 0.03125, 0.0);

    (service as any).onBoundingBoxDragEnd();

    const resizedBox = projectStore.project().boxes.find(b => b.id === 'b_test')!;
    expect(resizedBox.minX).toBe(-0.5); // strictly anchored!
    expect(resizedBox.maxX).toBe(0.25);
  });

  it('configures scaleGizmo and bboxGizmo for snappy responsiveness and unclamped scaling', async () => {
    const { NullEngine, Scene, MeshBuilder } = await import('@babylonjs/core');
    const engine = new NullEngine();
    const scene = new Scene(engine);
    (service as any).engine = engine;
    (service as any).scene = scene;

    const projectStore = (service as any).projectStore as ProjectStore;
    const testBox = { id: 'b_snappy', name: 'Snappy Box', minX: -0.5, minY: -0.5, minZ: -0.5, maxX: 0.5, maxY: 0.5, maxZ: 0.5, visible: true, locked: false, color: '#38bdf8' };
    projectStore.loadProject({
      name: 'Test',
      format: 'regular',
      snapResolution: 16,
      nodeHeight: 1,
      boxes: [testBox],
      textures: []
    });
    projectStore.setSelectedBoxId('b_snappy');

    const mesh = MeshBuilder.CreateBox('box_b_snappy', { size: 1 }, scene);
    (service as any).boxMeshes.set('b_snappy', mesh);

    (service as any).setupGizmoManager();
    service.setGizmoMode('scale');
    service.updateGizmoState();

    const scaleGizmo = (service as any).gizmoManager?.gizmos?.scaleGizmo;
    expect(scaleGizmo).toBeDefined();
    expect(scaleGizmo.sensitivity).toBe(4.0);
    expect(scaleGizmo.snapDistance).toBe(0);

    service.setGizmoMode('resize');
    service.updateGizmoState();

    const bboxGizmo = (service as any).gizmoManager?.gizmos?.boundingBoxGizmo;
    expect(bboxGizmo).toBeDefined();
    expect(bboxGizmo.scaleDragSpeed).toBe(1.0);
    expect(bboxGizmo.scalingSnapDistance).toBe(0);
  });

  it('correctly configures depth testing, backface culling, depth prepass, and camera frustum', async () => {
    const { NullEngine, Scene, Material, ArcRotateCamera, Vector3 } = await import('@babylonjs/core');
    const engine = new NullEngine();
    const scene = new Scene(engine);
    (service as any).engine = engine;
    (service as any).scene = scene;
    (service as any).camera = new ArcRotateCamera('Camera', 0, 0, 2.5, Vector3.Zero(), scene);
    (service as any).camera.minZ = 0.05;
    (service as any).camera.maxZ = 100.0;

    // Verify camera depth bounds
    expect((service as any).camera.minZ).toBe(0.05);
    expect((service as any).camera.maxZ).toBe(100.0);

    // Standard material
    const woodMat = (service as any).getOrCreateTextureMaterial('default_wood.png');
    expect(woodMat.transparencyMode).toBe(Material.MATERIAL_ALPHATEST);
    expect(woodMat.alphaCutOff).toBe(0.5);
    expect(woodMat.backFaceCulling).toBe(true);

    // Glass material (semi-transparent)
    const glassMat = (service as any).getOrCreateTextureMaterial('default_glass.png');
    expect(glassMat.transparencyMode).toBe(Material.MATERIAL_ALPHABLEND);
    expect(glassMat.needDepthPrePass).toBe(true);

    // Face highlight mesh
    (service as any).buildFaceHighlightMesh();
    expect((service as any).faceHighlightMesh.renderingGroupId).toBe(1);
  });

  it('correctly builds floor platform and updates floor materials for various presets', async () => {
    const { NullEngine, Scene } = await import('@babylonjs/core');
    const engine = new NullEngine();
    const scene = new Scene(engine);
    (service as any).engine = engine;
    (service as any).scene = scene;

    (service as any).buildFloorPlatform();
    const floorMesh = (service as any).floorMesh;
    const floorMat = (service as any).floorMaterial;

    expect(floorMesh).toBeDefined();
    expect(floorMat).toBeDefined();
    expect(floorMesh.position.y).toBe(-0.501);

    // Initial floor is 'none' -> disabled
    expect(service.sceneFloor()).toBe('none');
    expect(floorMesh.isEnabled()).toBe(false);

    // Set to grass -> enabled, diffuseTexture assigned
    service.setSceneFloor('grass');
    expect(floorMesh.isEnabled()).toBe(true);
    expect(floorMat.diffuseTexture).toBeDefined();
    expect(floorMat.useAlphaFromDiffuseTexture).toBe(false);

    // Set to glass -> alpha enabled
    service.setSceneFloor('glass');
    expect(floorMesh.isEnabled()).toBe(true);
    expect(floorMat.useAlphaFromDiffuseTexture).toBe(true);

    // Set to grid -> enabled, no diffuse texture
    service.setSceneFloor('grid');
    expect(floorMesh.isEnabled()).toBe(true);
    expect(floorMat.diffuseTexture).toBeNull();

    // Set back to none -> disabled
    service.setSceneFloor('none');
    expect(floorMesh.isEnabled()).toBe(false);
  });

  it('correctly calculates isBoxVisibleInSimulation for connected slots', () => {
    const defaultNeighbors = {
      top: false,
      bottom: false,
      front: true,
      back: false,
      left: false,
      right: false
    };

    const fixedBox = { slot: 'fixed' } as any;
    expect(service.isBoxVisibleInSimulation(fixedBox, defaultNeighbors)).toBe(true);

    const connectFrontBox = { slot: 'connect_front' } as any;
    expect(service.isBoxVisibleInSimulation(connectFrontBox, defaultNeighbors)).toBe(true);

    const disconnectedFrontBox = { slot: 'disconnected_front' } as any;
    expect(service.isBoxVisibleInSimulation(disconnectedFrontBox, defaultNeighbors)).toBe(false);

    const connectBackBox = { slot: 'connect_back' } as any;
    expect(service.isBoxVisibleInSimulation(connectBackBox, defaultNeighbors)).toBe(false);

    const disconnectedSidesBox = { slot: 'disconnected_sides' } as any;
    // front is connected, so disconnected_sides is false
    expect(service.isBoxVisibleInSimulation(disconnectedSidesBox, defaultNeighbors)).toBe(false);

    // If no horizontal sides are connected
    const isolatedNeighbors = { ...defaultNeighbors, front: false };
    expect(service.isBoxVisibleInSimulation(disconnectedSidesBox, isolatedNeighbors)).toBe(true);

    const disconnectedBox = { slot: 'disconnected' } as any;
    expect(service.isBoxVisibleInSimulation(disconnectedBox, isolatedNeighbors)).toBe(true);
  });

  it('handles simulation mode for connected, wallmounted, and leveled types', async () => {
    const { NullEngine, Scene } = await import('@babylonjs/core');
    const engine = new NullEngine();
    const scene = new Scene(engine);
    (service as any).engine = engine;
    (service as any).scene = scene;

    const projectStore = (service as any).projectStore as ProjectStore;
    projectStore.setNodeboxType('connected');
    projectStore.setSimulationMode(true);

    (service as any).updateSimulationHelpers();
    expect((service as any).ghostNeighborMeshes.size).toBe(6);

    const ghostTop = (service as any).ghostNeighborMeshes.get('top');
    expect(ghostTop).toBeDefined();
    expect(ghostTop.isEnabled()).toBe(true);

    // Switch to wallmounted
    projectStore.setNodeboxType('wallmounted');
    projectStore.setWallmountedPreviewSlot('wall_side');
    (service as any).updateSimulationHelpers();

    expect((service as any).wallmountedPlaneMesh).toBeDefined();
    expect((service as any).wallmountedPlaneMesh.isEnabled()).toBe(true);
    expect((service as any).wallmountedPlaneMesh.position.x).toBeCloseTo(-0.501);

    // Test leveled clamping in updateSingleBoxMesh
    projectStore.setNodeboxType('leveled');
    projectStore.setLeveledPreviewHeight(4); // 4/16 = 0.25 -> clamped top Y = -0.5 + 0.25 = -0.25
    const leveledBox = {
      id: 'snow_layer',
      name: 'Snow',
      minX: -0.5,
      minY: -0.5,
      minZ: -0.5,
      maxX: 0.5,
      maxY: 0.5, // taller than level 4
      maxZ: 0.5,
      visible: true,
      locked: false,
      color: '#ffffff'
    };
    service.updateBoxes([leveledBox as any], 'snow_layer');
    const snowMesh = (service as any).boxMeshes.get('snow_layer');
    expect(snowMesh).toBeDefined();
    expect(snowMesh.scaling.y).toBeCloseTo(0.25);
    expect(snowMesh.position.y).toBeCloseTo((-0.5 + -0.25) / 2);
  });
});

