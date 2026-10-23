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
  }
];
