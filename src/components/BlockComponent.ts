import { Component } from '@/types'
import { BlockPosition } from '@/types/blocks'

export class BlockComponent implements Component {
  readonly type = 'block'
  
  public blockType: string
  public position: BlockPosition
  public metadata: any
  public isBreaking: boolean = false
  public breakProgress: number = 0
  
  constructor(blockType: string, position: BlockPosition, metadata: any = {}) {
    this.blockType = blockType
    this.position = position
    this.metadata = metadata
  }
  
  getBlockKey(): string {
    return `${this.position.x},${this.position.y},${this.position.z}`
  }
}

export class WorldComponent implements Component {
  readonly type = 'world'
  
  public blocks: Map<string, string> = new Map()
  public loadedChunks: Set<string> = new Set()
  public chunkSize: number = 16
  
  constructor() {}
  
  getBlockAt(position: BlockPosition): string {
    const key = `${position.x},${position.y},${position.z}`
    return this.blocks.get(key) || 'air'
  }
  
  setBlockAt(position: BlockPosition, blockType: string): void {
    const key = `${position.x},${position.y},${position.z}`
    if (blockType === 'air') {
      this.blocks.delete(key)
    } else {
      this.blocks.set(key, blockType)
    }
  }
  
  getChunkKey(chunkX: number, chunkZ: number): string {
    return `${chunkX},${chunkZ}`
  }
  
  worldToChunk(worldPos: number): number {
    return Math.floor(worldPos / this.chunkSize)
  }
  
  isChunkLoaded(chunkX: number, chunkZ: number): boolean {
    return this.loadedChunks.has(this.getChunkKey(chunkX, chunkZ))
  }
}