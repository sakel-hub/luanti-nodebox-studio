# Luanti NodeBox Studio (PWA)

A modern, accessible, offline-first 3D web application and Progressive Web App (PWA) built with **Angular 22+** and **Babylon.js 7+** for designing, inspecting, importing, and exporting **Luanti** (formerly Minetest) nodebox models.

---

## ✨ Features

- **Interactive 3D Viewport (Babylon.js)**:
  - 1x1x1 Luanti node reference boundary cage (`[-0.5, 0.5]` range).
  - 16x16 subdivided floor grid with coordinate axis indicators (`+X` East, `+Y` Up, `+Z` North / Back).
  - Orbit, pan, zoom, and preset camera angles (Top, Front, Back, Left, Right, Isometric).
  - Solid color, wireframe, and 6-face textured render modes.
  - Interactive transform gizmos with 1/16th or 1/32nd grid snapping.
- **Layers & Box Hierarchy**:
  - Add, clone, rename, hide/show, lock, and delete individual boxes.
  - Custom display color pickers for visual clarity.
  - Quick reorder (up/down).
- **Coordinate & Dimension Inspector**:
  - Dual-mode input: **Grid Units** (`-8 to +8`), **Fractions** (`-8/16`, `5/16`), or **Float Decimals** (`-0.5 to +0.5`).
  - Axis nudge buttons with adjustable snap step resolution ($1/16$, $1/32$, $1/64$).
  - Symmetry / Mirror tools (`Flip X`, `Flip Y`, `Flip Z`) for rapid chair/table leg modeling.
- **Luanti 6-Face Texture Studio**:
  - Maps to Luanti's 6 cube faces: `+Y` (top), `-Y` (bottom), `+X` (right), `-X` (left), `+Z` (back), `-Z` (front).
  - Built-in procedural palette: Wood Planks, Smooth Stone, Cobblestone, Brick, Dirt, Glass, Steel, and 16x16 UV Grid.
  - Upload custom PNG/JPG textures stored locally in offline browser storage.
  - Apply texture per face, to all faces, or per specific box.
- **Lua Code Generator & Live Importer**:
  - **Export**: Real-time Lua code generator with one-click copy and .lua file download.
  - **Syntax Options**:
    - `16ths Fractions` (e.g. `{-8/16, -8/16, -8/16, 8/16, -5/16, 8/16}`)
    - `Divisible 16/8` (e.g. `{-4/8, -4/8, ...}`)
    - `Simplified Fractions` (e.g. `{-1/2, 1/4, 5/16}`)
    - `Float Decimals` (e.g. `{-0.5, -0.5, ...}`)
    - `Grid Integers` (e.g. `{-8, -8, ...}`)
  - **Templates**: `core.register_node`, `node_box = { ... }`, or standalone `fixed = { ... }`.
  - **Import**: Paste any Lua snippet from an existing mod—handles arithmetic fractions (`-8/16`, `16/8`), comments (`--`), and extracts node names & tiles.
- **Presets Library**:
  - Includes Slab, Stairs, Pillar/Column, Wooden Chair, Fence/Gate, and Torch.
- **Offline PWA**:
  - Fully functional offline via `@angular/service-worker`.
  - Installable as a standalone app on macOS, Windows, Linux, Android, and iOS.
  - Auto-saves work locally and supports JSON project save/load.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 24 LTS (`v24.16.0+`)
- npm 11+

### Installation & Development
```bash
# Navigate to project folder
cd ~/Documents/gits/luanti-nodebox

# Start development server
npm start
```
Open [http://localhost:4200](http://localhost:4200) in your browser.

### Run Unit Tests
```bash
npm test -- --watch=false
```

### Production & PWA Build
```bash
npm run build
```
The optimized PWA production files will be generated in `dist/luanti-nodebox/browser`.

---

## 📐 Luanti Coordinates Reference

| Direction | Luanti Axis | Tile Face Index |
|-----------|-------------|-----------------|
| Top       | `+Y` (Up)   | `1`             |
| Bottom    | `-Y` (Down) | `2`             |
| Right     | `+X` (East) | `3`             |
| Left      | `-X` (West) | `4`             |
| Back      | `+Z` (North)| `5`             |
| Front     | `-Z` (South)| `6`             |

A standard full Luanti node cube occupies the coordinate range `[-0.5, 0.5]` in all three axes. In a 16-subdivision grid:
$$-0.5 = -\frac{8}{16} \qquad \text{and} \qquad +0.5 = +\frac{8}{16}$$
