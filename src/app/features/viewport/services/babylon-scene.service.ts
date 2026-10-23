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
export type GizmoMode = 'none' | 'position' | 'scale';

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

  private boxMeshes = new Map<string, Mesh>();
  private cageMesh: LinesMesh | null = null;
  private gridMesh: Mesh | null = null;
  private materialCache = new Map<string, StandardMaterial>();
  private textureCache = new Map<string, Texture>();
  private dragInitialBox: Box | null = null;
  private dragInitialPos: Vector3 = new Vector3();

  public viewportMode: ViewportMode = 'textured';
  public gizmoMode: GizmoMode = 'position';
  public showCage = true;
  public showGrid = true;

  public initialize(canvas: HTMLCanvasElement): void {
    this.zone.runOutsideAngular(() => {
      this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
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

      // Resize listener
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
    this.updateGizmoState();
  }

  public updateGizmoState(): void {
    if (!this.gizmoManager) return;

    const selectedId = this.projectStore.selectedBoxId();
    const selectedMesh = selectedId ? this.boxMeshes.get(selectedId) : null;

    this.gizmoManager.positionGizmoEnabled = this.gizmoMode === 'position' && !!selectedMesh;
    this.gizmoManager.boundingBoxGizmoEnabled = this.gizmoMode === 'scale' && !!selectedMesh;

    if (selectedMesh) {
      this.gizmoManager.attachToMesh(selectedMesh);

      // Configure snapping to current grid resolution
      const res = this.projectStore.project().snapResolution;
      const snapDist = 1 / res;

      if (this.gizmoManager.gizmos.positionGizmo) {
        this.gizmoManager.gizmos.positionGizmo.snapDistance = snapDist;
        this.gizmoManager.gizmos.positionGizmo.xGizmo.dragBehavior.onDragEndObservable.add(() =>
          this.syncMeshTransformToStore(selectedId!)
        );
        this.gizmoManager.gizmos.positionGizmo.yGizmo.dragBehavior.onDragEndObservable.add(() =>
          this.syncMeshTransformToStore(selectedId!)
        );
        this.gizmoManager.gizmos.positionGizmo.zGizmo.dragBehavior.onDragEndObservable.add(() =>
          this.syncMeshTransformToStore(selectedId!)
        );
      }
    } else {
      this.gizmoManager.attachToMesh(null);
    }
  }

  private syncMeshTransformToStore(boxId: string): void {
    const mesh = this.boxMeshes.get(boxId);
    const box = this.projectStore.project().boxes.find(b => b.id === boxId);
    if (!mesh || !box) return;

    const res = this.projectStore.project().snapResolution;
    const snap = (v: number) => Math.round(v * res) / res;

    const width = box.maxX - box.minX;
    const height = box.maxY - box.minY;
    const depth = box.maxZ - box.minZ;

    const newCenterX = snap(mesh.position.x);
    const newCenterY = snap(mesh.position.y);
    const newCenterZ = snap(mesh.position.z);

    this.zone.run(() => {
      this.projectStore.updateBox(boxId, {
        minX: snap(newCenterX - width / 2),
        maxX: snap(newCenterX + width / 2),
        minY: snap(newCenterY - height / 2),
        maxY: snap(newCenterY + height / 2),
        minZ: snap(newCenterZ - depth / 2),
        maxZ: snap(newCenterZ + depth / 2)
      });
    });
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

    // Position and scale
    mesh.position.set(centerX, centerY, centerZ);
    mesh.scaling.set(width, height, depth);
    mesh.rotation.set(0, 0, 0);
    if (mesh.rotationQuaternion) { mesh.rotationQuaternion = null; }
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
    // Luanti face order: top (+Y), bottom (-Y), right (+X), left (-X), back (+Z), front (-Z)
    const project = this.projectStore.project();
    const globalTextures = project.globalTextures;

    const topTex = box.textures?.top || globalTextures.top;
    const botTex = box.textures?.bottom || globalTextures.bottom;
    const rightTex = box.textures?.right || globalTextures.right;
    const leftTex = box.textures?.left || globalTextures.left;
    const backTex = box.textures?.back || globalTextures.back;
    const frontTex = box.textures?.front || globalTextures.front;

    // Create MultiMaterial with subMeshes for 6 faces
    const multiMatKey = `multi_${topTex}_${botTex}_${rightTex}_${leftTex}_${backTex}_${frontTex}`;
    let multiMat = this.scene.getMaterialByName(multiMatKey) as MultiMaterial;

    if (!multiMat) {
      multiMat = new MultiMaterial(multiMatKey, this.scene);
      // Babylon box face indices:
      // 0: Front (-Z)
      // 1: Back (+Z)
      // 2: Right (+X)
      // 3: Left (-X)
      // 4: Top (+Y)
      // 5: Bottom (-Y)
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

    // Subdivide box mesh into 6 face submeshes (each quad has 6 vertices/indices)
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
        this.camera.beta = 0.001; // Avoid exact 0 singularity
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
    window.removeEventListener('resize', this.onResize);
    this.scene?.dispose();
    this.engine?.dispose();
    this.scene = null;
    this.engine = null;
    this.camera = null;
  }
}
