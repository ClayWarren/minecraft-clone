// Block type definitions for Minecraft clone
export interface BlockType {
  id: string
  name: string
  hardness: number
  toolRequired?: string
  drops: string[]
  transparent: boolean
  solid: boolean
  color: number
  texture?: string | { all?: string; top?: string; bottom?: string; side?: string }
}

export interface BlockPosition {
  x: number
  y: number
  z: number
}

export interface BlockData {
  type: string
  position: BlockPosition
  metadata?: any
}

// Block definitions
export const BLOCK_TYPES: Record<string, BlockType> = {
  air: {
    id: 'air',
    name: 'Air',
    hardness: 0,
    drops: [],
    transparent: true,
    solid: false,
    color: 0x000000
  },
  
  grass: {
    id: 'grass',
    name: 'Grass Block',
    hardness: 0.6,
    toolRequired: 'shovel',
    drops: ['dirt'],
    transparent: false,
    solid: true,
    color: 0x7CB342
  },
  
  dirt: {
    id: 'dirt',
    name: 'Dirt',
    hardness: 0.5,
    toolRequired: 'shovel',
    drops: ['dirt'],
    transparent: false,
    solid: true,
    color: 0x8D6E63
  },
  
  stone: {
    id: 'stone',
    name: 'Stone',
    hardness: 1.5,
    toolRequired: 'pickaxe',
    drops: ['cobblestone'],
    transparent: false,
    solid: true,
    color: 0x757575
  },
  
  cobblestone: {
    id: 'cobblestone',
    name: 'Cobblestone',
    hardness: 2.0,
    toolRequired: 'pickaxe',
    drops: ['cobblestone'],
    transparent: false,
    solid: true,
    color: 0x616161
  },
  
  wood: {
    id: 'wood',
    name: 'Wood Log',
    hardness: 2.0,
    toolRequired: 'axe',
    drops: ['wood'],
    transparent: false,
    solid: true,
    color: 0x8D6E63
  },
  
  planks: {
    id: 'planks',
    name: 'Wood Planks',
    hardness: 2.0,
    toolRequired: 'axe',
    drops: ['planks'],
    transparent: false,
    solid: true,
    color: 0xA1887F
  },
  
  sand: {
    id: 'sand',
    name: 'Sand',
    hardness: 0.5,
    toolRequired: 'shovel',
    drops: ['sand'],
    transparent: false,
    solid: true,
    color: 0xF5DEB3
  },
  
  water: {
    id: 'water',
    name: 'Water',
    hardness: -1, // Unbreakable
    drops: [],
    transparent: true,
    solid: false,
    color: 0x2196F3
  },
  
  coal_ore: {
    id: 'coal_ore',
    name: 'Coal Ore',
    hardness: 3.0,
    toolRequired: 'pickaxe',
    drops: ['coal'],
    transparent: false,
    solid: true,
    color: 0x424242
  },
  
  iron_ore: {
    id: 'iron_ore',
    name: 'Iron Ore',
    hardness: 3.0,
    toolRequired: 'pickaxe',
    drops: ['iron_ore'],
    transparent: false,
    solid: true,
    color: 0xBCAAA4
  },
  
  diamond_ore: {
    id: 'diamond_ore',
    name: 'Diamond Ore',
    hardness: 3.0,
    toolRequired: 'pickaxe',
    drops: ['diamond'],
    transparent: false,
    solid: true,
    color: 0x81D4FA
  },
  
  bedrock: {
    id: 'bedrock',
    name: 'Bedrock',
    hardness: -1, // Unbreakable
    drops: [],
    transparent: false,
    solid: true,
    color: 0x263238,
    texture: '/textures/blocks/bedrock.png'
  },
  leaves: {
    id: 'leaves',
    name: 'Leaves',
    hardness: 0.2,
    toolRequired: 'shears',
    drops: ['stick'],
    transparent: true,
    solid: false,
    color: 0x4CAF50,
    texture: '/textures/blocks/leaves.png'
  },
  glass: {
    id: 'glass',
    name: 'Glass',
    hardness: 0.3,
    drops: [],
    transparent: true,
    solid: false,
    color: 0xADD8E6,
    texture: '/textures/blocks/glass.png'
  },
  crafting_table: {
    id: 'crafting_table',
    name: 'Crafting Table',
    hardness: 2.5,
    toolRequired: 'axe',
    drops: ['crafting_table'],
    transparent: false,
    solid: true,
    color: 0x8B4513,
    texture: { top: '/textures/blocks/crafting_table_top.png', side: '/textures/blocks/crafting_table_side.png', bottom: '/textures/blocks/planks.png' }
  }
}

// Tool effectiveness for mining
export const TOOL_EFFECTIVENESS: Record<string, Record<string, number>> = {
  hand: {
    dirt: 1,
    grass: 1,
    sand: 1,
    wood: 0.5,
    stone: 0.1,
    leaves: 0.1,
    glass: 0.1
  },
  
  pickaxe: {
    stone: 3,
    cobblestone: 3,
    coal_ore: 3,
    iron_ore: 3,
    diamond_ore: 3
  },
  
  axe: {
    wood: 3,
    planks: 3,
    crafting_table: 3
  },
  
  shovel: {
    dirt: 3,
    grass: 3,
    sand: 3
  },
  shears: {
    leaves: 3
  }
}

// Utility functions
export function getBlockType(id: string): BlockType | undefined {
  return BLOCK_TYPES[id]
}

export function getBlockAt(position: BlockPosition, blocks: Map<string, string>): string {
  const key = `${position.x},${position.y},${position.z}`
  return blocks.get(key) || 'air'
}

export function setBlockAt(position: BlockPosition, blockType: string, blocks: Map<string, string>): void {
  const key = `${position.x},${position.y},${position.z}`
  if (blockType === 'air') {
    blocks.delete(key)
  } else {
    blocks.set(key, blockType)
  }
}

export function positionToKey(position: BlockPosition): string {
  return `${position.x},${position.y},${position.z}`
}

export function keyToPosition(key: string): BlockPosition {
  const [x, y, z] = key.split(',').map(Number)
  return { x, y, z }
}