import { PresetTemplate } from './nodebox.model';

export const LUANTI_PRESETS: PresetTemplate[] = [
  {
    name: 'Slab (Half Block)',
    description: 'Standard horizontal half slab',
    boxes: [
      {
        name: 'Base Slab',
        minX: -0.5,
        minY: -0.5,
        minZ: -0.5,
        maxX: 0.5,
        maxY: 0.0,
        maxZ: 0.5,
        visible: true,
        locked: false,
        color: '#38bdf8'
      }
    ]
  },
  {
    name: 'Stairs',
    description: 'Classic Luanti stair with lower step and upper step',
    boxes: [
      {
        name: 'Lower Step',
        minX: -0.5,
        minY: -0.5,
        minZ: -0.5,
        maxX: 0.5,
        maxY: 0.0,
        maxZ: 0.5,
        visible: true,
        locked: false,
        color: '#38bdf8'
      },
      {
        name: 'Upper Step',
        minX: -0.5,
        minY: 0.0,
        minZ: 0.0,
        maxX: 0.5,
        maxY: 0.5,
        maxZ: 0.5,
        visible: true,
        locked: false,
        color: '#f59e0b'
      }
    ]
  },
  {
    name: 'Pillar / Column',
    description: 'Classical architectural column with pedestal, shaft and capital',
    boxes: [
      {
        name: 'Pedestal Base',
        minX: -0.5,
        minY: -0.5,
        minZ: -0.5,
        maxX: 0.5,
        maxY: -0.375,
        maxZ: 0.5,
        visible: true,
        locked: false,
        color: '#38bdf8'
      },
      {
        name: 'Shaft',
        minX: -0.25,
        minY: -0.375,
        minZ: -0.25,
        maxX: 0.25,
        maxY: 0.375,
        maxZ: 0.25,
        visible: true,
        locked: false,
        color: '#10b981'
      },
      {
        name: 'Capital Top',
        minX: -0.5,
        minY: 0.375,
        minZ: -0.5,
        maxX: 0.5,
        maxY: 0.5,
        maxZ: 0.5,
        visible: true,
        locked: false,
        color: '#f59e0b'
      }
    ]
  },
  {
    name: 'Wooden Chair',
    description: '4 legs, seat slab and backrest',
    boxes: [
      {
        name: 'Leg Front-Left',
        minX: -0.4375,
        minY: -0.5,
        minZ: -0.4375,
        maxX: -0.3125,
        maxY: 0.0,
        maxZ: -0.3125,
        visible: true,
        locked: false,
        color: '#a855f7'
      },
      {
        name: 'Leg Front-Right',
        minX: 0.3125,
        minY: -0.5,
        minZ: -0.4375,
        maxX: 0.4375,
        maxY: 0.0,
        maxZ: -0.3125,
        visible: true,
        locked: false,
        color: '#a855f7'
      },
      {
        name: 'Leg Back-Left',
        minX: -0.4375,
        minY: -0.5,
        minZ: 0.3125,
        maxX: -0.3125,
        maxY: 0.0,
        maxZ: 0.4375,
        visible: true,
        locked: false,
        color: '#a855f7'
      },
      {
        name: 'Leg Back-Right',
        minX: 0.3125,
        minY: -0.5,
        minZ: 0.3125,
        maxX: 0.4375,
        maxY: 0.0,
        maxZ: 0.4375,
        visible: true,
        locked: false,
        color: '#a855f7'
      },
      {
        name: 'Seat',
        minX: -0.4375,
        minY: 0.0,
        minZ: -0.4375,
        maxX: 0.4375,
        maxY: 0.0625,
        maxZ: 0.4375,
        visible: true,
        locked: false,
        color: '#38bdf8'
      },
      {
        name: 'Backrest',
        minX: -0.4375,
        minY: 0.0625,
        minZ: 0.375,
        maxX: 0.4375,
        maxY: 0.5,
        maxZ: 0.4375,
        visible: true,
        locked: false,
        color: '#f59e0b'
      }
    ]
  },
  {
    name: 'Fence / Gate',
    description: 'Center post with cross rails',
    boxes: [
      {
        name: 'Center Post',
        minX: -0.125,
        minY: -0.5,
        minZ: -0.125,
        maxX: 0.125,
        maxY: 0.5,
        maxZ: 0.125,
        visible: true,
        locked: false,
        color: '#38bdf8'
      },
      {
        name: 'Lower Rail',
        minX: -0.5,
        minY: -0.3125,
        minZ: -0.0625,
        maxX: 0.5,
        maxY: -0.1875,
        maxZ: 0.0625,
        visible: true,
        locked: false,
        color: '#f59e0b'
      },
      {
        name: 'Upper Rail',
        minX: -0.5,
        minY: 0.1875,
        minZ: -0.0625,
        maxX: 0.5,
        maxY: 0.3125,
        maxZ: 0.0625,
        visible: true,
        locked: false,
        color: '#10b981'
      }
    ]
  },
  {
    name: 'Torch',
    description: 'Stick and flame tip',
    boxes: [
      {
        name: 'Wooden Stick',
        minX: -0.0625,
        minY: -0.5,
        minZ: -0.0625,
        maxX: 0.0625,
        maxY: 0.1875,
        maxZ: 0.0625,
        visible: true,
        locked: false,
        color: '#b47a46'
      },
      {
        name: 'Torch Head / Flame',
        minX: -0.125,
        minY: 0.1875,
        minZ: -0.125,
        maxX: 0.125,
        maxY: 0.375,
        maxZ: 0.125,
        visible: true,
        locked: false,
        color: '#f59e0b'
      }
    ]
  },
  {
    name: 'Wooden Door (2 Nodes)',
    description: 'Classic 2-node tall wooden door with lower frame, window insert, and handle',
    nodeHeight: 2,
    boxes: [
      {
        name: 'Door Panel Lower',
        minX: -0.5,
        minY: -0.5,
        minZ: -0.0625,
        maxX: 0.5,
        maxY: 0.5,
        maxZ: 0.0625,
        visible: true,
        locked: false,
        color: '#b47a46'
      },
      {
        name: 'Door Panel Upper',
        minX: -0.5,
        minY: 0.5,
        minZ: -0.0625,
        maxX: 0.5,
        maxY: 1.5,
        maxZ: 0.0625,
        visible: true,
        locked: false,
        color: '#966032'
      },
      {
        name: 'Door Knob',
        minX: 0.3125,
        minY: 0.375,
        minZ: -0.125,
        maxX: 0.4375,
        maxY: 0.5,
        maxZ: 0.125,
        visible: true,
        locked: false,
        color: '#f59e0b'
      }
    ]
  },
  // --- CONNECTED PRESETS ---
  {
    name: 'Wooden Fence (Connected)',
    description: 'Post with dynamic connecting cross rails',
    nodeName: 'default:fence_wood',
    nodeboxType: 'connected',
    connectsTo: ['group:fence', 'group:wood', 'default:fence_wood'],
    boxes: [
      // Post (fixed)
      { name: 'Center Post', slot: 'fixed', minX: -0.125, minY: -0.5, minZ: -0.125, maxX: 0.125, maxY: 0.5, maxZ: 0.125, color: '#b47a46', visible: true, locked: false },
      // Rails Front (-Z)
      { name: 'Lower Rail (Front)', slot: 'connect_front', minX: -0.0625, minY: -0.3125, minZ: -0.5, maxX: 0.0625, maxY: -0.1875, maxZ: -0.125, color: '#f59e0b', visible: true, locked: false },
      { name: 'Upper Rail (Front)', slot: 'connect_front', minX: -0.0625, minY: 0.1875, minZ: -0.5, maxX: 0.0625, maxY: 0.3125, maxZ: -0.125, color: '#10b981', visible: true, locked: false },
      // Rails Back (+Z)
      { name: 'Lower Rail (Back)', slot: 'connect_back', minX: -0.0625, minY: -0.3125, minZ: 0.125, maxX: 0.0625, maxY: -0.1875, maxZ: 0.5, color: '#f59e0b', visible: true, locked: false },
      { name: 'Upper Rail (Back)', slot: 'connect_back', minX: -0.0625, minY: 0.1875, minZ: 0.125, maxX: 0.0625, maxY: 0.3125, maxZ: 0.5, color: '#10b981', visible: true, locked: false },
      // Rails Left (-X)
      { name: 'Lower Rail (Left)', slot: 'connect_left', minX: -0.5, minY: -0.3125, minZ: -0.0625, maxX: -0.125, maxY: -0.1875, maxZ: 0.0625, color: '#f59e0b', visible: true, locked: false },
      { name: 'Upper Rail (Left)', slot: 'connect_left', minX: -0.5, minY: 0.1875, minZ: -0.0625, maxX: -0.125, maxY: 0.3125, maxZ: 0.0625, color: '#10b981', visible: true, locked: false },
      // Rails Right (+X)
      { name: 'Lower Rail (Right)', slot: 'connect_right', minX: 0.125, minY: -0.3125, minZ: -0.0625, maxX: 0.5, maxY: -0.1875, maxZ: 0.0625, color: '#f59e0b', visible: true, locked: false },
      { name: 'Upper Rail (Right)', slot: 'connect_right', minX: 0.125, minY: 0.1875, minZ: -0.0625, maxX: 0.5, maxY: 0.3125, maxZ: 0.0625, color: '#10b981', visible: true, locked: false }
    ]
  },
  {
    name: 'Cobblestone Wall (Connected)',
    description: 'Thick masonry post connecting to adjacent walls',
    nodeName: 'walls:cobble',
    nodeboxType: 'connected',
    connectsTo: ['group:wall', 'walls:cobble'],
    boxes: [
      { name: 'Center Pillar', slot: 'fixed', minX: -0.25, minY: -0.5, minZ: -0.25, maxX: 0.25, maxY: 0.5, maxZ: 0.25, color: '#64748b', visible: true, locked: false },
      { name: 'Wall (Front)', slot: 'connect_front', minX: -0.1875, minY: -0.5, minZ: -0.5, maxX: 0.1875, maxY: 0.375, maxZ: -0.25, color: '#94a3b8', visible: true, locked: false },
      { name: 'Wall (Back)', slot: 'connect_back', minX: -0.1875, minY: -0.5, minZ: 0.25, maxX: 0.1875, maxY: 0.375, maxZ: 0.5, color: '#94a3b8', visible: true, locked: false },
      { name: 'Wall (Left)', slot: 'connect_left', minX: -0.5, minY: -0.5, minZ: -0.1875, maxX: -0.25, maxY: 0.375, maxZ: 0.1875, color: '#94a3b8', visible: true, locked: false },
      { name: 'Wall (Right)', slot: 'connect_right', minX: 0.25, minY: -0.5, minZ: -0.1875, maxX: 0.5, maxY: 0.375, maxZ: 0.1875, color: '#94a3b8', visible: true, locked: false }
    ]
  },
  {
    name: 'Glass Pane / Bars (Connected)',
    description: 'Thin vertical pane connecting to adjacent panes',
    nodeName: 'xpanes:pane_flat',
    nodeboxType: 'connected',
    connectsTo: ['group:pane', 'xpanes:pane_flat'],
    boxes: [
      { name: 'Center Seam', slot: 'fixed', minX: -0.0625, minY: -0.5, minZ: -0.0625, maxX: 0.0625, maxY: 0.5, maxZ: 0.0625, color: '#38bdf8', visible: true, locked: false },
      { name: 'Pane Front', slot: 'connect_front', minX: -0.0625, minY: -0.5, minZ: -0.5, maxX: 0.0625, maxY: 0.5, maxZ: -0.0625, color: '#0ea5e9', visible: true, locked: false },
      { name: 'Pane Back', slot: 'connect_back', minX: -0.0625, minY: -0.5, minZ: 0.0625, maxX: 0.0625, maxY: 0.5, maxZ: 0.5, color: '#0ea5e9', visible: true, locked: false },
      { name: 'Pane Left', slot: 'connect_left', minX: -0.5, minY: -0.5, minZ: -0.0625, maxX: -0.0625, maxY: 0.5, maxZ: 0.0625, color: '#0ea5e9', visible: true, locked: false },
      { name: 'Pane Right', slot: 'connect_right', minX: 0.0625, minY: -0.5, minZ: -0.0625, maxX: 0.5, maxY: 0.5, maxZ: 0.0625, color: '#0ea5e9', visible: true, locked: false }
    ]
  },
  {
    name: 'Industrial Pipe (Connected)',
    description: '6-way connecting pipeline junction hub',
    nodeName: 'pipeworks:pipe',
    nodeboxType: 'connected',
    connectsTo: ['group:pipe', 'pipeworks:pipe'],
    boxes: [
      { name: 'Hub Junction', slot: 'fixed', minX: -0.1875, minY: -0.1875, minZ: -0.1875, maxX: 0.1875, maxY: 0.1875, maxZ: 0.1875, color: '#475569', visible: true, locked: false },
      { name: 'Pipe Up', slot: 'connect_top', minX: -0.1875, minY: 0.1875, minZ: -0.1875, maxX: 0.1875, maxY: 0.5, maxZ: 0.1875, color: '#38bdf8', visible: true, locked: false },
      { name: 'Pipe Down', slot: 'connect_bottom', minX: -0.1875, minY: -0.5, minZ: -0.1875, maxX: 0.1875, maxY: -0.1875, maxZ: 0.1875, color: '#38bdf8', visible: true, locked: false },
      { name: 'Pipe Front', slot: 'connect_front', minX: -0.1875, minY: -0.1875, minZ: -0.5, maxX: 0.1875, maxY: 0.1875, maxZ: -0.1875, color: '#06b6d4', visible: true, locked: false },
      { name: 'Pipe Back', slot: 'connect_back', minX: -0.1875, minY: -0.1875, minZ: 0.1875, maxX: 0.1875, maxY: 0.1875, maxZ: 0.5, color: '#06b6d4', visible: true, locked: false },
      { name: 'Pipe Left', slot: 'connect_left', minX: -0.5, minY: -0.1875, minZ: -0.1875, maxX: -0.1875, maxY: 0.1875, maxZ: 0.1875, color: '#10b981', visible: true, locked: false },
      { name: 'Pipe Right', slot: 'connect_right', minX: 0.1875, minY: -0.1875, minZ: -0.1875, maxX: 0.5, maxY: 0.1875, maxZ: 0.1875, color: '#10b981', visible: true, locked: false }
    ]
  },

  // --- WALLMOUNTED PRESETS ---
  {
    name: 'Wall Torch (Wallmounted)',
    description: 'Torch with floor, ceiling, and wall mounting geometries',
    nodeName: 'default:torch',
    nodeboxType: 'wallmounted',
    boxes: [
      // Floor (wall_bottom)
      { name: 'Stick (Floor)', slot: 'wall_bottom', minX: -0.0625, minY: -0.5, minZ: -0.0625, maxX: 0.0625, maxY: 0.1875, maxZ: 0.0625, color: '#b47a46', visible: true, locked: false },
      { name: 'Flame (Floor)', slot: 'wall_bottom', minX: -0.125, minY: 0.1875, minZ: -0.125, maxX: 0.125, maxY: 0.375, maxZ: 0.125, color: '#f59e0b', visible: true, locked: false },
      // Ceiling (wall_top)
      { name: 'Stick (Ceiling)', slot: 'wall_top', minX: -0.0625, minY: -0.1875, minZ: -0.0625, maxX: 0.0625, maxY: 0.5, maxZ: 0.0625, color: '#b47a46', visible: true, locked: false },
      { name: 'Flame (Ceiling)', slot: 'wall_top', minX: -0.125, minY: -0.375, minZ: -0.125, maxX: 0.125, maxY: -0.1875, maxZ: 0.125, color: '#f59e0b', visible: true, locked: false },
      // Wall (wall_side) - attached to west (-X) wall
      { name: 'Stick (Wall)', slot: 'wall_side', minX: -0.5, minY: -0.3125, minZ: -0.0625, maxX: -0.1875, maxY: 0.3125, maxZ: 0.0625, color: '#b47a46', visible: true, locked: false },
      { name: 'Flame (Wall)', slot: 'wall_side', minX: -0.25, minY: 0.3125, minZ: -0.125, maxX: -0.0625, maxY: 0.5, maxZ: 0.125, color: '#f59e0b', visible: true, locked: false }
    ]
  },
  {
    name: 'Wooden Wall Sign (Wallmounted)',
    description: 'Standing stake sign and flush wall plaque',
    nodeName: 'default:sign_wall_wood',
    nodeboxType: 'wallmounted',
    boxes: [
      { name: 'Sign Post (Floor)', slot: 'wall_bottom', minX: -0.0625, minY: -0.5, minZ: -0.0625, maxX: 0.0625, maxY: 0.0, maxZ: 0.0625, color: '#78350f', visible: true, locked: false },
      { name: 'Sign Board (Floor)', slot: 'wall_bottom', minX: -0.4375, minY: 0.0, minZ: -0.0625, maxX: 0.4375, maxY: 0.4375, maxZ: 0.0625, color: '#b47a46', visible: true, locked: false },
      { name: 'Sign Board (Wall)', slot: 'wall_side', minX: -0.5, minY: -0.3125, minZ: -0.4375, maxX: -0.4375, maxY: 0.3125, maxZ: 0.4375, color: '#b47a46', visible: true, locked: false },
      { name: 'Sign Hanger (Ceiling)', slot: 'wall_top', minX: -0.4375, minY: -0.375, minZ: -0.0625, maxX: 0.4375, maxY: 0.5, maxZ: 0.0625, color: '#b47a46', visible: true, locked: false }
    ]
  },
  {
    name: 'Wall Lantern (Wallmounted)',
    description: 'Cast iron bracket with suspended lantern',
    nodeName: 'default:lantern',
    nodeboxType: 'wallmounted',
    boxes: [
      { name: 'Lantern Base (Floor)', slot: 'wall_bottom', minX: -0.25, minY: -0.5, minZ: -0.25, maxX: 0.25, maxY: 0.125, maxZ: 0.25, color: '#334155', visible: true, locked: false },
      { name: 'Chain (Ceiling)', slot: 'wall_top', minX: -0.0625, minY: 0.0, minZ: -0.0625, maxX: 0.0625, maxY: 0.5, maxZ: 0.0625, color: '#1e293b', visible: true, locked: false },
      { name: 'Lantern Body (Ceiling)', slot: 'wall_top', minX: -0.25, minY: -0.4375, minZ: -0.25, maxX: 0.25, maxY: 0.0, maxZ: 0.25, color: '#334155', visible: true, locked: false },
      { name: 'Wall Mount Arm (Wall)', slot: 'wall_side', minX: -0.5, minY: 0.0625, minZ: -0.0625, maxX: -0.125, maxY: 0.1875, maxZ: 0.0625, color: '#1e293b', visible: true, locked: false },
      { name: 'Lantern (Wall)', slot: 'wall_side', minX: -0.3125, minY: -0.375, minZ: -0.1875, maxX: 0.0625, maxY: 0.0625, maxZ: 0.1875, color: '#334155', visible: true, locked: false }
    ]
  },

  // --- LEVELED PRESETS ---
  {
    name: 'Snow Layer / Cover (Leveled)',
    description: 'Variable depth ground snow cover driven by param2',
    nodeName: 'default:snow',
    nodeboxType: 'leveled',
    boxes: [
      { name: 'Snow Base', slot: 'fixed', minX: -0.5, minY: -0.5, minZ: -0.5, maxX: 0.5, maxY: -0.375, maxZ: 0.5, color: '#e2e8f0', visible: true, locked: false }
    ]
  },

  // --- REGULAR PRESET ---
  {
    name: 'Full Node Cube (Regular)',
    description: 'Standard 1x1x1 solid cube node',
    nodeName: 'default:stone',
    nodeboxType: 'regular',
    boxes: [
      { name: 'Cube', slot: 'fixed', minX: -0.5, minY: -0.5, minZ: -0.5, maxX: 0.5, maxY: 0.5, maxZ: 0.5, color: '#64748b', visible: true, locked: false }
    ]
  }
];


