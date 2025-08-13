import { describe, it, expect, beforeEach } from 'vitest'
import { PlayerManager } from '../../src/player/PlayerManager'
import type { ServerPlayer } from '../../src/types/server'

describe('PlayerManager', () => {
  let playerManager: PlayerManager
  let mockPlayer: ServerPlayer

  beforeEach(() => {
    playerManager = new PlayerManager()

    mockPlayer = {
      id: 'test-player',
      username: 'TestPlayer',
      position: { x: 0, y: 64, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 20,
      inventory: Array(36).fill(null),
      isFlying: false,
      isGrounded: true,
      ws: {} as any,
      velocity: { x: 0, y: 0, z: 0 },
      hunger: 20,
      lastUpdate: Date.now(),
      pendingMessages: [],
    }
  })

  describe('Player Management', () => {
    it('should add a player', () => {
      playerManager.addPlayer(mockPlayer)

      expect(playerManager.getPlayer(mockPlayer.id)).toBe(mockPlayer)
    })

    it('should remove a player', () => {
      playerManager.addPlayer(mockPlayer)
      playerManager.removePlayer(mockPlayer.id)

      expect(playerManager.getPlayer(mockPlayer.id)).toBeUndefined()
    })

    it('should get all players', () => {
      const player2 = { ...mockPlayer, id: 'player2', username: 'Player2' }

      playerManager.addPlayer(mockPlayer)
      playerManager.addPlayer(player2)

      const allPlayers = playerManager.getAllPlayers()
      expect(allPlayers).toHaveLength(2)
      expect(allPlayers).toContain(mockPlayer)
      expect(allPlayers).toContain(player2)
    })

    it('should return undefined for non-existent player', () => {
      expect(playerManager.getPlayer('non-existent')).toBeUndefined()
    })

    it('should handle removing non-existent player', () => {
      expect(() => {
        playerManager.removePlayer('non-existent')
      }).not.toThrow()
    })
  })

  describe('Player State', () => {
    it('should update player position', () => {
      playerManager.addPlayer(mockPlayer)

      const newPosition = { x: 10, y: 65, z: 10 }
      const player = playerManager.getPlayer(mockPlayer.id)!
      player.position = newPosition

      expect(playerManager.getPlayer(mockPlayer.id)!.position).toEqual(newPosition)
    })

    it('should update player health', () => {
      playerManager.addPlayer(mockPlayer)

      const player = playerManager.getPlayer(mockPlayer.id)!
      player.health = 15

      expect(playerManager.getPlayer(mockPlayer.id)!.health).toBe(15)
    })

    it('should track player inventory', () => {
      playerManager.addPlayer(mockPlayer)

      const player = playerManager.getPlayer(mockPlayer.id)!
      player.inventory[0] = { type: 'stone', quantity: 10 }

      expect(playerManager.getPlayer(mockPlayer.id)!.inventory[0]).toEqual({
        type: 'stone',
        quantity: 10,
      })
    })
  })

  describe('Player Count', () => {
    it('should return correct player count', () => {
      expect(playerManager.getAllPlayers()).toHaveLength(0)

      playerManager.addPlayer(mockPlayer)
      expect(playerManager.getAllPlayers()).toHaveLength(1)

      const player2 = { ...mockPlayer, id: 'player2' }
      playerManager.addPlayer(player2)
      expect(playerManager.getAllPlayers()).toHaveLength(2)

      playerManager.removePlayer(mockPlayer.id)
      expect(playerManager.getAllPlayers()).toHaveLength(1)
    })
  })

  describe('Player Activity', () => {
    it('should track last activity', () => {
      const initialTime = Date.now()
      mockPlayer.lastActivity = initialTime

      playerManager.addPlayer(mockPlayer)

      const player = playerManager.getPlayer(mockPlayer.id)!
      expect(player.lastActivity).toBe(initialTime)

      const newTime = Date.now() + 1000
      player.lastActivity = newTime

      expect(playerManager.getPlayer(mockPlayer.id)!.lastActivity).toBe(newTime)
    })

    it('should handle pending messages', () => {
      mockPlayer.pendingMessages = [{ type: 'test', data: {}, timestamp: Date.now() }]

      playerManager.addPlayer(mockPlayer)

      const player = playerManager.getPlayer(mockPlayer.id)!
      expect(player.pendingMessages).toHaveLength(1)

      player.pendingMessages.push({ type: 'test2', data: {}, timestamp: Date.now() })
      expect(player.pendingMessages).toHaveLength(2)
    })
  })
})
