import { Injectable, NgZone, effect, inject, signal } from '@angular/core';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Mesh,
  LinesMesh,
  Texture,
  Material,
  MultiMaterial,
  SubMesh,
  GizmoManager,
  BoundingBoxGizmo,
  PointerEventTypes,
  Tools,
  VertexBuffer
} from '@babylonjs/core';
import { Box, FaceDirection, LUANTI_FACE_DIRECTIONS, AABB } from '../../../core/models/nodebox.model';
import { computeNodeBoxUVBuffer } from '../../../core/utils/uv-projection.utils';
import { ProjectStore } from '../../../core/state/project.store';
import { TextureService } from '../../../core/services/texture.service';
import { ThemeService } from '../../../core/services/theme.service';
import {
  PixelDepthConfig,
  DEFAULT_PIXEL_DEPTH_CONFIG,
  getDepthIntensityMultiplier
} from '../../../core/utils/pixel-normal-generator.utils';
import {
  extractSnappedAABB,
  scaleSymmetricAABB,
  getFaceDirectionFromDragAxis,
  getFaceAxisDescription
} from '../../../core/utils/box-resize.utils';

export type CameraPreset = 'iso' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';
export type CameraMode = 'perspective' | 'orthographic';
export type ViewportMode = 'textured' | 'colored' | 'wireframe';
export type GizmoMode = 'none' | 'position' | 'scale' | 'resize' | 'rotation';
export type SceneFloor = 'none' | 'grass' | 'stone' | 'grid';
export type SceneSky = 'studio' | 'minetest_day' | 'minetest_sunset' | 'minetest_night';
export type ScreenshotResolution = 'viewport' | '1080p' | '4k' | 'icon';

@Injectable({
  providedIn: 'root'
})
export class BabylonSceneService {
  private zone = inject(NgZone);
  private projectStore = inject(ProjectStore);
  private textureService = inject(TextureService);
  private themeService = inject(ThemeService);

  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private camera: ArcRotateCamera | null = null;
  private hemiLight: HemisphericLight | null = null;
  private dirLight: DirectionalLight | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private gizmoManager: GizmoManager | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeRafId: number | null = null;

  private boxMeshes = new Map<string, Mesh>();
  private cageMesh: LinesMesh | null = null;
  private gridMesh: Mesh | null = null;
  private floorMesh: Mesh | null = null;
  private floorMaterial: StandardMaterial | null = null;
  private faceHighlightMesh: Mesh | null = null;
  private materialCache = new Map<string, StandardMaterial>();
  private textureCache = new Map<string, Texture>();
  private animatedTextures = new Map<
    string,
    {
      texture: Texture;
      normalTexture?: Texture;
      frameCount: number;
      length: number;
      lastFrameIndex: number;
    }
  >();

  private dragInitialBox: Box | null = null;
  private dragInitialPos: Vector3 = new Vector3();
  private dragInitialScale: Vector3 = new Vector3();
  private scaleDragAxis: 'x' | 'y' | 'z' | null = null;
  private scaleAccumulatedDistance = 0;
  private orthoZoom = 1.2;

  public activeFace = signal<FaceDirection | null>(null);

  public viewportMode = signal<ViewportMode>('textured');
  public gizmoMode = signal<GizmoMode>('position');
  public showCage = signal<boolean>(true);
  public showGrid = signal<boolean>(true);
  public cameraMode = signal<CameraMode>('perspective');
  public sceneFloor = signal<SceneFloor>('none');
  public sceneSky = signal<SceneSky>('studio');
  public isTurntableActive = signal<boolean>(false);
  private isRenderingPaused = false;

  private onVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;
    this.isRenderingPaused = document.hidden;
    if (!document.hidden && this.scene && this.scene.activeCamera) {
      this.scene.render();
    }
  };

  public pixelDepth = signal<PixelDepthConfig>(DEFAULT_PIXEL_DEPTH_CONFIG);

  constructor() {
    try {
      effect(() => {
        this.themeService.theme();
        if (this.sceneSky() === 'studio') {
          this.applySkySettings('studio');
        }
      });

      effect(() => {
        this.textureService.textureUpdated();
        this.refreshAllMaterials();
      });

      effect(() => {
        const height = this.projectStore.project()?.nodeHeight ?? 1;
        if (this.scene) {
          this.buildNodeCage();
          this.buildReferenceGrid();
          if (this.camera) {
            const centerY = (height - 1) * 0.5;
            this.camera.target = new Vector3(0, centerY, 0);
          }
        }
      });
    } catch {
      // Ignored outside injection context
    }
  }

  public setPixelDepth(config: Partial<PixelDepthConfig>): void {
    this.pixelDepth.update(c => ({ ...c, ...config }));
    this.refreshAllMaterials();
  }

  public refreshAllMaterials(): void {
    if (!this.scene) return;
    for (const mat of this.materialCache.values()) {
      mat.dispose();
    }
    this.materialCache.clear();
    this.animatedTextures.clear();
    for (const [key, tex] of this.textureCache.entries()) {
      if (key.startsWith('bump_')) {
        tex.dispose();
        this.textureCache.delete(key);
      }
    }
    const project = this.projectStore.project();
    const selectedId = this.projectStore.selectedBoxId();
    this.updateBoxes(project.boxes, selectedId);
  }

  public initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.zone.runOutsideAngular(() => {
      // 4th parameter adaptToDeviceRatio=true fixes Retina/HighDPI pointer offset
      this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true);
      this.scene = new Scene(this.engine);
      this.scene.clearColor = new Color4(0.06, 0.09, 0.16, 1.0); // Deep slate background

      // Setup Camera
      const initialHeight = this.projectStore.project()?.nodeHeight ?? 1;
      const initialCenterY = (initialHeight - 1) * 0.5;
      this.camera = new ArcRotateCamera(
        'MainCamera',
        -Math.PI / 4,
        Math.PI / 3,
        initialHeight > 1 ? 3.2 : 2.5,
        new Vector3(0, initialCenterY, 0),
        this.scene
      );
      this.camera.lowerRadiusLimit = 0.5;
      this.camera.upperRadiusLimit = 10.0;
      this.camera.wheelPrecision = 40;
      this.camera.attachControl(canvas, true);

      // Setup Lights
      this.hemiLight = new HemisphericLight('HemiLight', new Vector3(0, 1, 0), this.scene);
      this.hemiLight.intensity = 0.45;
      this.hemiLight.diffuse = new Color3(1, 1, 1);
      this.hemiLight.groundColor = new Color3(0.3, 0.35, 0.4);

      this.dirLight = new DirectionalLight('DirLight', new Vector3(-1.2, -2.0, -1.0), this.scene);
      this.dirLight.position = new Vector3(2, 4, 2);
      this.dirLight.intensity = 0.95;

      // Apply initial environment sky / lighting
      this.applySkySettings(this.sceneSky());

      // Live animation ticker for Luanti animated vertical texture sheets
      this.scene.onBeforeRenderObservable.add(() => {
        this.updateAnimatedTextures();
      });

      // Setup Helpers (1x1x1 Node cage, 16x16 Grid, Floor Platform, Face Highlight)
      this.buildNodeCage();
      this.buildReferenceGrid();
      this.buildFloorPlatform();
      this.buildFaceHighlightMesh();

      // Setup Gizmo Manager
      this.setupGizmoManager();

      // Setup Pointer Picking
      this.setupPointerPicking();

      // Render Loop (automatically paused when tab is inactive to preserve GPU/battery)
      this.engine.runRenderLoop(() => {
        if (!this.isRenderingPaused && this.scene && this.scene.activeCamera) {
          this.scene.render();
        }
      });

      // Canvas wheel listener for Orthographic zoom
      canvas.addEventListener('wheel', this.onCanvasWheel, { passive: false });

      // Pause render loop when page/tab is hidden
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.onVisibilityChange);
      }

      // Continuous Resize Observer with RAF throttling guarantees smooth rendering and zero flicker
      this.resizeObserver = new ResizeObserver(() => {
        this.triggerSmoothResize();
      });
      this.resizeObserver.observe(canvas);

      window.addEventListener('resize', this.triggerSmoothResize);
    });
  }

  public triggerSmoothResize = (): void => {
    if (this.resizeRafId !== null) return;
    this.resizeRafId = requestAnimationFrame(() => {
      this.resizeRafId = null;
      if (!this.engine || !this.scene) return;
      this.engine.resize();
      if (this.camera?.mode === ArcRotateCamera.ORTHOGRAPHIC_CAMERA) {
        this.updateOrthoFrustum();
      }
      if (this.scene.activeCamera) {
        this.scene.render();
      }
    });
  };

  /**
   * Builds the reference bounding cage showing standard Luanti node borders.
   * For 1 node: [-0.5, 0.5] in all axes.
   * For 2 nodes: [-0.5, 1.5] in Y with an intermediate divider frame at Y = 0.5.
   */
  private buildNodeCage(): void {
    if (!this.scene) return;

    if (this.cageMesh) {
      this.cageMesh.dispose();
      this.cageMesh = null;
    }

    const height = this.projectStore.project()?.nodeHeight ?? 1;
    const minX = -0.5;
    const maxX = 0.5;
    const minZ = -0.5;
    const maxZ = 0.5;
    const minY = -0.5;
    const maxY = -0.5 + height;

    const lines: Vector3[][] = [
      // Bottom square
      [
        new Vector3(minX, minY, minZ),
        new Vector3(maxX, minY, minZ),
        new Vector3(maxX, minY, maxZ),
        new Vector3(minX, minY, maxZ),
        new Vector3(minX, minY, minZ)
      ],
      // Top square
      [
        new Vector3(minX, maxY, minZ),
        new Vector3(maxX, maxY, minZ),
        new Vector3(maxX, maxY, maxZ),
        new Vector3(minX, maxY, maxZ),
        new Vector3(minX, maxY, minZ)
      ],
      // 4 Verticals
      [new Vector3(minX, minY, minZ), new Vector3(minX, maxY, minZ)],
      [new Vector3(maxX, minY, minZ), new Vector3(maxX, maxY, minZ)],
      [new Vector3(maxX, minY, maxZ), new Vector3(maxX, maxY, maxZ)],
      [new Vector3(minX, minY, maxZ), new Vector3(minX, maxY, maxZ)]
    ];

    // Intermediate horizontal node divider frames (e.g. at Y = 0.5 for 2-node)
    for (let h = 1; h < height; h++) {
      const divY = -0.5 + h;
      lines.push([
        new Vector3(minX, divY, minZ),
        new Vector3(maxX, divY, minZ),
        new Vector3(maxX, divY, maxZ),
        new Vector3(minX, divY, maxZ),
        new Vector3(minX, divY, minZ)
      ]);
    }

    this.cageMesh = MeshBuilder.CreateLineSystem('NodeCage', { lines }, this.scene);
    this.cageMesh.color = new Color3(0.3, 0.6, 0.9);
    this.cageMesh.alpha = 0.5;
    this.cageMesh.isPickable = false;
    this.cageMesh.setEnabled(!this.projectStore.isRenderMode() && this.showCage());
  }

  /**
   * Builds the subdivided reference grid.
   * For 1 node: 16x16 subdivided floor grid at y = -0.5.
   * For 2 nodes: floor grid at y = -0.5, mid-node divider cross at y = 0.5,
   * plus a 16x32 vertical back-wall reference grid at z = 0.5 spanning y in [-0.5, 1.5].
   */
  private buildReferenceGrid(): void {
    if (!this.scene) return;

    if (this.gridMesh) {
      this.gridMesh.dispose();
      this.gridMesh = null;
    }

    const height = this.projectStore.project()?.nodeHeight ?? 1;
    const gridLines: Vector3[][] = [];
    const step = 1 / 16;
    const min = -0.5;
    const max = 0.5;
    const floorY = -0.5;
    const maxY = -0.5 + height;

    // 16x16 Subdivided Floor Grid
    for (let i = 0; i <= 16; i++) {
      const coord = min + i * step;
      // Along X (constant Z)
      gridLines.push([new Vector3(min, floorY, coord), new Vector3(max, floorY, coord)]);
      // Along Z (constant X)
      gridLines.push([new Vector3(coord, floorY, min), new Vector3(coord, floorY, max)]);
    }

    // For multi-node (e.g. 2 nodes):
    if (height > 1) {
      // Intermediate floor/ceiling boundary frames and center crosses
      for (let h = 1; h < height; h++) {
        const midY = -0.5 + h;
        // Mid boundary perimeter
        gridLines.push([
          new Vector3(min, midY, min),
          new Vector3(max, midY, min),
          new Vector3(max, midY, max),
          new Vector3(min, midY, max),
          new Vector3(min, midY, min)
        ]);
        // Center cross on separator plane
        gridLines.push([new Vector3(min, midY, 0), new Vector3(max, midY, 0)]);
        gridLines.push([new Vector3(0, midY, min), new Vector3(0, midY, max)]);
      }

      // Vertical back-wall reference grid at z = 0.5 (spanning full height)
      const backZ = 0.5;
      const totalRows = Math.round(height * 16);
      // Vertical grid lines on back wall (constant X, from floorY to maxY)
      for (let i = 0; i <= 16; i++) {
        const coordX = min + i * step;
        gridLines.push([new Vector3(coordX, floorY, backZ), new Vector3(coordX, maxY, backZ)]);
      }
      // Horizontal grid lines on back wall (constant Y, from min to max X)
      for (let j = 0; j <= totalRows; j++) {
        const coordY = floorY + j * step;
        gridLines.push([new Vector3(min, coordY, backZ), new Vector3(max, coordY, backZ)]);
      }
    }

    const grid = MeshBuilder.CreateLineSystem('GridFloor', { lines: gridLines }, this.scene);
    grid.color = new Color3(0.2, 0.25, 0.35);
    grid.alpha = 0.6;
    grid.isPickable = false;
    grid.setEnabled(!this.projectStore.isRenderMode() && this.showGrid());
    this.gridMesh = grid;
  }

  /**
   * Builds a reusable unlit glowing highlight plane for displaying the active face in Resize mode.
   */
  private buildFaceHighlightMesh(): void {
    if (!this.scene) return;
    const mesh = MeshBuilder.CreatePlane('FaceHighlightMesh', { size: 1, updatable: true }, this.scene);
    const mat = new StandardMaterial('FaceHighlightMat', this.scene);
    mat.diffuseColor = new Color3(0.2, 0.8, 1.0);
    mat.emissiveColor = new Color3(0.2, 0.8, 1.0);
    mat.alpha = 0.45;
    mat.backFaceCulling = false;
    mat.disableLighting = true; // Unlit luminous glow
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.setEnabled(false);
    this.faceHighlightMesh = mesh;
  }

  public updateFaceHighlight(face: FaceDirection): void {
    if (!this.faceHighlightMesh || !this.scene) return;
    const selectedId = this.projectStore.selectedBoxId();
    if (!selectedId) {
      this.faceHighlightMesh.setEnabled(false);
      return;
    }
    const box = this.projectStore.project().boxes.find(b => b.id === selectedId);
    if (!box) {
      this.faceHighlightMesh.setEnabled(false);
      return;
    }

    const width = Math.max(0.001, box.maxX - box.minX);
    const height = Math.max(0.001, box.maxY - box.minY);
    const depth = Math.max(0.001, box.maxZ - box.minZ);
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    const cz = (box.minZ + box.maxZ) / 2;

    const eps = 0.002;

    switch (face) {
      case 'top':
        this.faceHighlightMesh.scaling.set(width, depth, 1);
        this.faceHighlightMesh.rotation.set(Math.PI / 2, 0, 0);
        this.faceHighlightMesh.position.set(cx, box.maxY + eps, cz);
        break;
      case 'bottom':
        this.faceHighlightMesh.scaling.set(width, depth, 1);
        this.faceHighlightMesh.rotation.set(-Math.PI / 2, 0, 0);
        this.faceHighlightMesh.position.set(cx, box.minY - eps, cz);
        break;
      case 'right':
        this.faceHighlightMesh.scaling.set(depth, height, 1);
        this.faceHighlightMesh.rotation.set(0, -Math.PI / 2, 0);
        this.faceHighlightMesh.position.set(box.maxX + eps, cy, cz);
        break;
      case 'left':
        this.faceHighlightMesh.scaling.set(depth, height, 1);
        this.faceHighlightMesh.rotation.set(0, Math.PI / 2, 0);
        this.faceHighlightMesh.position.set(box.minX - eps, cy, cz);
        break;
      case 'back':
        this.faceHighlightMesh.scaling.set(width, height, 1);
        this.faceHighlightMesh.rotation.set(0, Math.PI, 0);
        this.faceHighlightMesh.position.set(cx, cy, box.maxZ + eps);
        break;
      case 'front':
        this.faceHighlightMesh.scaling.set(width, height, 1);
        this.faceHighlightMesh.rotation.set(0, 0, 0);
        this.faceHighlightMesh.position.set(cx, cy, box.minZ - eps);
        break;
    }

    this.faceHighlightMesh.setEnabled(true);
  }

  public hideFaceHighlight(): void {
    if (this.faceHighlightMesh) {
      this.faceHighlightMesh.setEnabled(false);
    }
  }

  private tagBoundingBoxScaleBoxes(bboxGizmo: BoundingBoxGizmo): void {
    const scaleBoxes = bboxGizmo.getScaleBoxes();
    let index = 0;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          const zeroAxisCount = (i === 1 ? 1 : 0) + (j === 1 ? 1 : 0) + (k === 1 ? 1 : 0);
          if (zeroAxisCount === 1 || zeroAxisCount === 3) {
            continue;
          }
          const box = scaleBoxes[index];
          if (box) {
            const dragAxis = new Vector3(i - 1, j - 1, k - 1);
            const face = getFaceDirectionFromDragAxis(dragAxis);
            box.metadata = { dragAxis, faceDirection: face };
          }
          index++;
        }
      }
    }
  }

  public getFaceAxisName(face: FaceDirection): string {
    return getFaceAxisDescription(face);
  }

  private setupGizmoManager(): void {
    if (!this.scene) return;

    this.gizmoManager = new GizmoManager(this.scene);
    this.gizmoManager.usePointerToAttachGizmos = false;

    // Enable position, scale, and rotation gizmo instances so listeners are attached ONCE
    this.gizmoManager.positionGizmoEnabled = true;
    this.gizmoManager.scaleGizmoEnabled = true;
    this.gizmoManager.rotationGizmoEnabled = true;

    // 1. Position Gizmo
    const posGizmo = this.gizmoManager.gizmos.positionGizmo;
    if (posGizmo) {
      posGizmo.scaleRatio = 1.1;
      const handlePosDragStart = () => {
        const selectedId = this.projectStore.selectedBoxId();
        const box = selectedId ? this.projectStore.project().boxes.find(b => b.id === selectedId) : null;
        const mesh = selectedId ? this.boxMeshes.get(selectedId) : null;
        if (box && mesh) {
          this.dragInitialBox = { ...box };
          this.dragInitialPos.copyFrom(mesh.position);
        }
      };

      const handlePosDragEnd = () => {
        this.onPositionGizmoDragEnd();
      };

      const handlePosDrag = () => {
        const selectedId = this.projectStore.selectedBoxId();
        if (selectedId && this.dragInitialBox) {
          const mesh = this.boxMeshes.get(selectedId);
          if (mesh) {
            const res = this.projectStore.project().snapResolution;
            const snap = (v: number) => Math.round(v * res) / res;
            const deltaX = snap(mesh.position.x - this.dragInitialPos.x);
            const deltaY = snap(mesh.position.y - this.dragInitialPos.y);
            const deltaZ = snap(mesh.position.z - this.dragInitialPos.z);
            const init = this.dragInitialBox;
            const aabb: AABB = {
              minX: snap(init.minX + deltaX),
              maxX: snap(init.maxX + deltaX),
              minY: snap(init.minY + deltaY),
              maxY: snap(init.maxY + deltaY),
              minZ: snap(init.minZ + deltaZ),
              maxZ: snap(init.maxZ + deltaZ)
            };
            const uvs = computeNodeBoxUVBuffer(aabb);
            mesh.setVerticesData(VertexBuffer.UVKind, uvs, true);
          }
        }
      };

      posGizmo.xGizmo.dragBehavior.onDragObservable.add(handlePosDrag);
      posGizmo.yGizmo.dragBehavior.onDragObservable.add(handlePosDrag);
      posGizmo.zGizmo.dragBehavior.onDragObservable.add(handlePosDrag);

      posGizmo.xGizmo.dragBehavior.onDragStartObservable.add(handlePosDragStart);
      posGizmo.yGizmo.dragBehavior.onDragStartObservable.add(handlePosDragStart);
      posGizmo.zGizmo.dragBehavior.onDragStartObservable.add(handlePosDragStart);

      posGizmo.xGizmo.dragBehavior.onDragEndObservable.add(handlePosDragEnd);
      posGizmo.yGizmo.dragBehavior.onDragEndObservable.add(handlePosDragEnd);
      posGizmo.zGizmo.dragBehavior.onDragEndObservable.add(handlePosDragEnd);
    }

    // 2. Scale Gizmo (3 clean axes, uniform sensitivity, centered zero-drift)
    const scaleGizmo = this.gizmoManager.gizmos.scaleGizmo;
    if (scaleGizmo) {
      scaleGizmo.scaleRatio = 1.1;
      if (scaleGizmo.uniformScaleGizmo) {
        scaleGizmo.uniformScaleGizmo.isEnabled = false;
      }

      scaleGizmo.xGizmo.sensitivity = 1;
      scaleGizmo.yGizmo.sensitivity = 1;
      scaleGizmo.zGizmo.sensitivity = 1;

      const handleScaleDragStart = (axis: 'x' | 'y' | 'z') => {
        const selectedId = this.projectStore.selectedBoxId();
        const box = selectedId ? this.projectStore.project().boxes.find(b => b.id === selectedId) : null;
        const mesh = selectedId ? this.boxMeshes.get(selectedId) : null;
        if (box && mesh) {
          this.dragInitialBox = { ...box };
          this.dragInitialScale.copyFrom(mesh.scaling);
          this.scaleDragAxis = axis;
          this.scaleAccumulatedDistance = 0;
        }
      };

      const handleScaleDragEnd = () => {
        this.onScaleGizmoDragEnd();
      };

      scaleGizmo.xGizmo.dragBehavior.onDragStartObservable.add(() => handleScaleDragStart('x'));
      scaleGizmo.yGizmo.dragBehavior.onDragStartObservable.add(() => handleScaleDragStart('y'));
      scaleGizmo.zGizmo.dragBehavior.onDragStartObservable.add(() => handleScaleDragStart('z'));

      const SCALE_DRAG_SENSITIVITY = 0.3;

      const updateScaleDragUV = (axis: 'x' | 'y' | 'z') => {
        const selectedId = this.projectStore.selectedBoxId();
        if (selectedId && this.dragInitialBox && this.scaleDragAxis) {
          const m = this.boxMeshes.get(selectedId);
          if (m) {
            const res = this.projectStore.project().snapResolution;
            const aabb = scaleSymmetricAABB(this.dragInitialBox, axis, this.scaleAccumulatedDistance, res);
            const uvs = computeNodeBoxUVBuffer(aabb);
            m.setVerticesData(VertexBuffer.UVKind, uvs, true);
          }
        }
      };

      scaleGizmo.xGizmo.dragBehavior.onDragObservable.add((event) => {
        if (this.scaleDragAxis === 'x') {
          this.scaleAccumulatedDistance += event.dragDistance * SCALE_DRAG_SENSITIVITY;
          updateScaleDragUV('x');
        }
      });
      scaleGizmo.yGizmo.dragBehavior.onDragObservable.add((event) => {
        if (this.scaleDragAxis === 'y') {
          this.scaleAccumulatedDistance += event.dragDistance * SCALE_DRAG_SENSITIVITY;
          updateScaleDragUV('y');
        }
      });
      scaleGizmo.zGizmo.dragBehavior.onDragObservable.add((event) => {
        if (this.scaleDragAxis === 'z') {
          this.scaleAccumulatedDistance += event.dragDistance * SCALE_DRAG_SENSITIVITY;
          updateScaleDragUV('z');
        }
      });

      scaleGizmo.xGizmo.dragBehavior.onDragEndObservable.add(handleScaleDragEnd);
      scaleGizmo.yGizmo.dragBehavior.onDragEndObservable.add(handleScaleDragEnd);
      scaleGizmo.zGizmo.dragBehavior.onDragEndObservable.add(handleScaleDragEnd);
    }

    // 3. Rotation Gizmo (strictly snapped to 90 degree increments!)
    const rotGizmo = this.gizmoManager.gizmos.rotationGizmo;
    if (rotGizmo) {
      rotGizmo.scaleRatio = 1.1;
      rotGizmo.snapDistance = Math.PI / 2; // Exact 90 degree step!
      rotGizmo.updateGizmoRotationToMatchAttachedMesh = false;

      rotGizmo.xGizmo.dragBehavior.onDragEndObservable.add(() => this.onRotationGizmoDragEnd('x'));
      rotGizmo.yGizmo.dragBehavior.onDragEndObservable.add(() => this.onRotationGizmoDragEnd('y'));
      rotGizmo.zGizmo.dragBehavior.onDragEndObservable.add(() => this.onRotationGizmoDragEnd('z'));
    }

    // 4. Bounding Box / Face Resize Gizmo (scales individual faces/corners, anchored to opposite side)
    this.gizmoManager.boundingBoxGizmoEnabled = true;
    const bboxGizmo = this.gizmoManager.gizmos.boundingBoxGizmo as BoundingBoxGizmo | null;
    if (bboxGizmo) {
      bboxGizmo.scaleBoxSize = 0.16;
      bboxGizmo.fixedDragMeshScreenSize = true;
      bboxGizmo.fixedDragMeshScreenSizeDistanceFactor = 12;
      bboxGizmo.setColor(new Color3(0.2, 0.75, 1.0));
      bboxGizmo.hoverMaterial.emissiveColor = new Color3(1.0, 0.85, 0.2);
      bboxGizmo.hoverMaterial.diffuseColor = new Color3(1.0, 0.85, 0.2);
      bboxGizmo.coloredMaterial.emissiveColor = new Color3(0.2, 0.75, 1.0);
      bboxGizmo.setEnabledRotationAxis('');

      this.tagBoundingBoxScaleBoxes(bboxGizmo);

      bboxGizmo.onScaleBoxDragObservable.add((event) => {
        const face = getFaceDirectionFromDragAxis(event.dragAxis);
        this.zone.run(() => this.activeFace.set(face));
        if (face) {
          this.updateFaceHighlight(face);
        } else {
          this.hideFaceHighlight();
        }

        const selectedId = this.projectStore.selectedBoxId();
        if (selectedId) {
          const m = this.boxMeshes.get(selectedId);
          if (m) {
            const res = this.projectStore.project().snapResolution;
            const aabb = extractSnappedAABB(m.position, m.scaling, res);
            const uvs = computeNodeBoxUVBuffer(aabb);
            m.setVerticesData(VertexBuffer.UVKind, uvs, true);
          }
        }
      });

      bboxGizmo.onScaleBoxDragEndObservable.add(() => {
        this.onBoundingBoxDragEnd();
      });

      // Pointer hover detection on utility scene for face handles
      const utilScene = this.gizmoManager.keepDepthUtilityLayer.utilityLayerScene;
      utilScene.onPointerObservable.add((pointerInfo) => {
        if (this.gizmoMode() !== 'resize') return;
        if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
          if (bboxGizmo.isDragging) return;

          const pick = pointerInfo.pickInfo;
          if (pick && pick.hit && pick.pickedMesh) {
            const face = pick.pickedMesh.metadata?.faceDirection as FaceDirection | undefined;
            if (face) {
              if (this.activeFace() !== face) {
                this.zone.run(() => this.activeFace.set(face));
                this.updateFaceHighlight(face);
              }
              return;
            }
          }

          if (this.activeFace()) {
            this.zone.run(() => this.activeFace.set(null));
            this.hideFaceHighlight();
          }
        }
      });
    }

    this.updateGizmoState();
  }

  public updateGizmoState(): void {
    if (!this.gizmoManager) return;

    if (this.projectStore.isRenderMode()) {
      this.gizmoManager.positionGizmoEnabled = false;
      this.gizmoManager.scaleGizmoEnabled = false;
      this.gizmoManager.rotationGizmoEnabled = false;
      this.gizmoManager.boundingBoxGizmoEnabled = false;
      this.gizmoManager.attachToMesh(null);
      this.hideFaceHighlight();
      this.zone.run(() => this.activeFace.set(null));
      return;
    }

    const selectedId = this.projectStore.selectedBoxId();
    const selectedMesh = selectedId ? this.boxMeshes.get(selectedId) : null;
    const selectedBox = selectedId ? this.projectStore.project().boxes.find(b => b.id === selectedId) : null;
    const isLocked = selectedBox?.locked ?? false;

    const canTransform = !!selectedMesh && !isLocked;

    const currentMode = this.gizmoMode();
    this.gizmoManager.positionGizmoEnabled = currentMode === 'position' && canTransform;
    this.gizmoManager.scaleGizmoEnabled = currentMode === 'scale' && canTransform;
    this.gizmoManager.rotationGizmoEnabled = currentMode === 'rotation' && canTransform;
    this.gizmoManager.boundingBoxGizmoEnabled = currentMode === 'resize' && canTransform;

    if (canTransform && selectedMesh) {
      this.gizmoManager.attachToMesh(selectedMesh);

      // Disable SixDofDragBehavior so clicking on the box in face resize mode NEVER rotates or moves it
      if (currentMode === 'resize') {
        this.gizmoManager.boundingBoxDragBehavior.detach();
        selectedMesh.removeBehavior(this.gizmoManager.boundingBoxDragBehavior);
      }

      // Configure snapping to current grid resolution
      const res = this.projectStore.project().snapResolution;
      if (this.gizmoManager.gizmos.positionGizmo) {
        this.gizmoManager.gizmos.positionGizmo.snapDistance = 1 / res;
      }
      if (this.gizmoManager.gizmos.scaleGizmo) {
        this.gizmoManager.gizmos.scaleGizmo.snapDistance = 0; // Disable multiplicative snap lock
      }
      if (this.gizmoManager.gizmos.rotationGizmo) {
        this.gizmoManager.gizmos.rotationGizmo.snapDistance = Math.PI / 2;
        this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
      }
      if (this.gizmoManager.gizmos.boundingBoxGizmo) {
        const bbox = this.gizmoManager.gizmos.boundingBoxGizmo as BoundingBoxGizmo;
        bbox.setEnabledRotationAxis('');
        bbox.scalingSnapDistance = 1 / res;
        bbox.updateBoundingBox();
        this.tagBoundingBoxScaleBoxes(bbox);
      }
    } else {
      this.gizmoManager.attachToMesh(null);
      this.hideFaceHighlight();
      this.zone.run(() => this.activeFace.set(null));
    }
  }

  private onPositionGizmoDragEnd(): void {
    const selectedId = this.projectStore.selectedBoxId();
    if (!selectedId || !this.dragInitialBox) return;

    const mesh = this.boxMeshes.get(selectedId);
    if (!mesh) return;

    const res = this.projectStore.project().snapResolution;
    const snap = (v: number) => Math.round(v * res) / res;

    // Delta movement snapped to grid resolution
    const deltaX = snap(mesh.position.x - this.dragInitialPos.x);
    const deltaY = snap(mesh.position.y - this.dragInitialPos.y);
    const deltaZ = snap(mesh.position.z - this.dragInitialPos.z);

    const init = this.dragInitialBox;
    this.zone.run(() => {
      this.projectStore.updateBox(selectedId, {
        minX: snap(init.minX + deltaX),
        maxX: snap(init.maxX + deltaX),
        minY: snap(init.minY + deltaY),
        maxY: snap(init.maxY + deltaY),
        minZ: snap(init.minZ + deltaZ),
        maxZ: snap(init.maxZ + deltaZ)
      });
    });

    this.dragInitialBox = null;
  }

  private onScaleGizmoDragEnd(): void {
    const selectedId = this.projectStore.selectedBoxId();
    if (!selectedId || !this.dragInitialBox || !this.scaleDragAxis) {
      this.dragInitialBox = null;
      this.scaleDragAxis = null;
      this.scaleAccumulatedDistance = 0;
      return;
    }

    const res = this.projectStore.project().snapResolution;
    const updatedAABB = scaleSymmetricAABB(
      this.dragInitialBox,
      this.scaleDragAxis,
      this.scaleAccumulatedDistance,
      res
    );

    this.zone.run(() => {
      this.projectStore.updateBox(selectedId, {
        minX: updatedAABB.minX,
        maxX: updatedAABB.maxX,
        minY: updatedAABB.minY,
        maxY: updatedAABB.maxY,
        minZ: updatedAABB.minZ,
        maxZ: updatedAABB.maxZ
      });
    });

    this.dragInitialBox = null;
    this.scaleDragAxis = null;
    this.scaleAccumulatedDistance = 0;
  }

  private onBoundingBoxDragEnd(): void {
    this.hideFaceHighlight();
    this.zone.run(() => this.activeFace.set(null));

    const selectedId = this.projectStore.selectedBoxId();
    if (!selectedId) return;

    const mesh = this.boxMeshes.get(selectedId);
    if (!mesh) return;

    const res = this.projectStore.project().snapResolution;
    const aabb = extractSnappedAABB(mesh.position, mesh.scaling, res);

    this.zone.run(() => {
      this.projectStore.updateBox(selectedId, {
        minX: aabb.minX,
        maxX: aabb.maxX,
        minY: aabb.minY,
        maxY: aabb.maxY,
        minZ: aabb.minZ,
        maxZ: aabb.maxZ
      });
    });

    this.dragInitialBox = null;
  }

  private onRotationGizmoDragEnd(axis: 'x' | 'y' | 'z'): void {
    const selectedId = this.projectStore.selectedBoxId();
    if (!selectedId) return;

    const mesh = this.boxMeshes.get(selectedId);
    if (!mesh) return;

    let rotVal = mesh.rotation[axis];
    if (mesh.rotationQuaternion) {
      const euler = mesh.rotationQuaternion.toEulerAngles();
      rotVal = euler[axis];
    }

    const steps = Math.round(rotVal / (Math.PI / 2));

    if (steps !== 0) {
      const dir = steps > 0 ? 1 : -1;
      const count = Math.abs(steps) % 4;
      this.zone.run(() => {
        for (let i = 0; i < count; i++) {
          this.projectStore.rotateBox(selectedId, axis, dir as (1 | -1), 'center');
        }
      });
    }

    // Always reset mesh rotation back to 0 so it strictly remains an axis-aligned box
    mesh.rotation.set(0, 0, 0);
    if (mesh.rotationQuaternion) {
      mesh.rotationQuaternion = null;
    }
  }

  private setupPointerPicking(): void {
    if (!this.scene) return;

    let downX = 0;
    let downY = 0;

    this.scene.onPointerObservable.add(pointerInfo => {
      // In Render Mode, pointer picking is completely disabled to avoid selecting boxes
      if (this.projectStore.isRenderMode()) return;

      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && pointerInfo.event) {
        downX = pointerInfo.event.clientX;
        downY = pointerInfo.event.clientY;
      }

      if (pointerInfo.type === PointerEventTypes.POINTERUP && pointerInfo.event) {
        // Only treat as click/tap if pointer didn't drag/move significantly (< 6px)
        const dx = pointerInfo.event.clientX - downX;
        const dy = pointerInfo.event.clientY - downY;
        if (Math.hypot(dx, dy) > 6) return;

        // Ignore right clicks or middle clicks (camera orbit/pan)
        if (pointerInfo.event.button !== 0) return;

        const pickedMesh = pointerInfo.pickInfo?.pickedMesh;
        if (pickedMesh && pickedMesh.metadata?.boxId) {
          const targetBox = this.projectStore.project().boxes.find(b => b.id === pickedMesh.metadata.boxId);
          if (targetBox && !targetBox.locked) {
            this.zone.run(() => {
              this.projectStore.setSelectedBoxId(targetBox.id);
            });
          }
        } else {
          // Check if user clicked on a gizmo axis/handle
          const isGizmo = pickedMesh?.name?.toLowerCase().includes('gizmo') ||
                          pickedMesh?.name?.toLowerCase().includes('axis');
          if (!isGizmo && this.projectStore.selectedBoxId() !== null) {
            this.zone.run(() => {
              this.projectStore.setSelectedBoxId(null);
            });
          }
        }
      }
    });
  }

  /**
   * Synchronizes 3D meshes with the project boxes.
   */
  public updateBoxes(boxes: Box[], selectedBoxId: string | null): void {
    if (!this.scene) return;

    const currentBoxIds = new Set(boxes.map(b => b.id));

    // Remove obsolete meshes
    for (const [id, mesh] of this.boxMeshes.entries()) {
      if (!currentBoxIds.has(id)) {
        mesh.dispose();
        this.boxMeshes.delete(id);
      }
    }

    // Create or update meshes
    for (const box of boxes) {
      this.updateSingleBoxMesh(box, box.id === selectedBoxId);
    }

    this.updateGizmoState();
  }

  private updateSingleBoxMesh(box: Box, isSelected: boolean): void {
    if (!this.scene) return;

    let mesh = this.boxMeshes.get(box.id);

    const width = Math.max(0.001, box.maxX - box.minX);
    const height = Math.max(0.001, box.maxY - box.minY);
    const depth = Math.max(0.001, box.maxZ - box.minZ);

    const centerX = (box.minX + box.maxX) / 2;
    const centerY = (box.minY + box.maxY) / 2;
    const centerZ = (box.minZ + box.maxZ) / 2;

    if (mesh && !mesh.metadata?.isNodeBoxWrap) {
      mesh.dispose();
      mesh = undefined;
      this.boxMeshes.delete(box.id);
    }

    if (!mesh) {
      mesh = MeshBuilder.CreateBox(`box_${box.id}`, { width: 1, height: 1, depth: 1, wrap: true, updatable: true }, this.scene);
      mesh.metadata = { boxId: box.id, isNodeBoxWrap: true };
      this.boxMeshes.set(box.id, mesh);
    }

    // Position and scale strictly without diagonal rotation
    mesh.position.set(centerX, centerY, centerZ);
    mesh.scaling.set(width, height, depth);
    mesh.rotation.set(0, 0, 0);
    if (mesh.rotationQuaternion) {
      mesh.rotationQuaternion = null;
    }
    mesh.setEnabled(box.visible);
    mesh.isPickable = !this.projectStore.isRenderMode() && !box.locked && box.visible;

    // Apply Node-Projected UVs (Luanti engine single-mesh projection practice)
    const uvs = computeNodeBoxUVBuffer(box);
    mesh.setVerticesData(VertexBuffer.UVKind, uvs, true);

    // Apply Material
    this.applyBoxMaterial(mesh, box, isSelected);

    // Selection outline / highlight (disabled in Render Mode)
    mesh.renderOutline = !this.projectStore.isRenderMode() && isSelected;
    mesh.outlineColor = box.locked ? new Color3(0.95, 0.6, 0.1) : new Color3(0.9, 0.7, 0.1);
    mesh.outlineWidth = 0.02;
  }

  private applyBoxMaterial(mesh: Mesh, box: Box, isSelected: boolean): void {
    if (!this.scene) return;

    if (this.viewportMode() === 'wireframe') {
      const mat = this.getOrCreateWireframeMaterial();
      mesh.material = mat;
      return;
    }

    if (this.viewportMode() === 'colored') {
      const mat = this.getOrCreateSolidMaterial(box.color);
      mesh.material = mat;
      return;
    }

    // Textured mode: Luanti 6-face multi-material
    // In Babylon CreateBox with SubMeshes:
    // Face 0 = Back (+Z), Face 1 = Front (-Z), Face 2 = Right (+X), Face 3 = Left (-X), Face 4 = Top (+Y), Face 5 = Bottom (-Y)
    const project = this.projectStore.project();
    const globalTextures = project.globalTextures;

    const topTex = globalTextures.top || 'default_wood.png';
    const botTex = globalTextures.bottom || 'default_wood.png';
    const rightTex = globalTextures.right || 'default_wood.png';
    const leftTex = globalTextures.left || 'default_wood.png';
    const backTex = globalTextures.back || 'default_wood.png';
    const frontTex = globalTextures.front || 'default_wood.png';

    const depthConfig = this.pixelDepth();
    const depthKey = depthConfig.enabled
      ? `_d_${depthConfig.pixelBevel ? 1 : 0}${depthConfig.luminanceRelief ? 1 : 0}${depthConfig.parallax ? 1 : 0}_${depthConfig.intensity}`
      : '_d_off';
    const multiMatKey = `multi_${backTex}_${frontTex}_${rightTex}_${leftTex}_${topTex}_${botTex}${depthKey}`;
    let multiMat = this.scene.getMaterialByName(multiMatKey) as MultiMaterial;

    if (!multiMat) {
      multiMat = new MultiMaterial(multiMatKey, this.scene);
    }

    multiMat.subMaterials = [
      this.getOrCreateTextureMaterial(backTex),
      this.getOrCreateTextureMaterial(frontTex),
      this.getOrCreateTextureMaterial(rightTex),
      this.getOrCreateTextureMaterial(leftTex),
      this.getOrCreateTextureMaterial(topTex),
      this.getOrCreateTextureMaterial(botTex)
    ];

    mesh.material = multiMat;

    if (!mesh.subMeshes || mesh.subMeshes.length !== 6) {
      mesh.subMeshes = [];
      const totalVertices = 24;
      for (let i = 0; i < 6; i++) {
        new SubMesh(i, 0, totalVertices, i * 6, 6, mesh);
      }
    }
  }

  private getOrCreateTextureMaterial(textureId: string): StandardMaterial {
    const depthConfig = this.pixelDepth();
    const depthKey = depthConfig.enabled
      ? `_d_${depthConfig.pixelBevel ? 1 : 0}${depthConfig.luminanceRelief ? 1 : 0}${depthConfig.parallax ? 1 : 0}_${depthConfig.intensity}`
      : '_d_off';
    const matKey = `mat_tex_${textureId}${depthKey}`;
    let mat = this.materialCache.get(matKey);

    const texDef = this.textureService.getTextureById(textureId) || this.textureService.getOrCreateProceduralFallback(textureId);

    if (mat && this.scene?.materials.includes(mat)) {
      if (texDef && mat.metadata?.dataUrl === texDef.dataUrl) {
        return mat;
      }
      mat.dispose();
      this.materialCache.delete(matKey);
      mat = undefined;
    }

    if (!mat) {
      mat = new StandardMaterial(matKey, this.scene!);
      mat.metadata = { dataUrl: texDef?.dataUrl };
      mat.specularColor = depthConfig.enabled ? new Color3(0.35, 0.35, 0.35) : new Color3(0.05, 0.05, 0.05);
      mat.specularPower = depthConfig.enabled ? 24 : 64;
      mat.invertNormalMapY = false;
      mat.backFaceCulling = texDef?.backfaceCulling ?? false;

      if (texDef) {
        let tex = this.textureCache.get(texDef.id);
        if (tex && (!this.scene?.textures.includes(tex) || tex.metadata?.dataUrl !== texDef.dataUrl)) {
          tex.dispose();
          this.textureCache.delete(texDef.id);
          this.animatedTextures.delete(texDef.id);
          tex = undefined;
        }
        if (!tex) {
          tex = new Texture(texDef.dataUrl, this.scene!, true, false, Texture.NEAREST_SAMPLINGMODE);
          tex.metadata = { dataUrl: texDef.dataUrl };
          tex.hasAlpha = true;
          tex.wrapU = Texture.WRAP_ADDRESSMODE;
          tex.wrapV = Texture.WRAP_ADDRESSMODE;
          this.textureCache.set(texDef.id, tex);
        }
        mat.diffuseTexture = tex;
        mat.useAlphaFromDiffuseTexture = true;
        mat.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
        mat.alphaCutOff = 0.5;

        // Setup Luanti animated vertical texture sheet
        if (texDef.animation && texDef.animation.type === 'vertical_frames') {
          const anim = texDef.animation;
          const setupAnimation = (t: Texture) => {
            const size = t.getSize();
            const frameHeight = anim.aspect_h || 16;
            const computedFrames = Math.max(1, Math.floor((size.height || 16) / frameHeight));
            const frameCount = anim.frameCount || computedFrames;
            t.vScale = 1.0 / frameCount;
            t.vOffset = 0;
            this.animatedTextures.set(texDef.id, {
              texture: t,
              frameCount,
              length: anim.length || 1.0,
              lastFrameIndex: 0
            });
          };

          if (tex.isReady()) {
            setupAnimation(tex);
          } else {
            tex.onLoadObservable.addOnce(() => setupAnimation(tex!));
          }
        }

        if (textureId === 'default_glass.png') {
          mat.opacityTexture = tex;
          mat.alpha = 0.8;
          mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
        }

        if (depthConfig.enabled) {
          const bumpKey = `bump_${texDef.id}${depthKey}`;
          let bumpTex = this.textureCache.get(bumpKey);

          const applyBumpConfig = (bTex: Texture) => {
            bTex.wrapU = Texture.WRAP_ADDRESSMODE;
            bTex.wrapV = Texture.WRAP_ADDRESSMODE;
            const animEntry = this.animatedTextures.get(texDef.id);
            if (animEntry) {
              animEntry.normalTexture = bTex;
              bTex.vScale = 1.0 / animEntry.frameCount;
              bTex.vOffset = animEntry.texture.vOffset;
            }
            mat!.bumpTexture = bTex;
            mat!.bumpTexture.level = getDepthIntensityMultiplier(depthConfig.intensity);
            mat!.useParallax = depthConfig.parallax;
            mat!.useParallaxOcclusion = depthConfig.parallax;
            mat!.parallaxScaleBias = 0.035;
          };

          if (!bumpTex || !this.scene?.textures.includes(bumpTex)) {
            this.textureService.getOrCreateNormalMap(textureId, depthConfig).then(normalUrl => {
              if (this.scene && !this.scene.isDisposed && mat && this.scene.materials.includes(mat)) {
                const loadedBump = new Texture(normalUrl, this.scene, true, false, Texture.BILINEAR_SAMPLINGMODE);
                loadedBump.metadata = { dataUrl: normalUrl };
                this.textureCache.set(bumpKey, loadedBump);
                applyBumpConfig(loadedBump);
              }
            });
          } else {
            applyBumpConfig(bumpTex);
          }
        }
      } else {
        mat.diffuseColor = new Color3(0.6, 0.5, 0.4);
      }

      this.materialCache.set(matKey, mat);
    }

    return mat;
  }

  private updateAnimatedTextures(): void {
    if (this.animatedTextures.size === 0) return;
    const now = performance.now() / 1000;
    for (const entry of this.animatedTextures.values()) {
      const length = entry.length || 1.0;
      const progress = (now % length) / length;
      const frameIndex = Math.floor(progress * entry.frameCount);
      if (frameIndex !== entry.lastFrameIndex) {
        entry.lastFrameIndex = frameIndex;
        const offset = frameIndex / entry.frameCount;
        entry.texture.vOffset = offset;
        if (entry.normalTexture) {
          entry.normalTexture.vOffset = offset;
        }
      }
    }
  }

  private getOrCreateSolidMaterial(colorHex: string): StandardMaterial {
    const matKey = `mat_color_${colorHex}`;
    let mat = this.materialCache.get(matKey);
    if (mat) return mat;

    mat = new StandardMaterial(matKey, this.scene!);
    mat.diffuseColor = Color3.FromHexString(colorHex);
    mat.specularColor = new Color3(0.1, 0.1, 0.1);
    this.materialCache.set(matKey, mat);
    return mat;
  }

  private getOrCreateWireframeMaterial(): StandardMaterial {
    const matKey = 'mat_wireframe';
    let mat = this.materialCache.get(matKey);
    if (mat) return mat;

    mat = new StandardMaterial(matKey, this.scene!);
    mat.wireframe = true;
    mat.diffuseColor = new Color3(0.2, 0.8, 1.0);
    this.materialCache.set(matKey, mat);
    return mat;
  }

  // Camera presets
  public setCameraPreset(preset: CameraPreset): void {
    if (!this.camera) return;

    const height = this.projectStore.project()?.nodeHeight ?? 1;
    const centerY = (height - 1) * 0.5;
    this.camera.target = new Vector3(0, centerY, 0);
    switch (preset) {
      case 'iso':
        this.camera.alpha = -Math.PI / 4;
        this.camera.beta = Math.PI / 3;
        break;
      case 'top':
        this.camera.alpha = 0;
        this.camera.beta = 0.001;
        break;
      case 'bottom':
        this.camera.alpha = 0;
        this.camera.beta = Math.PI - 0.001;
        break;
      case 'front':
        this.camera.alpha = -Math.PI / 2;
        this.camera.beta = Math.PI / 2;
        break;
      case 'back':
        this.camera.alpha = Math.PI / 2;
        this.camera.beta = Math.PI / 2;
        break;
      case 'right':
        this.camera.alpha = 0;
        this.camera.beta = Math.PI / 2;
        break;
      case 'left':
        this.camera.alpha = Math.PI;
        this.camera.beta = Math.PI / 2;
        break;
    }
  }

  // Camera Projection Mode (Perspective <-> Orthographic)
  public toggleCameraMode(): CameraMode {
    const next = this.cameraMode() === 'perspective' ? 'orthographic' : 'perspective';
    this.setCameraMode(next);
    return next;
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode.set(mode);
    if (!this.camera || !this.engine) return;

    if (mode === 'orthographic') {
      this.camera.mode = ArcRotateCamera.ORTHOGRAPHIC_CAMERA;
      this.updateOrthoFrustum();
    } else {
      this.camera.mode = ArcRotateCamera.PERSPECTIVE_CAMERA;
      this.camera.orthoLeft = null;
      this.camera.orthoRight = null;
      this.camera.orthoTop = null;
      this.camera.orthoBottom = null;
    }
  }

  public updateOrthoFrustum(): void {
    if (!this.camera || !this.engine || this.camera.mode !== ArcRotateCamera.ORTHOGRAPHIC_CAMERA) return;
    const width = this.engine.getRenderWidth();
    const height = this.engine.getRenderHeight();
    if (height === 0) return;
    const aspect = width / height;

    this.camera.orthoLeft = -this.orthoZoom * aspect;
    this.camera.orthoRight = this.orthoZoom * aspect;
    this.camera.orthoTop = this.orthoZoom;
    this.camera.orthoBottom = -this.orthoZoom;
  }

  public toggleOrthographic(): boolean {
    const mode = this.toggleCameraMode();
    return mode === 'orthographic';
  }

  private onCanvasWheel = (event: WheelEvent): void => {
    if (this.camera && this.camera.mode === ArcRotateCamera.ORTHOGRAPHIC_CAMERA) {
      event.preventDefault();
      const zoomFactor = event.deltaY > 0 ? 1.1 : 0.909;
      this.orthoZoom = Math.max(0.1, Math.min(20, this.orthoZoom * zoomFactor));
      this.updateOrthoFrustum();
    }
  };

  // Scene Floor Platform
  private buildFloorPlatform(): void {
    if (!this.scene) return;
    this.floorMesh = MeshBuilder.CreateGround('SceneFloor', { width: 16, height: 16, subdivisions: 1 }, this.scene);
    this.floorMesh.position.y = -0.501; // Slightly below nodebox bottom (-0.5) to avoid z-fighting
    this.floorMesh.isPickable = false;
    this.floorMaterial = new StandardMaterial('SceneFloorMat', this.scene);
    this.floorMaterial.specularColor = new Color3(0, 0, 0);
    this.floorMaterial.roughness = 1.0;
    this.floorMesh.material = this.floorMaterial;
    this.updateFloorMaterial();
  }

  public setSceneFloor(floor: SceneFloor): void {
    this.sceneFloor.set(floor);
    this.updateFloorMaterial();
  }

  private updateFloorMaterial(): void {
    if (!this.floorMesh || !this.floorMaterial || !this.scene) return;
    const floor = this.sceneFloor();

    if (floor === 'none') {
      this.floorMesh.setEnabled(false);
      return;
    }

    this.floorMesh.setEnabled(true);

    if (floor === 'grass') {
      let grassTex = this.textureCache.get('__floor_grass');
      if (!grassTex) {
        grassTex = new Texture('/textures/default_grass.png', this.scene, false, false, Texture.NEAREST_SAMPLINGMODE);
        grassTex.uScale = 16;
        grassTex.vScale = 16;
        grassTex.wrapU = Texture.WRAP_ADDRESSMODE;
        grassTex.wrapV = Texture.WRAP_ADDRESSMODE;
        this.textureCache.set('__floor_grass', grassTex);
      }
      this.floorMaterial.diffuseTexture = grassTex;
      this.floorMaterial.diffuseColor = new Color3(1, 1, 1);
    } else if (floor === 'stone') {
      let stoneTex = this.textureCache.get('__floor_stone');
      if (!stoneTex) {
        stoneTex = new Texture('/textures/default_stone.png', this.scene, false, false, Texture.NEAREST_SAMPLINGMODE);
        stoneTex.uScale = 16;
        stoneTex.vScale = 16;
        stoneTex.wrapU = Texture.WRAP_ADDRESSMODE;
        stoneTex.wrapV = Texture.WRAP_ADDRESSMODE;
        this.textureCache.set('__floor_stone', stoneTex);
      }
      this.floorMaterial.diffuseTexture = stoneTex;
      this.floorMaterial.diffuseColor = new Color3(1, 1, 1);
    } else if (floor === 'grid') {
      this.floorMaterial.diffuseTexture = null;
      this.floorMaterial.diffuseColor = new Color3(0.08, 0.12, 0.2);
    }
  }

  // Scene Sky & Environment Presets
  public setSceneSky(sky: SceneSky): void {
    this.sceneSky.set(sky);
    this.applySkySettings(sky);
  }

  private applySkySettings(sky: SceneSky): void {
    if (!this.scene) return;

    switch (sky) {
      case 'studio': {
        const isDark = this.themeService.theme() === 'dark';
        this.scene.clearColor = isDark
          ? new Color4(0.06, 0.09, 0.16, 1.0) // Slate 950
          : new Color4(0.96, 0.97, 0.98, 1.0); // Slate 50/100
        if (this.hemiLight) {
          this.hemiLight.intensity = isDark ? 0.45 : 0.55;
          this.hemiLight.diffuse = isDark ? new Color3(1, 1, 1) : new Color3(1, 0.99, 0.96);
          this.hemiLight.groundColor = isDark ? new Color3(0.3, 0.35, 0.4) : new Color3(0.7, 0.72, 0.75);
        }
        if (this.dirLight) {
          this.dirLight.intensity = isDark ? 0.95 : 1.0;
          this.dirLight.direction = new Vector3(-1.2, -2.0, -1.0);
          this.dirLight.diffuse = isDark ? new Color3(1, 1, 1) : new Color3(1, 0.98, 0.94);
        }
        break;
      }

      case 'minetest_day':
        this.scene.clearColor = new Color4(0.55, 0.72, 1.0, 1.0); // #8cb8ff Minetest daylight sky
        if (this.hemiLight) {
          this.hemiLight.intensity = 0.55;
          this.hemiLight.diffuse = new Color3(0.95, 0.98, 1.0);
          this.hemiLight.groundColor = new Color3(0.28, 0.38, 0.25);
        }
        if (this.dirLight) {
          this.dirLight.intensity = 1.05;
          this.dirLight.direction = new Vector3(-1.2, -2.5, -0.8);
          this.dirLight.diffuse = new Color3(1.0, 0.98, 0.92);
        }
        break;

      case 'minetest_sunset':
        this.scene.clearColor = new Color4(0.85, 0.47, 0.34, 1.0); // #d97757 Minetest sunset sky
        if (this.hemiLight) {
          this.hemiLight.intensity = 0.45;
          this.hemiLight.diffuse = new Color3(0.95, 0.65, 0.45);
          this.hemiLight.groundColor = new Color3(0.25, 0.18, 0.2);
        }
        if (this.dirLight) {
          this.dirLight.intensity = 1.1;
          this.dirLight.direction = new Vector3(-2.2, -0.7, -0.6);
          this.dirLight.diffuse = new Color3(1.0, 0.55, 0.28);
        }
        break;

      case 'minetest_night':
        this.scene.clearColor = new Color4(0.035, 0.055, 0.1, 1.0); // #090e1a Minetest midnight sky
        if (this.hemiLight) {
          this.hemiLight.intensity = 0.25;
          this.hemiLight.diffuse = new Color3(0.3, 0.4, 0.65);
          this.hemiLight.groundColor = new Color3(0.06, 0.08, 0.14);
        }
        if (this.dirLight) {
          this.dirLight.intensity = 0.6;
          this.dirLight.direction = new Vector3(-1.2, -2.0, -1.0);
          this.dirLight.diffuse = new Color3(0.45, 0.6, 0.9);
        }
        break;
    }
  }

  // Turntable Auto-Rotate Behavior
  public toggleTurntable(enabled?: boolean): boolean {
    const next = enabled !== undefined ? enabled : !this.isTurntableActive();
    this.isTurntableActive.set(next);
    if (this.camera) {
      this.camera.useAutoRotationBehavior = next;
      if (next && this.camera.autoRotationBehavior) {
        this.camera.autoRotationBehavior.idleRotationWaitTime = 0;
        this.camera.autoRotationBehavior.idleRotationSpeed = 0.15;
      }
    }
    return next;
  }

  // High-Resolution Screenshot Studio
  public async captureScreenshot(options?: {
    resolution?: ScreenshotResolution;
    transparent?: boolean;
  }): Promise<void> {
    if (!this.engine || !this.scene || !this.camera) return;

    const resolution = options?.resolution ?? '1080p';
    const transparent = options?.transparent ?? false;

    let size: { width: number; height: number } | { precision: number };
    switch (resolution) {
      case 'viewport':
        size = { precision: 2 };
        break;
      case '1080p':
        size = { width: 1920, height: 1080 };
        break;
      case '4k':
        size = { width: 3840, height: 2160 };
        break;
      case 'icon':
        size = { width: 512, height: 512 };
        break;
    }

    const prevClearColor = this.scene.clearColor.clone();
    const wasCage = this.cageMesh?.isEnabled() ?? false;
    const wasGrid = this.gridMesh?.isEnabled() ?? false;
    const wasFloor = this.floorMesh?.isEnabled() ?? false;

    if (transparent) {
      this.scene.clearColor = new Color4(0, 0, 0, 0);
      this.cageMesh?.setEnabled(false);
      this.gridMesh?.setEnabled(false);
      this.floorMesh?.setEnabled(false);
    }

    const prevGizmo = this.gizmoMode();
    if (prevGizmo !== 'none') {
      this.setGizmoMode('none');
    }

    return new Promise<void>((resolve) => {
      Tools.CreateScreenshot(
        this.engine!,
        this.camera!,
        size,
        (data: string) => {
          if (transparent) {
            this.scene!.clearColor = prevClearColor;
            this.cageMesh?.setEnabled(wasCage);
            this.gridMesh?.setEnabled(wasGrid);
            this.floorMesh?.setEnabled(wasFloor);
          }
          if (prevGizmo !== 'none') {
            this.setGizmoMode(prevGizmo);
          }

          const nodeName = this.projectStore.project().nodeName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'nodebox';
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const filename = `${nodeName}_${resolution}${transparent ? '_transparent' : ''}_${timestamp}.png`;

          const a = document.createElement('a');
          a.href = data;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          resolve();
        },
        'image/png'
      );
    });
  }

  public onRenderModeChange(isRenderMode: boolean): void {
    if (isRenderMode) {
      if (this.cageMesh) this.cageMesh.setEnabled(false);
      if (this.gridMesh) this.gridMesh.setEnabled(false);
      if (this.gizmoManager) {
        this.gizmoManager.positionGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = false;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.boundingBoxGizmoEnabled = false;
        this.gizmoManager.attachToMesh(null);
      }
      this.hideFaceHighlight();
      this.zone.run(() => this.activeFace.set(null));

      for (const mesh of this.boxMeshes.values()) {
        mesh.isPickable = false;
        mesh.renderOutline = false;
      }
    } else {
      if (this.cageMesh) this.cageMesh.setEnabled(this.showCage());
      if (this.gridMesh) this.gridMesh.setEnabled(this.showGrid());

      const selectedId = this.projectStore.selectedBoxId();
      for (const [id, mesh] of this.boxMeshes.entries()) {
        const box = this.projectStore.project().boxes.find(b => b.id === id);
        if (box) {
          mesh.isPickable = !box.locked && box.visible;
          mesh.renderOutline = (id === selectedId);
        }
      }
      this.updateGizmoState();
    }
  }

  public toggleCage(show?: boolean): void {
    const next = show !== undefined ? show : !this.showCage();
    this.showCage.set(next);
    if (this.cageMesh) this.cageMesh.setEnabled(!this.projectStore.isRenderMode() && next);
  }

  public toggleGrid(show?: boolean): void {
    const next = show !== undefined ? show : !this.showGrid();
    this.showGrid.set(next);
    if (this.gridMesh) this.gridMesh.setEnabled(!this.projectStore.isRenderMode() && next);
  }

  public setGizmoMode(mode: GizmoMode): void {
    this.gizmoMode.set(mode);
    this.hideFaceHighlight();
    this.zone.run(() => this.activeFace.set(null));
    this.updateGizmoState();
  }

  public setViewportMode(mode: ViewportMode): void {
    this.viewportMode.set(mode);
    this.updateBoxes(this.projectStore.boxes(), this.projectStore.selectedBoxId());
  }

  public resetCamera(): void {
    if (!this.camera) return;
    const height = this.projectStore.project()?.nodeHeight ?? 1;
    const centerY = (height - 1) * 0.5;
    this.camera.target = new Vector3(0, centerY, 0);
    this.camera.radius = height > 1 ? 3.2 : 2.5;
    this.camera.alpha = -Math.PI / 4;
    this.camera.beta = Math.PI / 3;
    this.orthoZoom = 1.2;
    if (this.camera.mode === ArcRotateCamera.ORTHOGRAPHIC_CAMERA) {
      this.updateOrthoFrustum();
    }
  }

  public destroy(): void {
    if (this.resizeRafId !== null) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.triggerSmoothResize);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    this.canvas?.removeEventListener('wheel', this.onCanvasWheel);
    this.canvas = null;
    this.gizmoManager?.dispose();
    this.gizmoManager = null;
    this.hideFaceHighlight();
    this.faceHighlightMesh?.dispose();
    this.faceHighlightMesh = null;
    this.floorMesh?.dispose();
    this.floorMesh = null;
    this.floorMaterial?.dispose();
    this.floorMaterial = null;
    this.hemiLight = null;
    this.dirLight = null;
    this.boxMeshes.clear();
    for (const mat of this.materialCache.values()) {
      mat.dispose();
    }
    this.materialCache.clear();
    for (const tex of this.textureCache.values()) {
      tex.dispose();
    }
    this.textureCache.clear();
    this.animatedTextures.clear();
    this.cageMesh = null;
    this.gridMesh = null;
    this.scene?.dispose();
    this.engine?.dispose();
    this.scene = null;
    this.engine = null;
    this.camera = null;
  }
}
