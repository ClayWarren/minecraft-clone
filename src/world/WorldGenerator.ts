import { NoiseGenerator } from './NoiseGenerator'
import { BIOMES, BiomeData, Chunk, WorldGenerationConfig, getBlockKey } from '@/types/world'
import { BLOCK_TYPES } from '@/types/blocks'

export class WorldGenerator {
  private noise: NoiseGenerator
  private config: WorldGenerationConfig

  constructor(config: WorldGenerationConfig) {
    this.config = config
    this.noise = new NoiseGenerator(config.seed)
  }

  generateChunk(chunkX: number, chunkZ: number): Chunk {
    const chunk: Chunk = {
      x: chunkX,
      z: chunkZ,
      blocks: new Map(),
      generated: false,
      loaded: true,
      dirty: true,
      entities: []
    }

    // Generate terrain for each block in the chunk
    for (let localX = 0; localX < this.config.chunkSize; localX++) {
      for (let localZ = 0; localZ < this.config.chunkSize; localZ++) {
        const worldX = chunkX * this.config.chunkSize + localX
        const worldZ = chunkZ * this.config.chunkSize + localZ

        this.generateColumn(chunk, worldX, worldZ, localX, localZ)
      }
    }

    // Add structures (trees, villages, etc.)
    this.generateStructures(chunk, chunkX, chunkZ)

    chunk.generated = true
    return chunk
  }

  private generateColumn(chunk: Chunk, worldX: number, worldZ: number, localX: number, localZ: number): void {
    // Get biome for this position
    const biomeId = this.noise.getBiome(worldX, worldZ, this.config.biomeScale)
    const biome = BIOMES[biomeId] || BIOMES.plains

    // Get terrain height
    const terrainHeight = this.noise.getTerrainHeight(worldX, worldZ, this.config.terrainScale)
    const seaLevel = this.config.seaLevel

    // Generate bedrock layer
    if (terrainHeight > 0) {
      this.setBlock(chunk, localX, 0, localZ, 'bedrock')
    }

    // Generate stone layer
    for (let y = 1; y <= Math.min(terrainHeight - biome.stoneDepth, this.config.worldHeight); y++) {
      if (!this.isCave(worldX, y, worldZ)) {
        this.setBlock(chunk, localX, y, localZ, 'stone')
        
        // Add ores
        this.generateOres(chunk, localX, y, localZ, worldX, worldZ)
      }
    }

    // Generate subsurface layer
    const subsurfaceStart = Math.max(1, terrainHeight - biome.stoneDepth + 1)
    const subsurfaceEnd = Math.max(subsurfaceStart, terrainHeight - 1)
    
    for (let y = subsurfaceStart; y <= subsurfaceEnd && y <= this.config.worldHeight; y++) {
      if (!this.isCave(worldX, y, worldZ)) {
        this.setBlock(chunk, localX, y, localZ, biome.subsurfaceBlock)
      }
    }

    // Generate surface layer
    if (terrainHeight >= seaLevel && terrainHeight <= this.config.worldHeight) {
      if (!this.isCave(worldX, terrainHeight, worldZ)) {
        let surfaceBlock = biome.surfaceBlock
        
        // Snow on high elevations
        if (terrainHeight > biome.snowLevel) {
          surfaceBlock = 'snow'
        }
        
        this.setBlock(chunk, localX, terrainHeight, localZ, surfaceBlock)
      }
    }

    // Fill water below sea level
    if (terrainHeight < seaLevel) {
      for (let y = terrainHeight + 1; y <= seaLevel && y <= this.config.worldHeight; y++) {
        this.setBlock(chunk, localX, y, localZ, 'water')
      }
    }

    // Generate vegetation
    if (terrainHeight >= seaLevel && terrainHeight < this.config.worldHeight) {
      this.generateVegetation(chunk, localX, terrainHeight + 1, localZ, worldX, worldZ, biome)
    }
  }

  private generateOres(chunk: Chunk, localX: number, y: number, localZ: number, worldX: number, worldZ: number): void {
    const oreNoise = this.noise.fbm3D(worldX * 0.1, y * 0.1, worldZ * 0.1, 3, 0.6, 2.0)
    
    // Coal ore (common, higher levels)
    if (y > 5 && y < 60 && oreNoise > 0.7) {
      const coalChance = this.noise.noise2D(worldX * 0.2, worldZ * 0.2)
      if (coalChance > 0.8) {
        this.setBlock(chunk, localX, y, localZ, 'coal_ore')
        return
      }
    }

    // Iron ore (medium depth)
    if (y > 5 && y < 40 && oreNoise > 0.75) {
      const ironChance = this.noise.noise2D(worldX * 0.15, worldZ * 0.15)
      if (ironChance > 0.85) {
        this.setBlock(chunk, localX, y, localZ, 'iron_ore')
        return
      }
    }

    // Diamond ore (deep, rare)
    if (y > 1 && y < 16 && oreNoise > 0.85) {
      const diamondChance = this.noise.noise2D(worldX * 0.05, worldZ * 0.05)
      if (diamondChance > 0.9) {
        this.setBlock(chunk, localX, y, localZ, 'diamond_ore')
        return
      }
    }
  }

  private generateVegetation(chunk: Chunk, localX: number, y: number, localZ: number, worldX: number, worldZ: number, biome: BiomeData): void {
    const vegetationNoise = this.noise.noise2D(worldX * 0.1, worldZ * 0.1)
    
    // Trees
    if (vegetationNoise > (1 - biome.treeChance * 2)) {
      this.generateTree(chunk, localX, y, localZ, biome)
    }
    // Grass
    else if (vegetationNoise > (1 - biome.grassChance) && biome.grassChance > 0) {
      // TODO: Add grass blocks when we have them
      // this.setBlock(chunk, localX, y, localZ, 'tall_grass')
    }
  }

  private generateTree(chunk: Chunk, localX: number, y: number, localZ: number, biome: BiomeData): void {
    const treeHeight = 4 + Math.floor(Math.random() * 3) // 4-6 blocks tall

    // Generate trunk
    for (let i = 0; i < treeHeight; i++) {
      if (y + i <= this.config.worldHeight) {
        this.setBlock(chunk, localX, y + i, localZ, 'wood')
      }
    }

    // Generate leaves (simple 3x3 square at top)
    const leavesY = y + treeHeight
    if (leavesY <= this.config.worldHeight) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const leafX = localX + dx
          const leafZ = localZ + dz
          
          // Check bounds within chunk
          if (leafX >= 0 && leafX < this.config.chunkSize && 
              leafZ >= 0 && leafZ < this.config.chunkSize) {
            // Don't replace the wood trunk
            if (!(dx === 0 && dz === 0)) {
              // TODO: Add leaves blocks when we have them
              // this.setBlock(chunk, leafX, leavesY, leafZ, 'leaves')
            }
          }
        }
      }
    }
  }

  private generateStructures(chunk: Chunk, chunkX: number, chunkZ: number): void {
    // Village generation
    const villageNoise = this.noise.noise2D(chunkX * 0.1, chunkZ * 0.1)
    if (villageNoise > 0.95) {
      // TODO: Generate village structures
      console.log(`Village generated at chunk ${chunkX}, ${chunkZ}`)
    }

    // Dungeon generation
    const dungeonNoise = this.noise.noise2D(chunkX * 0.2 + 1000, chunkZ * 0.2 + 1000)
    if (dungeonNoise > 0.98) {
      // TODO: Generate underground dungeons
      console.log(`Dungeon generated at chunk ${chunkX}, ${chunkZ}`)
    }
  }

  private isCave(worldX: number, y: number, worldZ: number): boolean {
    return this.noise.isCave(worldX, y, worldZ, this.config.caveScale)
  }

  private setBlock(chunk: Chunk, localX: number, y: number, localZ: number, blockType: string): void {
    // Convert local coordinates to world coordinates
    const worldX = chunk.x * this.config.chunkSize + localX
    const worldZ = chunk.z * this.config.chunkSize + localZ
    
    const key = getBlockKey(worldX, y, worldZ)
    chunk.blocks.set(key, blockType)
  }

  // Utility method to get biome at world position
  getBiomeAt(worldX: number, worldZ: number): BiomeData {
    const biomeId = this.noise.getBiome(worldX, worldZ, this.config.biomeScale)
    return BIOMES[biomeId] || BIOMES.plains
  }

  // Get terrain height at world position
  getHeightAt(worldX: number, worldZ: number): number {
    return this.noise.getTerrainHeight(worldX, worldZ, this.config.terrainScale)
  }
}