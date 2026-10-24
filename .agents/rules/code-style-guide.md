# Luanti NodeBox Studio — Code Style Guide & Best Practices

This guide establishes the architectural standards, coding conventions, and best practices for developing and maintaining the Luanti NodeBox Studio application. Future AI agents and human contributors must follow these guidelines.

---

## 1. Core Principles

### 1.1 Don't Repeat Yourself (DRY)
- **Centralize Common Models & Types**: Every domain concept must have a single source of truth.
  - Coordinate bounding boxes must use `AABB` from [`nodebox.model.ts`](file:///Users/juraj/Documents/gits/luanti-nodebox/src/app/core/models/nodebox.model.ts). Do not create duplicate bounding box interfaces.
  - Color palettes must be imported from `BOX_PALETTE` in [`nodebox.model.ts`](file:///Users/juraj/Documents/gits/luanti-nodebox/src/app/core/models/nodebox.model.ts).
- **Reusable Utility Functions**: Coordinate snapping, fraction formatting, and rotation logic live in `src/app/core/utils/`. Never duplicate inline math or string parsing across components.
- **Unified Safe Storage**: Use `safeGetItem`, `safeSetItem`, and `safeRemoveItem` from [`storage.utils.ts`](file:///Users/juraj/Documents/gits/luanti-nodebox/src/app/core/utils/storage.utils.ts). Never sprinkle raw `try { localStorage... }` blocks across feature components.

### 1.2 Prefer Out-Of-The-Box (OOTB) Library & Platform APIs
Before creating custom algorithms or utilities, verify if the framework, library, or modern web platform already provides a standard, optimized method:
- **Babylon.js Built-Ins**:
  - Use `GizmoManager`, `PositionGizmo`, `ScaleGizmo`, `RotationGizmo`, and `BoundingBoxGizmo` for interactive 3D scene manipulation instead of custom drag-math meshes.
  - Use `extractSnappedAABB` with `BoundingBoxGizmo.onScaleBoxDragEndObservable` to leverage Babylon's built-in opposite-face anchoring automatically.
  - Use `MeshBuilder.CreateLineSystem` and Babylon materials with caching.
- **Modern Web APIs**:
  - Use native `structuredClone()` instead of `JSON.parse(JSON.stringify())` for deep copying state.
  - Use HTML5 standard drag-and-drop events (`dragover`, `dragenter`, `dragleave`, `drop`) with `preventDefault()` and `stopPropagation()` to handle file drops without opening browser tabs.
  - Use `ResizeObserver` combined with RAF throttling for responsive canvas elements.
  - Use CSS `contain: strict;` on 3D canvas wrappers to isolate viewport layout recalculations.
  - Use `[image-rendering:pixelated]` for low-res texture previews.

---

## 2. 3D Viewport & Babylon.js Standards

### 2.1 Smooth Viewport Resizing (Zero-Flicker Architecture)
High-frequency layout updates (such as dragging side panels or code drawers) must never invoke synchronous `engine.resize()` on every mousemove tick:
1. **RAF-Throttled Engine Resize**:
   ```typescript
   public triggerSmoothResize = (): void => {
     if (this.resizeRafId !== null) return;
     this.resizeRafId = requestAnimationFrame(() => {
       this.resizeRafId = null;
       if (!this.engine || !this.scene) return;
       this.engine.resize();
       if (this.scene.activeCamera) {
         this.scene.render();
       }
     });
   };
   ```
2. **Immediate In-Frame Render**: Explicitly call `this.scene.render()` directly after `engine.resize()` inside the animation frame callback so the newly sized buffer is drawn in the same frame without blank flicker.
3. **No Redundant Dispatch Loops**: Panel resize drag handlers should update signal widths and only dispatch `resize` on mouse/touch termination (`mouseup`/`touchend`). The canvas's `ResizeObserver` handles continuous redraw cleanly.

### 2.2 Dual Scaling Modes
Support both standard transformation workflows:
- **Scale (Center)**: Uses Babylon's `ScaleGizmo`. Scales the box symmetrically around its center point across chosen axes.
- **Resize (Faces)**: Uses Babylon's `BoundingBoxGizmo`. Anchors the opposite face and moves only the dragged face/corner, snapping coordinates to the active grid resolution.

### 2.3 Resource Disposal & Memory Leak Prevention
Every Babylon.js service or component must clean up resources upon unmounting:
- Dispose `GizmoManager` (`this.gizmoManager?.dispose()`).
- Dispose `Scene` (`this.scene?.dispose()`).
- Dispose `Engine` (`this.engine?.dispose()`).
- Cancel pending RAF callbacks (`cancelAnimationFrame(this.resizeRafId)`).
- Disconnect `ResizeObserver`.
- Clear cached mesh, material, and texture maps.

---

## 3. Angular Architecture & State Management

### 3.1 Signals & Immutability
- Use Angular Signals (`signal`, `computed`, `effect`) for reactive state.
- **Immutable Updates**: State mutations must produce fresh references without mutating nested state:
  ```typescript
  // CORRECT: Shallow copy nested objects
  const updatedGlobalTextures = { ...p.globalTextures };
  updatedGlobalTextures[dir] = newTexture;
  return { ...p, globalTextures: updatedGlobalTextures, updatedAt: Date.now() };

  // INCORRECT: Direct mutation of nested property
  const updated = { ...p };
  updated.globalTextures[dir] = newTexture; // Mutates original p.globalTextures!
  ```

### 3.2 List Filtering & Reordering
- When lists support search or filtering (e.g. `LayerListComponent`), **never reorder by filtered index**.
- Look up the item by unique `box.id` in the canonical state array and move using true indexes:
  ```typescript
  moveBox(id: string, delta: -1 | 1): void {
    const all = this.projectStore.boxes();
    const fromIndex = all.findIndex(b => b.id === id);
    if (fromIndex === -1) return;
    const toIndex = fromIndex + delta;
    if (toIndex < 0 || toIndex >= all.length) return;
    this.projectStore.reorderBoxes(fromIndex, toIndex);
  }
  ```

### 3.3 Safe Storage & SSR Resilience
- Do not make direct, unguarded calls to `localStorage`.
- Always use [`storage.utils.ts`](file:///Users/juraj/Documents/gits/luanti-nodebox/src/app/core/utils/storage.utils.ts) which safely checks `typeof localStorage !== 'undefined'` and catches quota/permission errors.
- Wrap constructor effects in `try/catch` or provide safe defaults so store classes can be instantiated directly in non-browser or test environments.

---

## 4. Luanti Coordinate & Math Guidelines

- **Coordinate System**: Luanti nodeboxes use standard coordinates from `-0.5` to `+0.5` (representing a 1x1x1 in-game node).
- **Grid Snapping**: Coordinates snap to `1 / snapResolution` (16, 32, or 64 divisions).
- **Snap Math**:
  ```typescript
  const snap = (v: number) => {
    const rounded = Math.round(v * resolution) / resolution;
    return Object.is(rounded, -0) ? 0 : rounded;
  };
  ```
- **Thickness Guard**: Ensure boxes never invert or collapse to zero dimension during scaling:
  ```typescript
  if (maxX <= minX) maxX = snap(minX + 1 / resolution);
  ```

---

## 5. Testing & Code Quality

- **Unit Testing**: Run tests with `npm test` (powered by Vitest).
- **Speed & Isolation**: Write fast, deterministic unit tests for utilities and stores. Avoid unnecessary `TestBed` boilerplate for services without Angular DOM dependencies.
- **Zero Type Errors**: Ensure `npx tsc --noEmit` completes cleanly with 0 errors before committing changes.
