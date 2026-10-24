# Luanti NodeBox Studio

<p align="center">
  <a href="https://sakel-hub.github.io/luanti-nodebox-studio/">
    <img src="screenshot.png" alt="Luanti NodeBox Studio Screenshot" width="100%">
  </a>
</p>

<p align="center">
  <a href="https://sakel-hub.github.io/luanti-nodebox-studio/"><strong>🚀 Launch Live Web App</strong></a> &bull;
  <a href="#-features">Features</a> &bull;
  <a href="#-keyboard-shortcuts">Shortcuts</a> &bull;
  <a href="#-getting-started">Getting Started</a> &bull;
  <a href="#-luanti-coordinates-reference">Coordinates Reference</a>
</p>

<p align="center">
  <a href="https://github.com/sakel-hub/luanti-nodebox-studio/actions/workflows/deploy.yml">
    <img src="https://github.com/sakel-hub/luanti-nodebox-studio/actions/workflows/deploy.yml/badge.svg" alt="Deploy to GitHub Pages">
  </a>
  <img src="https://img.shields.io/badge/Angular-22+-dd0031.svg?logo=angular&logoColor=white" alt="Angular 22+">
  <img src="https://img.shields.io/badge/Babylon.js-9.32+-e65100.svg?logo=babylon.js&logoColor=white" alt="Babylon.js 9">
  <img src="https://img.shields.io/badge/PWA-Offline%20Ready-5a0fc8.svg?logo=pwa&logoColor=white" alt="PWA Ready">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License MIT">
</p>

---

A modern, accessible, offline-first 3D visual editor and Progressive Web App (PWA) built with **Angular 22+** and **Babylon.js 9+** for designing, inspecting, texturing, importing, and exporting **Luanti** (formerly Minetest) nodebox models.

---

## ✨ Features

### 🎮 Interactive 3D Viewport (Babylon.js)
- **1x1x1 Node Reference Cage**: Real-time visual boundaries (`[-0.5, 0.5]` range) with an optional 2-node boundary mode.
- **16x16 Subdivided Floor Grid**: Coordinate axis indicators (`+X` East, `+Y` Up, `+Z` North / Back).
- **Orbit, Pan & Preset Cameras**: Instant switching between Isometric, Top, Front, Back, Left, and Right views.
- **Render Modes**: Switch between Solid Color, Wireframe, and 6-Face Textured modes with normal relief lighting.
- **Transform Gizmos**: Orthogonal 90° rotation gizmo, translation gizmo, and non-diagonal axis scale gizmo with 1/16th and 1/32nd grid snapping.

### 🎨 6-Face Texture Studio & Normal Maps
- **Luanti 6-Face Mapping**: Maps to Luanti's cube tile order: `+Y` (top), `-Y` (bottom), `+X` (right), `-X` (left), `+Z` (back), `-Z` (front).
- **Procedural Pixel Normal Generator**: Real-time Sobel/Scharr normal map generation from diffuse textures for 3D surface depth relief under directional lighting.
- **UV Projection & Face Rotation**: Align, flip (U/V), and rotate (0°, 90°, 180°, 270°) texture faces per individual box.
- **Built-in & Custom Palettes**: Includes default Luanti textures (Wood Planks, Stone, Cobble, Brick, Dirt, Glass, Steel, Grass) and allows custom PNG/JPG image uploads cached locally.

### 🗂️ Layers & Box Hierarchy
- **Layer Management**: Add, clone, rename, hide/show, lock, and delete individual boxes.
- **Color Coding**: Custom per-box display colors for visual clarity while modeling.
- **Box Reordering**: Drag or button-assisted layer ordering for clean organization.

### 📐 Coordinate & Dimension Inspector
- **Dual-Mode Inputs**: Work in **Grid Units** (`-8 to +8`), **Fractions** (`-8/16`, `5/16`), or **Float Decimals** (`-0.5 to +0.5`).
- **Nudge & Resolution**: Fine-tune position and dimension with adjustable snap resolution ($1/16$, $1/32$, $1/64$).
- **Symmetry & Mirror Tools**: One-click symmetry mirrors (`Flip X`, `Flip Y`, `Flip Z`) for rapid symmetric modeling (e.g. table legs, chairs, lanterns).

### 💻 Lua Code Generator & Live Importer
- **Luanti 5.10+ & Legacy Minetest**: Generates modern `core.register_node(...)` or backward-compatible `minetest.register_node(...)`.
- **Multiple Output Formats**:
  - `16ths Fractions`: `{-8/16, -8/16, -8/16, 8/16, 0/16, 8/16}`
  - `Divisible 16/8`: `{-4/8, -4/8, -4/8, 4/8, 0/8, 4/8}`
  - `Simplified Fractions`: `{-1/2, -1/2, -1/2, 1/2, 0, 1/2}`
  - `Float Decimals`: `{-0.5, -0.5, -0.5, 0.5, 0.0, 0.5}`
  - `Grid Integers`: `{-8, -8, -8, 8, 0, 8}`
- **Live Importer**: Paste any Lua snippet from an existing mod—handles arithmetic fractions (`-8/16`), comments (`--`), and extracts node names & tiles.

### 📚 Presets Library
- Built-in starting templates: Slab, Stairs, Pillar / Column, Wooden Chair, Fence / Gate, and Torch.

### ⚡ Offline PWA & Ergonomics
- **Offline First**: Fully functional offline via `@angular/service-worker`.
- **Installable**: Install as a standalone desktop or mobile application.
- **Auto-Save & Project Files**: Automatically preserves your workspace in `localStorage` and supports exporting/importing JSON project files.
- **Resizable Panels**: Adjustable layout splitters for layers, inspector, and code drawer.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>G</kbd> | Move (Translate) tool |
| <kbd>R</kbd> | Rotate tool (orthogonal 90° snaps) |
| <kbd>S</kbd> | Scale tool |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>Z</kbd> | Undo last modification |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | Redo |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>C</kbd> | Copy selected box |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>V</kbd> | Paste copied box |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Delete selected box |
| <kbd>Space</kbd> | Focus / Reset camera to active box |
| <kbd>?</kbd> | Toggle Keyboard Shortcuts cheat-sheet dialog |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 24 LTS (`v24.16.0+`)
- npm 11+

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/sakel-hub/luanti-nodebox-studio.git
cd luanti-nodebox-studio

# Install dependencies
npm ci

# Start development server
npm start
```
Open [http://localhost:4200](http://localhost:4200) in your browser.

### Run Unit Tests
```bash
npm run test
```

### Production & PWA Build
```bash
npm run build
```
Optimized static files will be generated in `dist/luanti-nodebox/browser`.

---

## 📐 Luanti Coordinates Reference

| Direction | Luanti Axis | Tile Face Index |
| :--- | :--- | :--- |
| **Top** | `+Y` (Up) | `1` |
| **Bottom** | `-Y` (Down) | `2` |
| **Right** | `+X` (East) | `3` |
| **Left** | `-X` (West) | `4` |
| **Back** | `+Z` (North) | `5` |
| **Front** | `-Z` (South) | `6` |

A standard full Luanti node cube occupies the coordinate range `[-0.5, 0.5]` in all three axes:
$$-0.5 = -\frac{8}{16} \qquad \text{and} \qquad +0.5 = +\frac{8}{16}$$

---

## 📄 License

This project is licensed under the [MIT License](LICENSE.txt).
