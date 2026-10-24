export type FaceDirection = 'top' | 'bottom' | 'right' | 'left' | 'back' | 'front';

export const LUANTI_FACE_DIRECTIONS: readonly FaceDirection[] = [
  'top',    // +Y (index 1)
  'bottom', // -Y (index 2)
  'right',  // +X (index 3)
  'left',   // -X (index 4)
  'back',   // +Z (index 5)
  'front'   // -Z (index 6)
] as const;

export interface FaceTextures {
  top?: string;
  bottom?: string;
  right?: string;
  left?: string;
  back?: string;
  front?: string;
}

export interface TextureAnimationConfig {
  type: 'vertical_frames';
  aspect_w: number;
  aspect_h: number;
  length: number; // total duration of the animation loop in seconds
  frameCount?: number;
}

export interface TileDefinition {
  name: string;
  animation?: TextureAnimationConfig;
  backfaceCulling?: boolean;
  tileableVertical?: boolean;
  tileableHorizontal?: boolean;
}

export interface AABB {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export const BOX_PALETTE = [
  '#38bdf8', // sky
  '#f59e0b', // amber
  '#10b981', // emerald
  '#a855f7', // purple
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6'  // teal
] as const;

export type NodeboxType = 'fixed' | 'connected' | 'wallmounted' | 'leveled' | 'regular';

export type NodeboxSlot =
  | 'fixed'
  // Connected slots:
  | 'connect_top'
  | 'connect_bottom'
  | 'connect_front'
  | 'connect_left'
  | 'connect_back'
  | 'connect_right'
  | 'disconnected_top'
  | 'disconnected_bottom'
  | 'disconnected_front'
  | 'disconnected_left'
  | 'disconnected_back'
  | 'disconnected_right'
  | 'disconnected'
  | 'disconnected_sides'
  // Wallmounted slots:
  | 'wall_top'
  | 'wall_bottom'
  | 'wall_side';

export interface NeighborConnectionState {
  top: boolean;
  bottom: boolean;
  front: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

export const CONNECTED_SLOTS: readonly NodeboxSlot[] = [
  'fixed',
  'connect_top',
  'connect_bottom',
  'connect_front',
  'connect_left',
  'connect_back',
  'connect_right',
  'disconnected_top',
  'disconnected_bottom',
  'disconnected_front',
  'disconnected_left',
  'disconnected_back',
  'disconnected_right',
  'disconnected_sides',
  'disconnected'
] as const;

export const WALLMOUNTED_SLOTS: readonly NodeboxSlot[] = [
  'wall_bottom',
  'wall_top',
  'wall_side'
] as const;

export interface Box extends AABB {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
  textures?: FaceTextures;
  slot?: NodeboxSlot;
}

export type FractionFormat =
  | 'fractions_16'
  | 'fractions_32'
  | 'fractions_simplified'
  | 'divisible_16_8'
  | 'decimals'
  | 'grid_integers';

export type ExportTemplate = 'fixed_only' | 'node_box' | 'register_node';

export interface NodeboxProject {
  id: string;
  name: string;
  nodeName: string;
  nodeHeight?: number; // 1 (default standard node) or 2 (tall 2-node model)
  nodeboxType?: NodeboxType;
  connectsTo?: string[];
  boxes: Box[];
  globalTextures: Record<FaceDirection, string>;
  format: FractionFormat;
  exportTemplate: ExportTemplate;
  snapResolution: number; // 16, 32, 64
  updatedAt: number;
}

export interface PresetTemplate {
  name: string;
  description: string;
  nodeName?: string;
  nodeHeight?: number;
  nodeboxType?: NodeboxType;
  connectsTo?: string[];
  globalTextures?: Record<FaceDirection, string>;
  boxes: Omit<Box, 'id'>[];
}

