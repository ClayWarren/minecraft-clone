import * as fs from 'fs'
import * as path from 'path'
import { DEFAULT_WORLD_CONFIG } from './constants'
import type { Chunk } from '../types/server'

export class WorldService {
  private chunks: Map<string, Chunk> = new Map()
  private loadedChunks: Set<string> = new Set()
  private chunkSize: number = DEFAULT_WORLD_CONFIG.chunkSize

  constructor() {}

  public loadWorld(): void {
    try {
      const worldPath = path.join(process.cwd(), 'world.json')
      if (fs.existsSync(worldPath)) {
        const worldData = JSON.parse(fs.readFileSync(worldPath, 'utf8'))
        this.chunks.clear()
        this.loadedChunks.clear()
        if (worldData.blocks) {
          worldData.blocks.forEach(([key, blockType]: [string, string]) => {
            const [x, _y, z] = key.split(',').map(Number)
            const chunkX = Math.floor(x / this.chunkSize)
            const chunkZ = Math.floor(z / this.chunkSize)
            const chunkKey = `${chunkX},${chunkZ}`
            let chunk = this.chunks.get(chunkKey)
            if (!chunk) {
              chunk = {
                x: chunkX,
                z: chunkZ,
                blocks: new Map(),
                generated: true,
                modified: false,
                loaded: true,
                dirty: false,
                entities: [],
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

  public saveWorld(): void {
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
          timestamp: Date.now(),
        }
        const worldPath = path.join(process.cwd(), 'world.json')
        fs.writeFileSync(worldPath, JSON.stringify(worldData))
        console.log(
          `🌍 World saved successfully. Saved ${blocksToSave.length} blocks from dirty chunks.`
        )
      } else {
        console.log('🌍 No dirty chunks to save.')
      }
    } catch (error) {
      console.error('Error saving world:', error)
    }
  }

  public getChunk(chunkX: number, chunkZ: number): Chunk | null {
    const chunkKey = `${chunkX},${chunkZ}`
    return this.chunks.get(chunkKey) || null
  }

  public getAllChunks(): Map<string, Chunk> {
    return this.chunks
  }

  // Add more world management methods as needed
}
