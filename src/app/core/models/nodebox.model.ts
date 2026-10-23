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

export interface Box {
  id: string;
  name: string;
  // Normalized Luanti coordinates [-0.5, 0.5]
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  visible: boolean;
  locked: boolean;
  color: string;
  textures?: FaceTextures;
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
  boxes: Omit<Box, 'id'>[];
}
