import { DEFAULT_WORLD_CONFIG } from './constants'
import type { Chunk, BiomeDefinition } from '../types/server'

export class WorldGenerator {
  private readonly SEED = Math.floor(Math.random() * 1000000)
  private readonly BIOMES: Record<string, BiomeDefinition> = {
    plains: {
      surface: 'grass',
      subsurface: 'dirt',
      treeChance: 0.01,
      villageChance: 0.05,
      temperature: 0.5,
      humidity: 0.5,
    },
    forest: {
      surface: 'grass',
      subsurface: 'dirt',
      treeChance: 0.1,
      villageChance: 0.02,
      temperature: 0.6,
      humidity: 0.7,
    },
    desert: {
      surface: 'sand',
      subsurface: 'sand',
      treeChance: 0.0,
      villageChance: 0.03,
      temperature: 0.9,
      humidity: 0.1,
    },
    mountains: {
      surface: 'stone',
      subsurface: 'stone',
      treeChance: 0.02,
      villageChance: 0.01,
      temperature: 0.3,
      humidity: 0.4,
    },
  }

  public generateChunk(chunkX: number, chunkZ: number): Chunk {
    const chunk: Chunk = {
      x: chunkX,
      z: chunkZ,
      blocks: new Map(),
      generated: true,
      modified: false,
    }

    // Generate terrain for this chunk
    this.generateTerrain(chunk)

    // Generate structures
    this.generateStructures(chunk)

    // Generate ores
    this.generateOres(chunk)

    return chunk
  }

  private generateTerrain(chunk: Chunk): void {
    const chunkSize = DEFAULT_WORLD_CONFIG.chunkSize
    const worldHeight = DEFAULT_WORLD_CONFIG.worldHeight

    for (let x = 0; x < chunkSize; x++) {
      for (let z = 0; z < chunkSize; z++) {
        const worldX = chunk.x * chunkSize + x
        const worldZ = chunk.z * chunkSize + z

        // Get biome for this position
        const biome = this.getBiome(worldX, worldZ)

        // Generate height map
        const height = this.getHeight(worldX, worldZ, biome)

        // Generate terrain layers
        for (let y = 0; y < worldHeight; y++) {
          const blockKey = `${worldX},${y},${worldZ}`
          let blockType = 'air'

          if (y === 0) {
            blockType = 'bedrock'
          } else if (y < height - 4) {
            blockType = 'stone'
          } else if (y < height - 1) {
            blockType = biome.subsurface
          } else if (y === height - 1) {
            blockType = biome.surface
          }

          if (blockType !== 'air') {
            chunk.blocks.set(blockKey, blockType)
          }
        }

        // Generate trees
        if (Math.random() < biome.treeChance) {
          this.generateTree(chunk, worldX, worldZ, height)
        }
      }
    }
  }

  private generateStructures(chunk: Chunk): void {
    const chunkSize = DEFAULT_WORLD_CONFIG.chunkSize
    const worldX = chunk.x * chunkSize
    const worldZ = chunk.z * chunkSize

    // Generate villages
    if (this.shouldGenerateStructure(worldX, worldZ, 0.01)) {
      this.generateVillage(chunk, worldX, worldZ)
    }

    // Generate caves
    this.generateCaves(chunk)
  }

  private generateOres(chunk: Chunk): void {
    const chunkSize = DEFAULT_WORLD_CONFIG.chunkSize
    const worldHeight = DEFAULT_WORLD_CONFIG.worldHeight

    for (let x = 0; x < chunkSize; x++) {
      for (let z = 0; z < chunkSize; z++) {
        for (let y = 0; y < worldHeight; y++) {
          const worldX = chunk.x * chunkSize + x
          const worldZ = chunk.z * chunkSize + z
          const blockKey = `${worldX},${y},${worldZ}`

          // Only generate ores in stone
          if (chunk.blocks.get(blockKey) === 'stone') {
            const oreType = this.getOreType(worldX, y, worldZ)
            if (oreType) {
              chunk.blocks.set(blockKey, oreType)
            }
          }
        }
      }
    }
  }

  private getBiome(x: number, z: number): BiomeDefinition {
    // Simple biome generation based on noise
    const temperature = this.noise(x * 0.01, z * 0.01)
    const humidity = this.noise(x * 0.01 + 1000, z * 0.01 + 1000)

    if (temperature > 0.7) {
      return this.BIOMES.desert
    } else if (temperature < 0.3) {
      return this.BIOMES.mountains
    } else if (humidity > 0.6) {
      return this.BIOMES.forest
    } else {
      return this.BIOMES.plains
    }
  }

  private getHeight(x: number, z: number, biome: BiomeDefinition): number {
    // Generate height using multiple noise layers
    const baseHeight = 64
    const mountainHeight = this.noise(x * 0.005, z * 0.005) * 32
    const detailHeight = this.noise(x * 0.02, z * 0.02) * 8

    let height = baseHeight + mountainHeight + detailHeight

    // Adjust height based on biome
    if (biome === this.BIOMES.mountains) {
      height += 20
    } else if (biome === this.BIOMES.desert) {
      height -= 10
    }

    return Math.floor(height)
  }

  private generateTree(chunk: Chunk, x: number, z: number, baseHeight: number): void {
    const treeHeight = 4 + Math.floor(Math.random() * 3) // 4-6 blocks tall

    // Generate trunk
    for (let y = baseHeight; y < baseHeight + treeHeight; y++) {
      const blockKey = `${x},${y},${z}`
      chunk.blocks.set(blockKey, 'wood')
    }

    // Generate leaves
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = 0; dy <= 3; dy++) {
          const leafX = x + dx
          const leafZ = z + dz
          const leafY = baseHeight + treeHeight - 1 + dy

          // Skip if outside chunk bounds
          const chunkSize = DEFAULT_WORLD_CONFIG.chunkSize
          const localX = leafX - chunk.x * chunkSize
          const localZ = leafZ - chunk.z * chunkSize
          if (localX < 0 || localX >= chunkSize || localZ < 0 || localZ >= chunkSize) {
            continue
          }

          // Simple leaf pattern
          const distance = Math.sqrt(dx * dx + dz * dz)
          if (distance <= 2 && (dy < 2 || distance <= 1)) {
            const blockKey = `${leafX},${leafY},${leafZ}`
            if (!chunk.blocks.has(blockKey)) {
              chunk.blocks.set(blockKey, 'leaves')
            }
          }
        }
      }
    }
  }

  private generateVillage(chunk: Chunk, x: number, z: number): void {
    // Simple house generation
    const houseSize = 5
    const houseHeight = 4

    for (let dx = 0; dx < houseSize; dx++) {
      for (let dz = 0; dz < houseSize; dz++) {
        for (let dy = 0; dy < houseHeight; dy++) {
          const blockX = x + dx
          const blockZ = z + dz
          const blockY = dy

          // Skip if outside chunk bounds
          const chunkSize = DEFAULT_WORLD_CONFIG.chunkSize
          const localX = blockX - chunk.x * chunkSize
          const localZ = blockZ - chunk.z * chunkSize
          if (localX < 0 || localX >= chunkSize || localZ < 0 || localZ >= chunkSize) {
            continue
          }

          const blockKey = `${blockX},${blockY},${blockZ}`

          if (dy === 0) {
            chunk.blocks.set(blockKey, 'stone') // Foundation
          } else if (dy === houseHeight - 1) {
            chunk.blocks.set(blockKey, 'wood') // Roof
          } else if (dx === 0 || dx === houseSize - 1 || dz === 0 || dz === houseSize - 1) {
            chunk.blocks.set(blockKey, 'wood') // Walls
          } else {
            chunk.blocks.set(blockKey, 'air') // Interior
          }
        }
      }
    }
  }

  private generateCaves(chunk: Chunk): void {
    const chunkSize = DEFAULT_WORLD_CONFIG.chunkSize
    const worldHeight = DEFAULT_WORLD_CONFIG.worldHeight

    // Generate cave systems using 3D noise
    for (let x = 0; x < chunkSize; x++) {
      for (let z = 0; z < chunkSize; z++) {
        for (let y = 10; y < worldHeight - 10; y++) {
          const worldX = chunk.x * chunkSize + x
          const worldZ = chunk.z * chunkSize + z
          const blockKey = `${worldX},${y},${worldZ}`

          // Only create caves in stone
          if (chunk.blocks.get(blockKey) === 'stone') {
            const caveNoise = this.noise(worldX * 0.05, y * 0.05, worldZ * 0.05)
            if (caveNoise > 0.6) {
              chunk.blocks.set(blockKey, 'air')
            }
          }
        }
      }
    }
  }

  private getOreType(x: number, y: number, z: number): string | null {
    const oreNoise = this.noise(x * 0.1, y * 0.1, z * 0.1)

    if (oreNoise > 0.95) {
      return 'diamond_ore'
    } else if (oreNoise > 0.9) {
      return 'iron_ore'
    } else if (oreNoise > 0.85) {
      return 'coal_ore'
    } else if (oreNoise > 0.8) {
      return 'gold_ore'
    }

    return null
  }

  private shouldGenerateStructure(x: number, z: number, chance: number): boolean {
    // Use deterministic random based on position and seed
    const random = this.noise(x * 0.1, z * 0.1)
    return random < chance
  }

  private noise(x: number, y: number, z?: number): number {
    // Simple hash-based noise function
    let hash = this.SEED
    hash = (hash << 5) + hash + Math.floor(x)
    hash = (hash << 5) + hash + Math.floor(y)
    if (z !== undefined) {
      hash = (hash << 5) + hash + Math.floor(z)
    }

    // Convert to 0-1 range
    return Math.abs(hash) / 2147483647
  }
}
