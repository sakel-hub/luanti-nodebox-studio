import { Injectable, NgZone, inject } from '@angular/core';
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
  MultiMaterial,
  SubMesh,
  GizmoManager,
  PointerEventTypes
} from '@babylonjs/core';
import { Box, FaceDirection, LUANTI_FACE_DIRECTIONS } from '../../../core/models/nodebox.model';
import { ProjectStore } from '../../../core/state/project.store';
import { TextureService } from '../../../core/services/texture.service';

export type CameraPreset = 'iso' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';
export type ViewportMode = 'textured' | 'colored' | 'wireframe';
export type GizmoMode = 'none' | 'position' | 'scale' | 'rotation';

@Injectable({
  providedIn: 'root'
})
export class BabylonSceneService {
  private zone = inject(NgZone);
  private projectStore = inject(ProjectStore);
  private textureService = inject(TextureService);

  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private camera: ArcRotateCamera | null = null;
  private gizmoManager: GizmoManager | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private boxMeshes = new Map<string, Mesh>();
  private cageMesh: LinesMesh | null = null;
  private gridMesh: Mesh | null = null;
  private materialCache = new Map<string, StandardMaterial>();
  private textureCache = new Map<string, Texture>();

  private dragInitialBox: Box | null = null;
  private dragInitialPos: Vector3 = new Vector3();
  private dragInitialScale: Vector3 = new Vector3();

  public viewportMode: ViewportMode = 'textured';
  public gizmoMode: GizmoMode = 'position';
  public showCage = true;
  public showGrid = true;

  public initialize(canvas: HTMLCanvasElement): void {
    this.zone.runOutsideAngular(() => {
      // 4th parameter adaptToDeviceRatio=true fixes Retina/HighDPI pointer offset
      this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true);
      this.scene = new Scene(this.engine);
      this.scene.clearColor = new Color4(0.06, 0.09, 0.16, 1.0); // Deep slate background

      // Setup Camera
      this.camera = new ArcRotateCamera(
        'MainCamera',
        -Math.PI / 4,
        Math.PI / 3,
        2.5,
        new Vector3(0, 0, 0),
        this.scene
      );
      this.camera.lowerRadiusLimit = 0.5;
      this.camera.upperRadiusLimit = 10.0;
      this.camera.wheelPrecision = 40;
      this.camera.attachControl(canvas, true);

      // Setup Lights
      const hemiLight = new HemisphericLight('HemiLight', new Vector3(0, 1, 0), this.scene);
      hemiLight.intensity = 0.8;
      hemiLight.diffuse = new Color3(1, 1, 1);
      hemiLight.groundColor = new Color3(0.3, 0.35, 0.4);

      const dirLight = new DirectionalLight('DirLight', new Vector3(-1, -2, -1), this.scene);
      dirLight.position = new Vector3(2, 4, 2);
      dirLight.intensity = 0.5;

      // Setup Helpers (1x1x1 Node cage & 16x16 Grid)
      this.buildNodeCage();
      this.buildReferenceGrid();

      // Setup Gizmo Manager
      this.setupGizmoManager();

      // Setup Pointer Picking
      this.setupPointerPicking();

      // Render Loop
      this.engine.runRenderLoop(() => {
        if (this.scene && this.scene.activeCamera) {
          this.scene.render();
        }
      });

      // Continuous Resize Observer guarantees accurate canvas dimensions and pointer raycasting
      this.resizeObserver = new ResizeObserver(() => {
        this.engine?.resize();
      });
      this.resizeObserver.observe(canvas);

      window.addEventListener('resize', this.onResize);
    });
  }

  private onResize = (): void => {
    this.engine?.resize();
  };

  /**
   * Builds the 1x1x1 reference bounding box showing standard Luanti node borders [-0.5, 0.5]
   */
  private buildNodeCage(): void {
    if (!this.scene) return;

    const min = -0.5;
    const max = 0.5;

    const corners = [
      new Vector3(min, min, min),
      new Vector3(max, min, min),
      new Vector3(max, min, max),
      new Vector3(min, min, max),
      new Vector3(min, max, min),
      new Vector3(max, max, min),
      new Vector3(max, max, max),
      new Vector3(min, max, max)
    ];

    const lines = [
      // Bottom square
      [corners[0], corners[1], corners[2], corners[3], corners[0]],
      // Top square
      [corners[4], corners[5], corners[6], corners[7], corners[4]],
      // Verticals
      [corners[0], corners[4]],
      [corners[1], corners[5]],
      [corners[2], corners[6]],
      [corners[3], corners[7]]
    ];

    this.cageMesh = MeshBuilder.CreateLineSystem('NodeCage', { lines }, this.scene);
    this.cageMesh.color = new Color3(0.3, 0.6, 0.9);
    this.cageMesh.alpha = 0.5;
    this.cageMesh.isPickable = false;
  }

  /**
   * Builds a 16x16 subdivided floor grid at y = -0.5
   */
  private buildReferenceGrid(): void {
    if (!this.scene) return;

    const gridLines: Vector3[][] = [];
    const step = 1 / 16;
    const min = -0.5;
    const max = 0.5;
    const y = -0.5;

    for (let i = 0; i <= 16; i++) {
      const coord = min + i * step;
      // Along X (constant Z)
      gridLines.push([new Vector3(min, y, coord), new Vector3(max, y, coord)]);
      // Along Z (constant X)
      gridLines.push([new Vector3(coord, y, min), new Vector3(coord, y, max)]);
    }

    const grid = MeshBuilder.CreateLineSystem('GridFloor', { lines: gridLines }, this.scene);
    grid.color = new Color3(0.2, 0.25, 0.35);
    grid.alpha = 0.6;
    grid.isPickable = false;
    this.gridMesh = grid;
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

      posGizmo.xGizmo.dragBehavior.onDragStartObservable.add(handlePosDragStart);
      posGizmo.yGizmo.dragBehavior.onDragStartObservable.add(handlePosDragStart);
      posGizmo.zGizmo.dragBehavior.onDragStartObservable.add(handlePosDragStart);

      posGizmo.xGizmo.dragBehavior.onDragEndObservable.add(handlePosDragEnd);
      posGizmo.yGizmo.dragBehavior.onDragEndObservable.add(handlePosDragEnd);
      posGizmo.zGizmo.dragBehavior.onDragEndObservable.add(handlePosDragEnd);
    }

    // 2. Scale Gizmo (3 clean axes, no diagonal rotation clutter)
    const scaleGizmo = this.gizmoManager.gizmos.scaleGizmo;
    if (scaleGizmo) {
      scaleGizmo.scaleRatio = 1.1;
      if (scaleGizmo.uniformScaleGizmo) {
        scaleGizmo.uniformScaleGizmo.isEnabled = false;
      }

      const handleScaleDragStart = () => {
        const selectedId = this.projectStore.selectedBoxId();
        const box = selectedId ? this.projectStore.project().boxes.find(b => b.id === selectedId) : null;
        const mesh = selectedId ? this.boxMeshes.get(selectedId) : null;
        if (box && mesh) {
          this.dragInitialBox = { ...box };
          this.dragInitialScale.copyFrom(mesh.scaling);
        }
      };

      const handleScaleDragEnd = () => {
        this.onScaleGizmoDragEnd();
      };

      scaleGizmo.xGizmo.dragBehavior.onDragStartObservable.add(handleScaleDragStart);
      scaleGizmo.yGizmo.dragBehavior.onDragStartObservable.add(handleScaleDragStart);
      scaleGizmo.zGizmo.dragBehavior.onDragStartObservable.add(handleScaleDragStart);

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

    this.updateGizmoState();
  }

  public updateGizmoState(): void {
    if (!this.gizmoManager) return;

    const selectedId = this.projectStore.selectedBoxId();
    const selectedMesh = selectedId ? this.boxMeshes.get(selectedId) : null;

    this.gizmoManager.positionGizmoEnabled = this.gizmoMode === 'position' && !!selectedMesh;
    this.gizmoManager.scaleGizmoEnabled = this.gizmoMode === 'scale' && !!selectedMesh;
    this.gizmoManager.rotationGizmoEnabled = this.gizmoMode === 'rotation' && !!selectedMesh;
    this.gizmoManager.boundingBoxGizmoEnabled = false;

    if (selectedMesh) {
      this.gizmoManager.attachToMesh(selectedMesh);

      // Configure snapping to current grid resolution
      const res = this.projectStore.project().snapResolution;
      if (this.gizmoManager.gizmos.positionGizmo) {
        this.gizmoManager.gizmos.positionGizmo.snapDistance = 1 / res;
      }
      if (this.gizmoManager.gizmos.scaleGizmo) {
        this.gizmoManager.gizmos.scaleGizmo.snapDistance = 1 / res;
      }
      if (this.gizmoManager.gizmos.rotationGizmo) {
        this.gizmoManager.gizmos.rotationGizmo.snapDistance = Math.PI / 2;
        this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
      }
    } else {
      this.gizmoManager.attachToMesh(null);
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
    if (!selectedId || !this.dragInitialBox) return;

    const mesh = this.boxMeshes.get(selectedId);
    if (!mesh) return;

    const res = this.projectStore.project().snapResolution;
    const snap = (v: number) => Math.round(v * res) / res;

    const init = this.dragInitialBox;
    const deltaScaleX = mesh.scaling.x - this.dragInitialScale.x;
    const deltaScaleY = mesh.scaling.y - this.dragInitialScale.y;
    const deltaScaleZ = mesh.scaling.z - this.dragInitialScale.z;

    const initWidth = init.maxX - init.minX;
    const initHeight = init.maxY - init.minY;
    const initDepth = init.maxZ - init.minZ;

    const newWidth = Math.max(1 / res, snap(initWidth + deltaScaleX));
    const newHeight = Math.max(1 / res, snap(initHeight + deltaScaleY));
    const newDepth = Math.max(1 / res, snap(initDepth + deltaScaleZ));

    const centerX = (init.minX + init.maxX) / 2;
    const centerY = (init.minY + init.maxY) / 2;
    const centerZ = (init.minZ + init.maxZ) / 2;

    let minX = snap(centerX - newWidth / 2);
    let maxX = snap(centerX + newWidth / 2);
    if (maxX <= minX) maxX = snap(minX + 1 / res);

    let minY = snap(centerY - newHeight / 2);
    let maxY = snap(centerY + newHeight / 2);
    if (maxY <= minY) maxY = snap(minY + 1 / res);

    let minZ = snap(centerZ - newDepth / 2);
    let maxZ = snap(centerZ + newDepth / 2);
    if (maxZ <= minZ) maxZ = snap(minZ + 1 / res);

    this.zone.run(() => {
      this.projectStore.updateBox(selectedId, {
        minX,
        maxX,
        minY,
        maxY,
        minZ,
        maxZ
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

    this.scene.onPointerObservable.add(pointerInfo => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && pointerInfo.pickInfo?.hit) {
        const pickedMesh = pointerInfo.pickInfo.pickedMesh;
        if (pickedMesh && pickedMesh.metadata?.boxId) {
          this.zone.run(() => {
            this.projectStore.setSelectedBoxId(pickedMesh.metadata.boxId);
          });
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

    if (!mesh) {
      mesh = MeshBuilder.CreateBox(`box_${box.id}`, { width: 1, height: 1, depth: 1 }, this.scene);
      mesh.metadata = { boxId: box.id };
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

    // Apply Material
    this.applyBoxMaterial(mesh, box, isSelected);

    // Selection outline / highlight
    mesh.renderOutline = isSelected;
    mesh.outlineColor = new Color3(0.9, 0.7, 0.1);
    mesh.outlineWidth = 0.02;
  }

  private applyBoxMaterial(mesh: Mesh, box: Box, isSelected: boolean): void {
    if (!this.scene) return;

    if (this.viewportMode === 'wireframe') {
      const mat = this.getOrCreateWireframeMaterial();
      mesh.material = mat;
      return;
    }

    if (this.viewportMode === 'colored') {
      const mat = this.getOrCreateSolidMaterial(box.color);
      mesh.material = mat;
      return;
    }

    // Textured mode: Luanti 6-face multi-material
    const project = this.projectStore.project();
    const globalTextures = project.globalTextures;

    const topTex = box.textures?.top || globalTextures.top;
    const botTex = box.textures?.bottom || globalTextures.bottom;
    const rightTex = box.textures?.right || globalTextures.right;
    const leftTex = box.textures?.left || globalTextures.left;
    const backTex = box.textures?.back || globalTextures.back;
    const frontTex = box.textures?.front || globalTextures.front;

    const multiMatKey = `multi_${topTex}_${botTex}_${rightTex}_${leftTex}_${backTex}_${frontTex}`;
    let multiMat = this.scene.getMaterialByName(multiMatKey) as MultiMaterial;

    if (!multiMat) {
      multiMat = new MultiMaterial(multiMatKey, this.scene);
      multiMat.subMaterials = [
        this.getOrCreateTextureMaterial(frontTex),
        this.getOrCreateTextureMaterial(backTex),
        this.getOrCreateTextureMaterial(rightTex),
        this.getOrCreateTextureMaterial(leftTex),
        this.getOrCreateTextureMaterial(topTex),
        this.getOrCreateTextureMaterial(botTex)
      ];
    }

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
    const matKey = `mat_tex_${textureId}`;
    let mat = this.materialCache.get(matKey);
    if (mat) return mat;

    mat = new StandardMaterial(matKey, this.scene!);
    mat.specularColor = new Color3(0.05, 0.05, 0.05);

    const texDef = this.textureService.getTextureById(textureId);
    if (texDef) {
      let tex = this.textureCache.get(texDef.id);
      if (!tex) {
        tex = new Texture(texDef.dataUrl, this.scene!, true, false, Texture.NEAREST_SAMPLINGMODE);
        this.textureCache.set(texDef.id, tex);
      }
      mat.diffuseTexture = tex;
      if (textureId === 'default_glass.png') {
        mat.opacityTexture = tex;
        mat.alpha = 0.8;
      }
    } else {
      mat.diffuseColor = new Color3(0.6, 0.5, 0.4);
    }

    this.materialCache.set(matKey, mat);
    return mat;
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

    this.camera.target = new Vector3(0, 0, 0);
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

  public toggleOrthographic(): boolean {
    if (!this.camera) return false;
    const isOrtho = this.camera.mode === ArcRotateCamera.ORTHOGRAPHIC_CAMERA;
    if (isOrtho) {
      this.camera.mode = ArcRotateCamera.PERSPECTIVE_CAMERA;
      return false;
    } else {
      this.camera.mode = ArcRotateCamera.ORTHOGRAPHIC_CAMERA;
      const zoom = 1.2;
      this.camera.orthoLeft = -zoom;
      this.camera.orthoRight = zoom;
      this.camera.orthoTop = zoom;
      this.camera.orthoBottom = -zoom;
      return true;
    }
  }

  public toggleCage(show?: boolean): void {
    this.showCage = show !== undefined ? show : !this.showCage;
    if (this.cageMesh) this.cageMesh.setEnabled(this.showCage);
  }

  public toggleGrid(show?: boolean): void {
    this.showGrid = show !== undefined ? show : !this.showGrid;
    if (this.gridMesh) this.gridMesh.setEnabled(this.showGrid);
  }

  public setGizmoMode(mode: GizmoMode): void {
    this.gizmoMode = mode;
    this.updateGizmoState();
  }

  public setViewportMode(mode: ViewportMode): void {
    this.viewportMode = mode;
    this.updateBoxes(this.projectStore.boxes(), this.projectStore.selectedBoxId());
  }

  public resetCamera(): void {
    if (!this.camera) return;
    this.camera.target = new Vector3(0, 0, 0);
    this.camera.radius = 2.5;
    this.camera.alpha = -Math.PI / 4;
    this.camera.beta = Math.PI / 3;
    if (this.camera.mode === ArcRotateCamera.ORTHOGRAPHIC_CAMERA) {
      this.camera.mode = ArcRotateCamera.PERSPECTIVE_CAMERA;
    }
  }

  public destroy(): void {
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onResize);
    this.scene?.dispose();
    this.engine?.dispose();
    this.scene = null;
    this.engine = null;
    this.camera = null;
  }
}
