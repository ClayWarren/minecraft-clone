import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WebSocket } from 'ws'
import MinecraftServer from '../../server'
import type {
  NetworkMessage,
  PlayerUpdateMessage,
  BlockUpdateMessage,
} from '../../src/types/server'

describe('MinecraftServer Integration', () => {
  let server: MinecraftServer
  let mockWebSocket: any

  beforeEach(() => {
    // Create a fresh server instance for each test
    server = new MinecraftServer()

    // Create a mock WebSocket
    mockWebSocket = {
      readyState: 1, // OPEN
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
  })

  afterEach(() => {
    // Clean up server
    if (server) {
      server.cleanup()
    }
  })

  describe('Player Connection', () => {
    it('should handle player connection and send initial game state', () => {
      // Simulate player connection
      const playerId = server['generatePlayerId']()

      // Mock the handlePlayerConnect method
      const originalHandlePlayerConnect = server['handlePlayerConnect'].bind(server)
      const mockHandlePlayerConnect = vi.fn(originalHandlePlayerConnect)
      server['handlePlayerConnect'] = mockHandlePlayerConnect

      // Trigger connection
      mockHandlePlayerConnect(mockWebSocket)

      expect(mockHandlePlayerConnect).toHaveBeenCalledWith(mockWebSocket)
      expect(mockWebSocket.on).toHaveBeenCalledWith('message', expect.any(Function))
      expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function))
      expect(mockWebSocket.on).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('should generate unique player IDs', () => {
      const id1 = server['generatePlayerId']()
      const id2 = server['generatePlayerId']()

      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(id1.length).toBeGreaterThan(0)
    })
  })

  describe('Message Handling', () => {
    let mockPlayer: any

    beforeEach(() => {
      // Create a mock player
      mockPlayer = {
        id: 'test-player',
        username: 'TestPlayer',
        position: { x: 0, y: 64, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        health: 20,
        inventory: [],
        isFlying: false,
        isGrounded: true,
        ws: mockWebSocket,
        velocity: { x: 0, y: 0, z: 0 },
        hunger: 20,
        lastUpdate: Date.now(),
      }

      // Add player to player manager
      server['playerManager']['players'].set(mockPlayer.id, mockPlayer)
    })

    it('should handle player update messages', () => {
      const message: PlayerUpdateMessage = {
        type: 'player_update',
        data: {
          playerId: mockPlayer.id,
          position: { x: 10, y: 65, z: 10 },
          rotation: { x: 0, y: 90, z: 0 },
        },
        timestamp: Date.now(),
      }

      server['handleMessage'](mockPlayer.id, message)

      // Check that player position was updated
      expect(mockPlayer.position).toEqual({ x: 10, y: 65, z: 10 })
      expect(mockPlayer.rotation).toEqual({ x: 0, y: 90, z: 0 })
    })

    it('should handle block update messages', () => {
      const message: BlockUpdateMessage = {
        type: 'block_update',
        data: {
          position: { x: 5, y: 64, z: 5 },
          blockType: 'stone',
          playerId: mockPlayer.id,
        },
        timestamp: Date.now(),
      }

      // Mock world service methods
      const mockChunk = {
        blocks: new Map(),
        dirty: false,
      }
      server['worldService']['getChunk'] = vi.fn().mockReturnValue(mockChunk)
      server['worldService']['getAllChunks'] = vi.fn().mockReturnValue(new Map())

      server['handleMessage'](mockPlayer.id, message)

      // Check that block was placed
      expect(mockChunk.blocks.has('5,64,5')).toBe(true)
      expect(mockChunk.blocks.get('5,64,5')).toBe('stone')
      expect(mockChunk.dirty).toBe(true)
    })

    it('should handle chunk requests', () => {
      const message: NetworkMessage = {
        type: 'chunk_request',
        data: { chunkX: 0, chunkZ: 0 },
        timestamp: Date.now(),
      }

      // Mock world service methods
      server['worldService']['getAllChunks'] = vi.fn().mockReturnValue(new Map())
      server['generateChunk'] = vi.fn()
      server['sendChunkData'] = vi.fn()

      server['handleMessage'](mockPlayer.id, message)

      expect(server['generateChunk']).toHaveBeenCalledWith(0, 0)
      expect(server['sendChunkData']).toHaveBeenCalledWith(mockPlayer.id, 0, 0)
    })

    it('should handle unknown message types gracefully', () => {
      const message: NetworkMessage = {
        type: 'unknown_message_type',
        data: {},
        timestamp: Date.now(),
      }

      const consoleSpy = vi.spyOn(console, 'warn')

      server['handleMessage'](mockPlayer.id, message)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Unknown message type from test-player: unknown_message_type'
      )
    })
  })

  describe('Game Loop', () => {
    it('should update time correctly', () => {
      const initialTime = server['timeOfDay']

      // Mock the updateTime method
      const originalUpdateTime = server['updateTime'].bind(server)
      const mockUpdateTime = vi.fn(originalUpdateTime)
      server['updateTime'] = mockUpdateTime

      // Trigger game loop
      server['startGameLoop']()

      // Wait a bit for the interval to fire
      setTimeout(() => {
        expect(mockUpdateTime).toHaveBeenCalled()
      }, 1100)
    })

    it('should update player hunger and health', () => {
      const mockPlayer = {
        id: 'test-player',
        username: 'TestPlayer',
        position: { x: 0, y: 64, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        health: 20,
        inventory: [],
        isFlying: false,
        isGrounded: true,
        ws: mockWebSocket,
        velocity: { x: 0, y: 0, z: 0 },
        hunger: 20,
        lastUpdate: Date.now(),
      }

      server['playerManager']['players'].set(mockPlayer.id, mockPlayer)

      // Mock the updatePlayerHungerAndHealth method
      const originalUpdateHunger = server['updatePlayerHungerAndHealth'].bind(server)
      const mockUpdateHunger = vi.fn(originalUpdateHunger)
      server['updatePlayerHungerAndHealth'] = mockUpdateHunger

      // Trigger game loop
      server['startGameLoop']()

      // Wait a bit for the interval to fire
      setTimeout(() => {
        expect(mockUpdateHunger).toHaveBeenCalled()
      }, 1100)
    })
  })

  describe('Network Communication', () => {
    it('should send messages to specific players', () => {
      const mockPlayer = {
        id: 'test-player',
        username: 'TestPlayer',
        position: { x: 0, y: 64, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        health: 20,
        inventory: [],
        isFlying: false,
        isGrounded: true,
        ws: mockWebSocket,
        velocity: { x: 0, y: 0, z: 0 },
        hunger: 20,
        lastUpdate: Date.now(),
      }

      server['playerManager']['players'].set(mockPlayer.id, mockPlayer)

      const message: NetworkMessage = {
        type: 'test_message',
        data: { test: 'data' },
        timestamp: Date.now(),
      }

      // Mock the network manager send method
      server['networkManager']['send'] = vi.fn()

      server['sendToPlayer'](mockPlayer.id, message)

      expect(server['networkManager']['send']).toHaveBeenCalledWith(mockWebSocket, message)
    })

    it('should broadcast messages to all players', () => {
      const mockPlayer1 = {
        id: 'player1',
        username: 'Player1',
        position: { x: 0, y: 64, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        health: 20,
        inventory: [],
        isFlying: false,
        isGrounded: true,
        ws: mockWebSocket,
        velocity: { x: 0, y: 0, z: 0 },
        hunger: 20,
        lastUpdate: Date.now(),
      }

      const mockPlayer2 = {
        id: 'player2',
        username: 'Player2',
        position: { x: 10, y: 64, z: 10 },
        rotation: { x: 0, y: 0, z: 0 },
        health: 20,
        inventory: [],
        isFlying: false,
        isGrounded: true,
        ws: { ...mockWebSocket, send: vi.fn() },
        velocity: { x: 0, y: 0, z: 0 },
        hunger: 20,
        lastUpdate: Date.now(),
      }

      server['playerManager']['players'].set(mockPlayer1.id, mockPlayer1)
      server['playerManager']['players'].set(mockPlayer2.id, mockPlayer2)

      const message: NetworkMessage = {
        type: 'broadcast_message',
        data: { broadcast: 'data' },
        timestamp: Date.now(),
      }

      // Mock the network manager broadcast method
      server['networkManager']['broadcast'] = vi.fn()

      server['broadcast'](message)

      expect(server['networkManager']['broadcast']).toHaveBeenCalledWith(
        [mockPlayer1, mockPlayer2],
        message
      )
    })
  })
})
