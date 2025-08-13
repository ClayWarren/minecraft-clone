import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PhysicsService } from '../../src/server/PhysicsService'
import type { Player, ServerPlayer, Chunk } from '../../src/types/server'

describe('PhysicsService', () => {
  let physicsService: PhysicsService
  let mockPlayer: ServerPlayer
  let mockChunks: Map<string, Chunk>
  let mockWorldService: any

  beforeEach(() => {
    physicsService = new PhysicsService()

    // Create a mock player
    mockPlayer = {
      id: 'test-player',
      username: 'TestPlayer',
      position: { x: 0, y: 70, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 20,
      inventory: [],
      isFlying: false,
      isGrounded: true,
      ws: {} as any,
      velocity: { x: 0, y: 0, z: 0 },
      hunger: 20,
      lastUpdate: Date.now(),
    }

    // Create mock chunks
    mockChunks = new Map()
    const mockChunk: Chunk = {
      x: 0,
      z: 0,
      blocks: new Map(),
      generated: true,
      modified: false,
    }

    // Add ground blocks
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        mockChunk.blocks.set(`${x},64,${z}`, 'grass')
        mockChunk.blocks.set(`${x},63,${z}`, 'dirt')
      }
    }

    mockChunks.set('0,0', mockChunk)

    // Create mock world service
    mockWorldService = {
      getAllChunks: () => mockChunks,
    }
  })

  describe('updatePlayerPhysics', () => {
    it('should apply gravity to airborne players', () => {
      mockPlayer.isGrounded = false
      mockPlayer.velocity.y = 0

      physicsService.updatePlayerPhysics([mockPlayer], mockWorldService)

      // Should have applied gravity (negative velocity)
      expect(mockPlayer.velocity.y).toBeLessThan(0)
    })

    it('should not apply gravity to grounded players', () => {
      mockPlayer.isGrounded = true
      mockPlayer.velocity.y = 0

      physicsService.updatePlayerPhysics([mockPlayer], mockWorldService)

      // Should not have applied gravity
      expect(mockPlayer.velocity.y).toBe(0)
    })

    it('should update player position based on velocity', () => {
      const initialPosition = { ...mockPlayer.position }
      mockPlayer.velocity.x = 1
      mockPlayer.velocity.z = 1

      physicsService.updatePlayerPhysics([mockPlayer], mockWorldService)

      expect(mockPlayer.position.x).toBeGreaterThan(initialPosition.x)
      expect(mockPlayer.position.z).toBeGreaterThan(initialPosition.z)
    })

    it('should apply friction to horizontal velocity', () => {
      mockPlayer.velocity.x = 10
      mockPlayer.velocity.z = 10

      physicsService.updatePlayerPhysics([mockPlayer], mockWorldService)

      // Should have reduced velocity due to friction
      expect(mockPlayer.velocity.x).toBeLessThan(10)
      expect(mockPlayer.velocity.z).toBeLessThan(10)
    })

    it('should set player as grounded when touching ground', () => {
      mockPlayer.isGrounded = false
      mockPlayer.position.y = 65.8 // Just above ground level

      physicsService.updatePlayerPhysics([mockPlayer], mockWorldService)

      expect(mockPlayer.isGrounded).toBe(true)
      expect(mockPlayer.velocity.y).toBe(0)
    })

    it('should keep player above ground level', () => {
      mockPlayer.position.y = 60 // Below ground

      physicsService.updatePlayerPhysics([mockPlayer], mockWorldService)

      // Should be positioned at ground level + player height
      expect(mockPlayer.position.y).toBe(65.8) // 64 + 1.8
    })
  })

  describe('applyForce', () => {
    it('should add force to player velocity', () => {
      const initialVelocity = { ...mockPlayer.velocity }
      const force = { x: 5, y: 2, z: 3 }

      physicsService.applyForce(mockPlayer, force)

      expect(mockPlayer.velocity.x).toBe(initialVelocity.x + force.x)
      expect(mockPlayer.velocity.y).toBe(initialVelocity.y + force.y)
      expect(mockPlayer.velocity.z).toBe(initialVelocity.z + force.z)
    })

    it('should clamp velocity to prevent excessive speeds', () => {
      const force = { x: 100, y: 100, z: 100 }

      physicsService.applyForce(mockPlayer, force)

      // Should be clamped to max speed
      const speed = Math.sqrt(
        mockPlayer.velocity.x ** 2 + mockPlayer.velocity.y ** 2 + mockPlayer.velocity.z ** 2
      )
      expect(speed).toBeLessThanOrEqual(10) // Max speed
    })
  })

  describe('checkCollision', () => {
    it('should detect collision with solid blocks', () => {
      const position = { x: 5, y: 64, z: 5 } // Inside a grass block

      const hasCollision = physicsService.checkCollision(position, mockWorldService)

      expect(hasCollision).toBe(true)
    })

    it('should not detect collision with air', () => {
      const position = { x: 5, y: 70, z: 5 } // Above ground

      const hasCollision = physicsService.checkCollision(position, mockWorldService)

      expect(hasCollision).toBe(false)
    })

    it('should handle unloaded chunks as air', () => {
      const position = { x: 100, y: 64, z: 100 } // Outside loaded chunks

      const hasCollision = physicsService.checkCollision(position, mockWorldService)

      expect(hasCollision).toBe(false)
    })
  })

  describe('findSafePosition', () => {
    it('should find safe position above solid blocks', () => {
      const startPosition = { x: 5, y: 64, z: 5 } // Inside a block

      const safePosition = physicsService.findSafePosition(startPosition, mockWorldService)

      expect(safePosition.y).toBeGreaterThan(64)
      expect(safePosition.x).toBe(startPosition.x)
      expect(safePosition.z).toBe(startPosition.z)
    })

    it('should return original position if no safe position found', () => {
      const startPosition = { x: 5, y: 70, z: 5 } // Already safe

      const safePosition = physicsService.findSafePosition(startPosition, mockWorldService)

      expect(safePosition).toEqual(startPosition)
    })
  })

  describe('getGroundHeight', () => {
    it('should find the highest block at a position', () => {
      const groundY = physicsService.getGroundHeight(5, 5, mockChunks)

      expect(groundY).toBe(64) // Based on our mock chunk setup
    })

    it('should return 0 for positions with no blocks', () => {
      const groundY = physicsService.getGroundHeight(100, 100, mockChunks)

      expect(groundY).toBe(0)
    })
  })

  describe('getBlockAt', () => {
    it('should return block type at position', () => {
      const blockType = physicsService.getBlockAt(5, 64, 5, mockChunks)

      expect(blockType).toBe('grass')
    })

    it('should return air for empty positions', () => {
      const blockType = physicsService.getBlockAt(5, 70, 5, mockChunks)

      expect(blockType).toBe('air')
    })

    it('should return air for unloaded chunks', () => {
      const blockType = physicsService.getBlockAt(100, 64, 100, mockChunks)

      expect(blockType).toBe('air')
    })
  })

  describe('calculateDistance', () => {
    it('should calculate correct distance between positions', () => {
      const pos1 = { x: 0, y: 0, z: 0 }
      const pos2 = { x: 3, y: 4, z: 0 }

      const distance = physicsService.calculateDistance(pos1, pos2)

      expect(distance).toBe(5) // 3-4-5 triangle
    })

    it('should return 0 for same positions', () => {
      const pos1 = { x: 5, y: 10, z: 15 }
      const pos2 = { x: 5, y: 10, z: 15 }

      const distance = physicsService.calculateDistance(pos1, pos2)

      expect(distance).toBe(0)
    })
  })

  describe('isWithinRange', () => {
    it('should return true for positions within range', () => {
      const pos1 = { x: 0, y: 0, z: 0 }
      const pos2 = { x: 3, y: 4, z: 0 }
      const range = 6

      const withinRange = physicsService.isWithinRange(pos1, pos2, range)

      expect(withinRange).toBe(true)
    })

    it('should return false for positions outside range', () => {
      const pos1 = { x: 0, y: 0, z: 0 }
      const pos2 = { x: 10, y: 0, z: 0 }
      const range = 5

      const withinRange = physicsService.isWithinRange(pos1, pos2, range)

      expect(withinRange).toBe(false)
    })

    it('should return true for positions exactly at range', () => {
      const pos1 = { x: 0, y: 0, z: 0 }
      const pos2 = { x: 5, y: 0, z: 0 }
      const range = 5

      const withinRange = physicsService.isWithinRange(pos1, pos2, range)

      expect(withinRange).toBe(true)
    })
  })

  describe('raycast', () => {
    it('should detect collision with blocks', () => {
      const origin = { x: 5, y: 70, z: 5 }
      const direction = { x: 0, y: -1, z: 0 } // Down
      const maxDistance = 10

      const result = physicsService.raycast(origin, direction, maxDistance, mockWorldService)

      expect(result.hit).toBe(true)
      expect(result.blockType).toBe('grass')
      expect(result.position).toBeDefined()
    })

    it('should not detect collision when no blocks in path', () => {
      const origin = { x: 5, y: 70, z: 5 }
      const direction = { x: 0, y: 1, z: 0 } // Up
      const maxDistance = 10

      const result = physicsService.raycast(origin, direction, maxDistance, mockWorldService)

      expect(result.hit).toBe(false)
    })

    it('should respect max distance', () => {
      const origin = { x: 5, y: 70, z: 5 }
      const direction = { x: 0, y: -1, z: 0 } // Down
      const maxDistance = 1 // Very short distance

      const result = physicsService.raycast(origin, direction, maxDistance, mockWorldService)

      // Should not hit ground because it's too far
      expect(result.hit).toBe(false)
    })
  })
})
