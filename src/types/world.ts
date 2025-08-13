// World generation and chunk management types
export interface ChunkCoordinate {
  x: number
  z: number
}

export interface Chunk {
  x: number
  z: number
  blocks: Map<string, string>
  generated: boolean
  loaded: boolean
  dirty: boolean // Needs saving
  entities: string[] // Entity IDs in this chunk
}

export interface BiomeData {
  id: string
  name: string
  temperature: number
  humidity: number
  surfaceBlock: string
  subsurfaceBlock: string
  stoneDepth: number
  treeChance: number
  grassChance: number
  flowerChance: number
  villageChance: number
  caveChance: number
  oreChance: number
  waterLevel: number
  snowLevel: number
}

export interface NoiseConfig {
  scale: number
  octaves: number
  persistence: number
  lacunarity: number
  seed: number
}

export interface WorldGenerationConfig {
  chunkSize: number
  worldHeight: number
  seaLevel: number
  seed: number
  biomeScale: number
  terrainScale: number
  caveScale: number
  oreScale: number
}

export interface Structure {
  type: 'village' | 'dungeon' | 'mineshaft' | 'cave' | 'tree'
  position: { x: number; y: number; z: number }
  size: { width: number; height: number; depth: number }
  blocks: Array<{ x: number; y: number; z: number; type: string }>
}

// Biome definitions
export const BIOMES: Record<string, BiomeData> = {
  plains: {
    id: 'plains',
    name: 'Plains',
    temperature: 0.8,
    humidity: 0.4,
    surfaceBlock: 'grass',
    subsurfaceBlock: 'dirt',
    stoneDepth: 4,
    treeChance: 0.02,
    grassChance: 0.8,
    flowerChance: 0.1,
    villageChance: 0.01,
    caveChance: 0.15,
    oreChance: 0.1,
    waterLevel: 62,
    snowLevel: 90,
  },

  forest: {
    id: 'forest',
    name: 'Forest',
    temperature: 0.7,
    humidity: 0.8,
    surfaceBlock: 'grass',
    subsurfaceBlock: 'dirt',
    stoneDepth: 4,
    treeChance: 0.15,
    grassChance: 0.9,
    flowerChance: 0.05,
    villageChance: 0.003,
    caveChance: 0.12,
    oreChance: 0.08,
    waterLevel: 62,
    snowLevel: 90,
  },

  desert: {
    id: 'desert',
    name: 'Desert',
    temperature: 2.0,
    humidity: 0.0,
    surfaceBlock: 'sand',
    subsurfaceBlock: 'sand',
    stoneDepth: 8,
    treeChance: 0.001,
    grassChance: 0.0,
    flowerChance: 0.0,
    villageChance: 0.005,
    caveChance: 0.1,
    oreChance: 0.12,
    waterLevel: 62,
    snowLevel: 150,
  },

  mountains: {
    id: 'mountains',
    name: 'Mountains',
    temperature: 0.2,
    humidity: 0.3,
    surfaceBlock: 'stone',
    subsurfaceBlock: 'stone',
    stoneDepth: 1,
    treeChance: 0.005,
    grassChance: 0.2,
    flowerChance: 0.01,
    villageChance: 0.001,
    caveChance: 0.2,
    oreChance: 0.2,
    waterLevel: 62,
    snowLevel: 80,
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean',
    temperature: 0.5,
    humidity: 0.5,
    surfaceBlock: 'water',
    subsurfaceBlock: 'sand',
    stoneDepth: 6,
    treeChance: 0.0,
    grassChance: 0.0,
    flowerChance: 0.0,
    villageChance: 0.0,
    caveChance: 0.05,
    oreChance: 0.05,
    waterLevel: 62,
    snowLevel: 90,
  },

  tundra: {
    id: 'tundra',
    name: 'Tundra',
    temperature: 0.0,
    humidity: 0.5,
    surfaceBlock: 'snow',
    subsurfaceBlock: 'dirt',
    stoneDepth: 4,
    treeChance: 0.01,
    grassChance: 0.1,
    flowerChance: 0.0,
    villageChance: 0.002,
    caveChance: 0.1,
    oreChance: 0.08,
    waterLevel: 62,
    snowLevel: 0,
  },
}

// World generation utilities
export function getChunkKey(chunkX: number, chunkZ: number): string {
  return `${chunkX},${chunkZ}`
}

export function worldToChunk(worldCoord: number, chunkSize = 16): number {
  return Math.floor(worldCoord / chunkSize)
}

export function chunkToWorld(chunkCoord: number, chunkSize = 16): number {
  return chunkCoord * chunkSize
}

export function getBlockKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`
}

export function parseBlockKey(key: string): { x: number; y: number; z: number } {
  const [x, y, z] = key.split(',').map(Number)
  return { x, y, z }
}
