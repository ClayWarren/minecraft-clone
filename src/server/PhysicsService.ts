import { DEFAULT_WORLD_CONFIG } from './constants'
import type { Player, ServerPlayer, Chunk } from '../types/server'

export class PhysicsService {
  private readonly GRAVITY = 0.98
  private readonly FRICTION = 0.8
  private readonly PLAYER_HEIGHT = 1.8

  public updatePlayerPhysics(
    players: Player[],
    worldService: { getAllChunks: () => Map<string, unknown> }
  ): void {
    players.forEach(player => {
      // Only operate on ServerPlayer (has velocity, etc.)
      const serverPlayer = player as ServerPlayer
      if (!serverPlayer) return

      // Apply gravity
      if (!serverPlayer.isGrounded) {
        serverPlayer.velocity.y -= this.GRAVITY
      }

      // Simple ground check
      const groundY = this.getGroundHeight(
        serverPlayer.position.x,
        serverPlayer.position.z,
        worldService.getAllChunks()
      )
      if (serverPlayer.position.y <= groundY + this.PLAYER_HEIGHT) {
        serverPlayer.position.y = groundY + this.PLAYER_HEIGHT
        serverPlayer.velocity.y = 0
        serverPlayer.isGrounded = true
      } else {
        serverPlayer.isGrounded = false
      }

      // Apply velocity
      serverPlayer.position.x += serverPlayer.velocity.x
      serverPlayer.position.y += serverPlayer.velocity.y
      serverPlayer.position.z += serverPlayer.velocity.z

      // Apply friction
      serverPlayer.velocity.x *= this.FRICTION
      serverPlayer.velocity.z *= this.FRICTION

      // Clamp velocity to prevent excessive speeds
      this.clampVelocity(serverPlayer.velocity)
    })
  }

  public applyForce(player: ServerPlayer, force: { x: number; y: number; z: number }): void {
    player.velocity.x += force.x
    player.velocity.y += force.y
    player.velocity.z += force.z

    this.clampVelocity(player.velocity)
  }

  public checkCollision(
    position: { x: number; y: number; z: number },
    worldService: { getAllChunks: () => Map<string, unknown> }
  ): boolean {
    // Check if position is inside a block
    const blockAtPosition = this.getBlockAt(
      position.x,
      position.y,
      position.z,
      worldService.getAllChunks()
    )
    return blockAtPosition !== 'air'
  }

  public findSafePosition(
    startPosition: { x: number; y: number; z: number },
    worldService: { getAllChunks: () => Map<string, unknown> }
  ): { x: number; y: number; z: number } {
    const position = { ...startPosition }

    // Try to find a safe position by moving up
    for (let y = startPosition.y; y < DEFAULT_WORLD_CONFIG.worldHeight; y++) {
      position.y = y
      if (!this.checkCollision(position, worldService)) {
        return position
      }
    }

    // If no safe position found above, try below
    for (let y = startPosition.y; y >= 0; y--) {
      position.y = y
      if (!this.checkCollision(position, worldService)) {
        return position
      }
    }

    // If still no safe position, return original position
    return startPosition
  }

  public getGroundHeight(x: number, z: number, chunks: Map<string, Chunk>): number {
    // Find the highest block at this position using chunk/block logic
    for (let y = DEFAULT_WORLD_CONFIG.worldHeight - 1; y >= 0; y--) {
      const blockKey = `${Math.floor(x)},${y},${Math.floor(z)}`
      const chunkX = Math.floor(Math.floor(x) / DEFAULT_WORLD_CONFIG.chunkSize)
      const chunkZ = Math.floor(Math.floor(z) / DEFAULT_WORLD_CONFIG.chunkSize)
      const chunk = chunks.get(`${chunkX},${chunkZ}`)
      if (chunk && chunk.blocks.has(blockKey)) {
        return y
      }
    }
    return 0
  }

  public getBlockAt(x: number, y: number, z: number, chunks: Map<string, Chunk>): string {
    const chunkX = Math.floor(x / DEFAULT_WORLD_CONFIG.chunkSize)
    const chunkZ = Math.floor(z / DEFAULT_WORLD_CONFIG.chunkSize)
    const chunk = chunks.get(`${chunkX},${chunkZ}`)

    if (!chunk) return 'air' // If chunk not loaded, assume air

    const blockKey = `${x},${y},${z}`
    return chunk.blocks.get(blockKey) || 'air'
  }

  public calculateDistance(
    pos1: { x: number; y: number; z: number },
    pos2: { x: number; y: number; z: number }
  ): number {
    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    const dz = pos1.z - pos2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  public isWithinRange(
    pos1: { x: number; y: number; z: number },
    pos2: { x: number; y: number; z: number },
    range: number
  ): boolean {
    return this.calculateDistance(pos1, pos2) <= range
  }

  private clampVelocity(velocity: { x: number; y: number; z: number }): void {
    const maxSpeed = 10.0 // Maximum speed in blocks per second

    // Clamp individual components
    velocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, velocity.x))
    velocity.y = Math.max(-maxSpeed, Math.min(maxSpeed, velocity.y))
    velocity.z = Math.max(-maxSpeed, Math.min(maxSpeed, velocity.z))

    // Clamp overall speed
    const speed = Math.sqrt(
      velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z
    )
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed
      velocity.x *= scale
      velocity.y *= scale
      velocity.z *= scale
    }
  }

  public raycast(
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    maxDistance: number,
    worldService: { getAllChunks: () => Map<string, unknown> }
  ): { hit: boolean; position?: { x: number; y: number; z: number }; blockType?: string } {
    const step = 0.1 // Step size for raycast
    const currentPos = { ...origin }

    for (let distance = 0; distance < maxDistance; distance += step) {
      currentPos.x = origin.x + direction.x * distance
      currentPos.y = origin.y + direction.y * distance
      currentPos.z = origin.z + direction.z * distance

      const blockType = this.getBlockAt(
        currentPos.x,
        currentPos.y,
        currentPos.z,
        worldService.getAllChunks()
      )
      if (blockType !== 'air') {
        return {
          hit: true,
          position: currentPos,
          blockType,
        }
      }
    }

    return { hit: false }
  }
}
