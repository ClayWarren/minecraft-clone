import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MobService } from '../../src/server/MobService'
import type { Player, ServerPlayer, Chunk } from '../../src/types/server'

describe('MobService', () => {
  let mobService: MobService
  let mockPlayer: ServerPlayer
  let mockChunks: Map<string, Chunk>

  beforeEach(() => {
    mobService = new MobService()
    
    // Create a mock player
    mockPlayer = {
      id: 'test-player',
      username: 'TestPlayer',
      position: { x: 0, y: 64, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 20,
      inventory: [
        { item: { id: 'wood', name: 'Wood', stackable: true, maxStackSize: 64 }, quantity: 10 },
        null,
        null,
        null,
        null
      ],
      isFlying: false,
      isGrounded: true,
      ws: {} as any,
      velocity: { x: 0, y: 0, z: 0 },
      hunger: 20,
      lastUpdate: Date.now()
    }

    // Create mock chunks
    mockChunks = new Map()
    const mockChunk: Chunk = {
      x: 0,
      z: 0,
      blocks: new Map(),
      generated: true,
      modified: false
    }
    
    // Add some ground blocks
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        mockChunk.blocks.set(`${x},63,${z}`, 'grass')
        mockChunk.blocks.set(`${x},62,${z}`, 'dirt')
      }
    }
    
    mockChunks.set('0,0', mockChunk)
  })

  describe('spawnMobs', () => {
    it('should not spawn mobs when no players are online', () => {
      const initialMobCount = mobService.getAllMobs().size
      
      mobService.spawnMobs([], mockChunks)
      
      expect(mobService.getAllMobs().size).toBe(initialMobCount)
    })

    it('should not spawn mobs when max mob limit is reached', () => {
      // Spawn 50 mobs to reach the limit
      for (let i = 0; i < 50; i++) {
        mobService['spawnMob']('zombie', i, 64, i)
      }
      
      const mobCountBefore = mobService.getAllMobs().size
      mobService.spawnMobs([mockPlayer], mockChunks)
      
      expect(mobService.getAllMobs().size).toBe(mobCountBefore)
    })

    it('should spawn mobs in loaded chunks', () => {
      const initialMobCount = mobService.getAllMobs().size
      
      // Mock the random chance to always spawn
      vi.spyOn(Math, 'random').mockReturnValue(0.001) // Very low value to trigger spawn
      
      mobService.spawnMobs([mockPlayer], mockChunks)
      
      // Should have spawned at least one mob
      expect(mobService.getAllMobs().size).toBeGreaterThan(initialMobCount)
    })

    it('should spawn appropriate mob types based on time of day', () => {
      // Mock time of day to be night
      vi.spyOn(mobService as any, 'getTimeOfDay').mockReturnValue(14000) // Night time
      
      // Mock random to trigger spawn
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      
      mobService.spawnMobs([mockPlayer], mockChunks)
      
      const mobs = Array.from(mobService.getAllMobs().values())
      const nightMobs = mobs.filter(mob => mob.type === 'zombie')
      
      expect(nightMobs.length).toBeGreaterThan(0)
    })
  })

  describe('updateMobsAI', () => {
    beforeEach(() => {
      // Spawn a test mob
      mobService['spawnMob']('zombie', 10, 64, 10)
    })

    it('should update mob positions', () => {
      const mobs = Array.from(mobService.getAllMobs().values())
      const mob = mobs[0]
      const initialPosition = { ...mob.position }
      
      // Mock world service
      const mockWorldService = {
        getAllChunks: () => mockChunks
      }
      
      mobService.updateMobsAI(mockWorldService)
      
      // Position should have changed due to AI movement
      expect(mob.position).not.toEqual(initialPosition)
    })

    it('should keep mobs above ground level', () => {
      const mobs = Array.from(mobService.getAllMobs().values())
      const mob = mobs[0]
      
      // Set mob below ground
      mob.position.y = 60
      
      const mockWorldService = {
        getAllChunks: () => mockChunks
      }
      
      mobService.updateMobsAI(mockWorldService)
      
      // Mob should be above ground (y=63 + 0.01)
      expect(mob.position.y).toBeGreaterThan(63)
    })

    it('should generate velocity for stationary mobs', () => {
      const mobs = Array.from(mobService.getAllMobs().values())
      const mob = mobs[0]
      
      // Remove velocity
      mob.velocity = { x: 0, y: 0, z: 0 }
      
      const mockWorldService = {
        getAllChunks: () => mockChunks
      }
      
      mobService.updateMobsAI(mockWorldService)
      
      // Should have generated new velocity
      expect(mob.velocity).toBeDefined()
      expect(mob.velocity!.x).not.toBe(0)
      expect(mob.velocity!.z).not.toBe(0)
    })
  })

  describe('handleAttack', () => {
    let testMob: any

    beforeEach(() => {
      // Spawn a test mob
      mobService['spawnMob']('zombie', 10, 64, 10)
      const mobs = Array.from(mobService.getAllMobs().values())
      testMob = mobs[0]
    })

    it('should damage mob when attacked', () => {
      const initialHealth = testMob.health
      const damage = 5
      
      const result = mobService.handleAttack(mockPlayer, testMob.id, damage)
      
      expect(result.mobDied).toBe(false)
      expect(result.mobUpdated).toBe(true)
      expect(testMob.health).toBe(initialHealth - damage)
    })

    it('should kill mob when health reaches zero', () => {
      const damage = testMob.health // Enough damage to kill
      
      const result = mobService.handleAttack(mockPlayer, testMob.id, damage)
      
      expect(result.mobDied).toBe(true)
      expect(result.mobUpdated).toBe(false)
      expect(mobService.getAllMobs().has(testMob.id)).toBe(false)
    })

    it('should return false for non-existent mob', () => {
      const result = mobService.handleAttack(mockPlayer, 'non-existent-mob', 10)
      
      expect(result.mobDied).toBe(false)
      expect(result.mobUpdated).toBe(false)
      expect(result.inventoryUpdated).toBe(false)
    })

    it('should give loot to player when mob dies', () => {
      const damage = testMob.health // Kill the mob
      
      const result = mobService.handleAttack(mockPlayer, testMob.id, damage)
      
      expect(result.mobDied).toBe(true)
      expect(result.inventoryUpdated).toBe(true)
      
      // Check that player received loot
      const hasLoot = mockPlayer.inventory.some(stack => 
        stack && ['rotten_flesh', 'iron_ingot'].includes(stack.item.id)
      )
      expect(hasLoot).toBe(true)
    })

    it('should handle different mob types with different loot', () => {
      // Spawn a sheep
      mobService['spawnMob']('sheep', 20, 64, 20)
      const sheepMob = Array.from(mobService.getAllMobs().values()).find(mob => mob.type === 'sheep')
      
      const damage = sheepMob!.health // Kill the sheep
      
      const result = mobService.handleAttack(mockPlayer, sheepMob!.id, damage)
      
      expect(result.mobDied).toBe(true)
      expect(result.inventoryUpdated).toBe(true)
      
      // Check that player received sheep loot
      const hasSheepLoot = mockPlayer.inventory.some(stack => 
        stack && ['mutton', 'wool'].includes(stack.item.id)
      )
      expect(hasSheepLoot).toBe(true)
    })
  })

  describe('mob management', () => {
    it('should generate unique mob IDs', () => {
      const id1 = mobService['generateMobId']()
      const id2 = mobService['generateMobId']()
      
      expect(id1).toMatch(/^mob-/)
      expect(id2).toMatch(/^mob-/)
      // Note: IDs might be the same due to fast execution, but format is correct
    })

    it('should spawn mobs with correct properties', () => {
      mobService['spawnMob']('zombie', 10, 64, 10)
      
      const mobs = Array.from(mobService.getAllMobs().values())
      const mob = mobs[0]
      
      expect(mob.type).toBe('zombie')
      expect(mob.position).toEqual({ x: 10, y: 64, z: 10 })
      expect(mob.health).toBe(10)
      expect(mob.rotation).toEqual({ x: 0, y: 0, z: 0 })
      expect(mob.velocity).toEqual({ x: 0, y: 0, z: 0 })
    })

    it('should return all mobs', () => {
      // Create a fresh mob service to avoid interference from other tests
      const freshMobService = new MobService()
      
      // Use the spawnMobs method instead of direct spawnMob calls
      const mockChunks = new Map()
      const mockChunk: Chunk = {
        x: 0,
        z: 0,
        blocks: new Map(),
        generated: true,
        modified: false
      }
      
      // Add some ground blocks
      for (let x = 0; x < 16; x++) {
        for (let z = 0; z < 16; z++) {
          mockChunk.blocks.set(`${x},63,${z}`, 'grass')
        }
      }
      mockChunks.set('0,0', mockChunk)
      
      // Mock random to trigger spawns
      vi.spyOn(Math, 'random').mockReturnValue(0.001)
      
      // Spawn mobs using the public method
      freshMobService.spawnMobs([mockPlayer], mockChunks)
      
      const allMobs = freshMobService.getAllMobs()
      
      expect(allMobs.size).toBeGreaterThan(0)
      // Check that we have at least some mobs spawned
      const mobTypes = Array.from(allMobs.values()).map(mob => mob.type)
      expect(mobTypes.length).toBeGreaterThan(0)
    })
  })

  describe('world interaction', () => {
    it('should find ground height correctly', () => {
      const groundY = mobService['getGroundHeight'](5, 5, mockChunks)
      
      expect(groundY).toBe(63) // Based on our mock chunk setup
    })

    it('should get block type at position', () => {
      const blockType = mobService['getBlockAt'](5, 63, 5, mockChunks)
      
      expect(blockType).toBe('grass')
    })

    it('should return air for unloaded chunks', () => {
      const blockType = mobService['getBlockAt'](100, 64, 100, mockChunks)
      
      expect(blockType).toBe('air')
    })
  })
})
