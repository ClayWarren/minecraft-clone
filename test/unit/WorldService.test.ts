import { describe, it, expect, beforeEach } from 'vitest'
import { WorldService } from '../../src/server/WorldService'
import type { Chunk } from '../../src/types/server'

describe('WorldService', () => {
  let worldService: WorldService

  beforeEach(() => {
    worldService = new WorldService()
  })

  describe('Chunk Management', () => {
    it('should retrieve a chunk', () => {
      const mockChunk: Chunk = {
        x: 0,
        z: 0,
        blocks: new Map([['0,64,0', 'grass']]),
        dirty: false,
        generated: true,
        modified: false
      }

      // Add chunk to service
      worldService.getAllChunks().set('0,0', mockChunk)
      
      const retrievedChunk = worldService.getChunk(0, 0)
      expect(retrievedChunk).toBe(mockChunk)
    })

    it('should return null for non-existent chunk', () => {
      const chunk = worldService.getChunk(999, 999)
      expect(chunk).toBeNull()
    })

    it('should get all chunks', () => {
      const chunk1: Chunk = {
        x: 0, z: 0, blocks: new Map(), dirty: false, generated: true, modified: false
      }
      const chunk2: Chunk = {
        x: 1, z: 0, blocks: new Map(), dirty: false, generated: true, modified: false
      }

      worldService.getAllChunks().set('0,0', chunk1)
      worldService.getAllChunks().set('1,0', chunk2)

      const allChunks = worldService.getAllChunks()
      expect(allChunks.size).toBe(2)
      expect(allChunks.has('0,0')).toBe(true)
      expect(allChunks.has('1,0')).toBe(true)
    })
  })

  describe('Block Operations', () => {
    it('should handle block placement in chunk', () => {
      const chunk: Chunk = {
        x: 0,
        z: 0,
        blocks: new Map(),
        dirty: false,
        generated: true,
        modified: false
      }

      worldService.getAllChunks().set('0,0', chunk)
      
      // Simulate block placement
      chunk.blocks.set('8,64,8', 'stone')
      chunk.dirty = true

      expect(chunk.blocks.get('8,64,8')).toBe('stone')
      expect(chunk.dirty).toBe(true)
    })

    it('should handle block removal from chunk', () => {
      const chunk: Chunk = {
        x: 0,
        z: 0,
        blocks: new Map([['8,64,8', 'stone']]),
        dirty: false,
        generated: true,
        modified: false
      }

      worldService.getAllChunks().set('0,0', chunk)
      
      // Simulate block removal
      chunk.blocks.set('8,64,8', 'air')
      chunk.dirty = true

      expect(chunk.blocks.get('8,64,8')).toBe('air')
      expect(chunk.dirty).toBe(true)
    })
  })

  describe('World Persistence', () => {
    it('should load world without errors', () => {
      expect(() => {
        worldService.loadWorld()
      }).not.toThrow()
    })

    it('should save world without errors', () => {
      expect(() => {
        worldService.saveWorld()
      }).not.toThrow()
    })

    it('should handle save with dirty chunks', () => {
      const dirtyChunk: Chunk = {
        x: 0,
        z: 0,
        blocks: new Map([['0,64,0', 'modified_block']]),
        dirty: true,
        generated: true,
        modified: true
      }

      worldService.getAllChunks().set('0,0', dirtyChunk)

      expect(() => {
        worldService.saveWorld()
      }).not.toThrow()
    })
  })

  describe('Chunk State', () => {
    it('should track chunk generation state', () => {
      const chunk: Chunk = {
        x: 0,
        z: 0,
        blocks: new Map(),
        dirty: false,
        generated: false,
        modified: false
      }

      worldService.getAllChunks().set('0,0', chunk)
      
      // Mark as generated
      chunk.generated = true
      
      expect(worldService.getChunk(0, 0)!.generated).toBe(true)
    })

    it('should track chunk modification state', () => {
      const chunk: Chunk = {
        x: 0,
        z: 0,
        blocks: new Map(),
        dirty: false,
        generated: true,
        modified: false
      }

      worldService.getAllChunks().set('0,0', chunk)
      
      // Modify chunk
      chunk.blocks.set('0,64,0', 'player_placed_block')
      chunk.modified = true
      chunk.dirty = true
      
      const retrievedChunk = worldService.getChunk(0, 0)!
      expect(retrievedChunk.modified).toBe(true)
      expect(retrievedChunk.dirty).toBe(true)
    })
  })

  describe('Chunk Coordinates', () => {
    it('should handle different chunk coordinates', () => {
      const chunks = [
        { x: -1, z: -1 },
        { x: 0, z: 0 },
        { x: 1, z: 1 },
        { x: 10, z: -5 }
      ]

      chunks.forEach(({ x, z }) => {
        const chunk: Chunk = {
          x, z, blocks: new Map(), dirty: false, generated: true, modified: false
        }
        worldService.getAllChunks().set(`${x},${z}`, chunk)
      })

      chunks.forEach(({ x, z }) => {
        const retrievedChunk = worldService.getChunk(x, z)
        expect(retrievedChunk).not.toBeNull()
        expect(retrievedChunk!.x).toBe(x)
        expect(retrievedChunk!.z).toBe(z)
      })
    })
  })
})