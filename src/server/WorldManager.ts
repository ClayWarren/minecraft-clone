import { Chunk, WorldGenerationConfig, worldToChunk, getChunkKey } from '../types/world'
import { BLOCK_TYPES, BlockType } from '../types/blocks'
import * as fs from 'fs'
import * as path from 'path'

export class WorldManager {
  private chunks: Map<string, Chunk> = new Map()
  private loadedChunks: Set<string> = new Set()
  private readonly chunkSize: number
  private readonly worldHeight: number

  constructor(config: WorldGenerationConfig) {
    this.chunkSize = config.chunkSize
    this.worldHeight = config.worldHeight
  }

  getChunk(chunkX: number, chunkZ: number): Chunk | undefined {
    const chunkKey = getChunkKey(chunkX, chunkZ)
    return this.chunks.get(chunkKey)
  }

  getBlockAt(x: number, y: number, z: number): string {
    const chunkX = worldToChunk(x, this.chunkSize)
    const chunkZ = worldToChunk(z, this.chunkSize)
    const chunkKey = getChunkKey(chunkX, chunkZ)
    const chunk = this.chunks.get(chunkKey)
    if (!chunk) return 'air'
    const blockKey = `${x},${y},${z}`
    return chunk.blocks.get(blockKey) || 'air'
  }

  setBlockAt(x: number, y: number, z: number, blockType: string): void {
    const chunkX = worldToChunk(x, this.chunkSize)
    const chunkZ = worldToChunk(z, this.chunkSize)
    const chunkKey = getChunkKey(chunkX, chunkZ)
    let chunk = this.chunks.get(chunkKey)
    if (!chunk) {
      chunk = {
        x: chunkX,
        z: chunkZ,
        blocks: new Map(),
        generated: true,
        loaded: true,
        dirty: false,
        entities: []
      }
      this.chunks.set(chunkKey, chunk)
      this.loadedChunks.add(chunkKey)
    }
    const blockKey = `${x},${y},${z}`
    chunk.blocks.set(blockKey, blockType)
    chunk.dirty = true
  }

  getGroundHeight(x: number, z: number): number {
    for (let y = this.worldHeight - 1; y >= 0; y--) {
      const blockType = this.getBlockAt(Math.floor(x), y, Math.floor(z))
      if (blockType !== 'air') {
        return y
      }
    }
    return 0
  }

  loadWorld(): void {
    try {
      const worldPath = path.join(process.cwd(), 'world.json')
      if (fs.existsSync(worldPath)) {
        const worldData = JSON.parse(fs.readFileSync(worldPath, 'utf8'))
        this.chunks.clear()
        this.loadedChunks.clear()
        if (worldData.blocks) {
          worldData.blocks.forEach(([key, blockType]: [string, string]) => {
            const [x, y, z] = key.split(',').map(Number)
            const chunkX = worldToChunk(x, this.chunkSize)
            const chunkZ = worldToChunk(z, this.chunkSize)
            const chunkKey = getChunkKey(chunkX, chunkZ)
            let chunk = this.chunks.get(chunkKey)
            if (!chunk) {
              chunk = {
                x: chunkX,
                z: chunkZ,
                blocks: new Map(),
                generated: true,
                loaded: true,
                dirty: false,
                entities: []
              }
              this.chunks.set(chunkKey, chunk)
              this.loadedChunks.add(chunkKey)
            }
            chunk.blocks.set(key, blockType)
          })
        }
        console.log('🌍 World loaded successfully')
      }
    } catch (error) {
      console.error('Error loading world:', error)
    }
  }

  saveWorld(): void {
    try {
      const blocksToSave: [string, string][] = []
      this.chunks.forEach(chunk => {
        if (chunk.dirty) {
          chunk.blocks.forEach((blockType, key) => {
            blocksToSave.push([key, blockType])
          })
          chunk.dirty = false
        }
      })
      if (blocksToSave.length > 0) {
        const worldData = {
          blocks: blocksToSave,
          timestamp: Date.now()
        }
        const worldPath = path.join(process.cwd(), 'world.json')
        fs.writeFileSync(worldPath, JSON.stringify(worldData))
        console.log(`🌍 World saved successfully. Saved ${blocksToSave.length} blocks from dirty chunks.`)
      } else {
        console.log('🌍 No dirty chunks to save.')
      }
    } catch (error) {
      console.error('Error saving world:', error)
    }
  }

  getAllChunks(): Map<string, Chunk> {
    return this.chunks
  }
}
