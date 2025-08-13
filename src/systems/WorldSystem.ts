import * as THREE from 'three'
import { System } from '@/core/System'
import { Entity } from '@/types'
import { TransformComponent } from '@/components'
import { WorldGenerator } from '@/world/WorldGenerator'
import { Chunk, WorldGenerationConfig, getChunkKey, worldToChunk } from '@/types/world'
import { getBlockType } from '@/types/blocks'

export class WorldSystem extends System {
  readonly name = 'world'

  private worldGenerator: WorldGenerator
  private scene: THREE.Scene
  private chunks: Map<string, Chunk> = new Map()
  private chunkMeshes: Map<string, THREE.Group> = new Map()
  private config: WorldGenerationConfig
  private renderDistance = 4 // Chunks to render around player
  private lastPlayerChunk = { x: Number.MAX_VALUE, z: Number.MAX_VALUE }

  constructor(scene: THREE.Scene, seed = 12345) {
    super()
    this.scene = scene

    this.config = {
      chunkSize: 16,
      worldHeight: 128,
      seaLevel: 64,
      seed,
      biomeScale: 0.005,
      terrainScale: 0.01,
      caveScale: 0.02,
      oreScale: 0.1,
    }

    this.worldGenerator = new WorldGenerator(this.config)
  }

  update(_deltaTime: number, entities: Entity[]): void {
    // Find player entity
    const player = entities.find(e => e.hasComponent('player'))
    if (!player) return

    const playerTransform = player.getComponent<TransformComponent>('transform')
    if (!playerTransform) return

    // Calculate player's chunk position
    const playerChunkX = worldToChunk(playerTransform.position.x, this.config.chunkSize)
    const playerChunkZ = worldToChunk(playerTransform.position.z, this.config.chunkSize)

    // Check if player moved to a new chunk
    if (playerChunkX !== this.lastPlayerChunk.x || playerChunkZ !== this.lastPlayerChunk.z) {
      this.lastPlayerChunk = { x: playerChunkX, z: playerChunkZ }
      this.updateChunks(playerChunkX, playerChunkZ)
    }
  }

  private updateChunks(playerChunkX: number, playerChunkZ: number): void {
    const chunksToLoad: Array<{ x: number; z: number }> = []
    const chunksToUnload: string[] = []

    // Find chunks that should be loaded
    for (let x = playerChunkX - this.renderDistance; x <= playerChunkX + this.renderDistance; x++) {
      for (
        let z = playerChunkZ - this.renderDistance;
        z <= playerChunkZ + this.renderDistance;
        z++
      ) {
        const chunkKey = getChunkKey(x, z)
        if (!this.chunks.has(chunkKey)) {
          chunksToLoad.push({ x, z })
        }
      }
    }

    // Find chunks that should be unloaded
    for (const [chunkKey, chunk] of this.chunks) {
      const dx = Math.abs(chunk.x - playerChunkX)
      const dz = Math.abs(chunk.z - playerChunkZ)

      if (dx > this.renderDistance || dz > this.renderDistance) {
        chunksToUnload.push(chunkKey)
      }
    }

    // Load new chunks
    for (const { x, z } of chunksToLoad) {
      this.loadChunk(x, z)
    }

    // Unload distant chunks
    for (const chunkKey of chunksToUnload) {
      this.unloadChunk(chunkKey)
    }

    console.log(
      `Loaded ${chunksToLoad.length} chunks, unloaded ${chunksToUnload.length} chunks around player chunk (${playerChunkX}, ${playerChunkZ})`
    )
  }

  private loadChunk(chunkX: number, chunkZ: number): void {
    const chunkKey = getChunkKey(chunkX, chunkZ)

    if (this.chunks.has(chunkKey)) return

    // Generate the chunk
    const chunk = this.worldGenerator.generateChunk(chunkX, chunkZ)
    this.chunks.set(chunkKey, chunk)

    // Create mesh for the chunk
    this.createChunkMesh(chunk)

    // Update world component if it exists
    this.updateWorldComponent(chunk)
  }

  private unloadChunk(chunkKey: string): void {
    const chunk = this.chunks.get(chunkKey)
    if (!chunk) return

    // Remove chunk mesh from scene
    const chunkMesh = this.chunkMeshes.get(chunkKey)
    if (chunkMesh) {
      this.scene.remove(chunkMesh)
      this.disposeChunkMesh(chunkMesh)
      this.chunkMeshes.delete(chunkKey)
    }

    // Remove chunk data
    this.chunks.delete(chunkKey)
  }

  private createChunkMesh(chunk: Chunk): void {
    const chunkKey = getChunkKey(chunk.x, chunk.z)
    const chunkGroup = new THREE.Group()

    // Create individual block meshes for now (will optimize later with merged geometry)
    for (const [blockKey, blockType] of chunk.blocks) {
      const [x, y, z] = blockKey.split(',').map(Number)
      const blockData = getBlockType(blockType)

      if (!blockData || blockData.transparent) continue

      // Check if block is exposed (has at least one face visible)
      if (this.isBlockExposed(x, y, z, chunk)) {
        const blockMesh = this.createBlockMesh(x, y, z, blockType)
        if (blockMesh) {
          chunkGroup.add(blockMesh)
        }
      }
    }

    chunkGroup.position.set(0, 0, 0) // Blocks are already positioned correctly
    this.scene.add(chunkGroup)
    this.chunkMeshes.set(chunkKey, chunkGroup)
  }

  private createBlockMesh(x: number, y: number, z: number, blockType: string): THREE.Mesh | null {
    const blockData = getBlockType(blockType)
    if (!blockData) return null

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshLambertMaterial({ color: blockData.color })
    const mesh = new THREE.Mesh(geometry, material)

    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.blockPosition = { x, y, z }
    mesh.userData.blockType = blockType

    return mesh
  }

  private isBlockExposed(x: number, y: number, z: number, _chunk: Chunk): boolean {
    // Check all 6 adjacent positions
    const adjacentPositions = [
      { x: x + 1, y, z },
      { x: x - 1, y, z },
      { x, y: y + 1, z },
      { x, y: y - 1, z },
      { x, y, z: z + 1 },
      { x, y, z: z - 1 },
    ]

    for (const pos of adjacentPositions) {
      const adjacentBlockType = this.getBlockAt(pos.x, pos.y, pos.z)
      const adjacentBlockData = getBlockType(adjacentBlockType)

      // If adjacent block is air or transparent, this block is exposed
      if (!adjacentBlockData || adjacentBlockData.transparent) {
        return true
      }
    }

    return false
  }

  private getBlockAt(x: number, y: number, z: number): string {
    // Determine which chunk this block belongs to
    const chunkX = worldToChunk(x, this.config.chunkSize)
    const chunkZ = worldToChunk(z, this.config.chunkSize)
    const chunkKey = getChunkKey(chunkX, chunkZ)

    const chunk = this.chunks.get(chunkKey)
    if (!chunk) return 'air'

    const blockKey = `${x},${y},${z}`
    return chunk.blocks.get(blockKey) || 'air'
  }

  private updateWorldComponent(chunk: Chunk): void {
    // This will be used to sync with the BlockSystem
    // For now, we'll just log the chunk generation
    console.log(`Generated chunk (${chunk.x}, ${chunk.z}) with ${chunk.blocks.size} blocks`)
  }

  private disposeChunkMesh(chunkGroup: THREE.Group): void {
    chunkGroup.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
  }

  // Public methods for other systems to use
  public getChunkAt(chunkX: number, chunkZ: number): Chunk | undefined {
    const chunkKey = getChunkKey(chunkX, chunkZ)
    return this.chunks.get(chunkKey)
  }

  public getBlockAtPosition(x: number, y: number, z: number): string {
    return this.getBlockAt(x, y, z)
  }

  public setBlockAtPosition(x: number, y: number, z: number, blockType: string): void {
    const chunkX = worldToChunk(x, this.config.chunkSize)
    const chunkZ = worldToChunk(z, this.config.chunkSize)
    const chunkKey = getChunkKey(chunkX, chunkZ)

    const chunk = this.chunks.get(chunkKey)
    if (!chunk) return

    const blockKey = `${x},${y},${z}`

    if (blockType === 'air') {
      chunk.blocks.delete(blockKey)
    } else {
      chunk.blocks.set(blockKey, blockType)
    }

    chunk.dirty = true

    // Rebuild chunk mesh
    this.rebuildChunkMesh(chunkKey)
  }

  private rebuildChunkMesh(chunkKey: string): void {
    const chunk = this.chunks.get(chunkKey)
    if (!chunk) return

    // Remove old mesh
    const oldMesh = this.chunkMeshes.get(chunkKey)
    if (oldMesh) {
      this.scene.remove(oldMesh)
      this.disposeChunkMesh(oldMesh)
      this.chunkMeshes.delete(chunkKey)
    }

    // Create new mesh
    this.createChunkMesh(chunk)
  }

  cleanup(): void {
    // Clean up all chunks and meshes
    for (const [_chunkKey, chunkMesh] of this.chunkMeshes) {
      this.scene.remove(chunkMesh)
      this.disposeChunkMesh(chunkMesh)
    }

    this.chunks.clear()
    this.chunkMeshes.clear()
  }
}
