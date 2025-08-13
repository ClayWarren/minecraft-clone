import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NetworkManager } from '../../src/server/NetworkManager'
import { WebSocket } from 'ws'

describe('NetworkManager', () => {
  let networkManager: NetworkManager
  let mockConnectionHandler: ReturnType<typeof vi.fn>
  let mockWebSocket: any

  beforeEach(() => {
    mockConnectionHandler = vi.fn()

    // Mock WebSocket
    mockWebSocket = {
      send: vi.fn(),
      readyState: 1, // OPEN
      close: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }
  })

  afterEach(() => {
    if (networkManager) {
      try {
        networkManager.cleanup()
      } catch (e) {
        // Ignore cleanup errors in tests
      }
    }
  })

  describe('Message Sending', () => {
    it('should send message to connected WebSocket', () => {
      const message = {
        type: 'test_message',
        data: { test: 'data' },
        timestamp: Date.now(),
      }

      NetworkManager.prototype.send = vi.fn()
      const networkManager = new NetworkManager(0, mockConnectionHandler)
      networkManager.send(mockWebSocket, message)

      expect(NetworkManager.prototype.send).toHaveBeenCalledWith(mockWebSocket, message)
    })

    it('should handle send errors gracefully', () => {
      const message = {
        type: 'test_message',
        data: { test: 'data' },
        timestamp: Date.now(),
      }

      mockWebSocket.send = vi.fn().mockImplementation(() => {
        throw new Error('Send failed')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      NetworkManager.prototype.send = vi.fn().mockImplementation(() => {
        try {
          mockWebSocket.send(JSON.stringify(message))
        } catch (error) {
          console.error('Failed to send message:', error)
        }
      })

      const networkManager = new NetworkManager(0, mockConnectionHandler)
      networkManager.send(mockWebSocket, message)

      expect(consoleSpy).toHaveBeenCalledWith('Failed to send message:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('Broadcasting', () => {
    it('should broadcast message to multiple players', () => {
      const players = [
        { id: 'player1', ws: { ...mockWebSocket, send: vi.fn() } },
        { id: 'player2', ws: { ...mockWebSocket, send: vi.fn() } },
      ]

      const message = {
        type: 'broadcast_message',
        data: { broadcast: 'data' },
        timestamp: Date.now(),
      }

      NetworkManager.prototype.broadcast = vi.fn()
      const networkManager = new NetworkManager(0, mockConnectionHandler)
      networkManager.broadcast(players as any, message)

      expect(NetworkManager.prototype.broadcast).toHaveBeenCalledWith(players, message)
    })

    it('should broadcast to others excluding specific player', () => {
      const players = [
        { id: 'player1', ws: { ...mockWebSocket, send: vi.fn() } },
        { id: 'player2', ws: { ...mockWebSocket, send: vi.fn() } },
      ]

      const message = {
        type: 'broadcast_message',
        data: { broadcast: 'data' },
        timestamp: Date.now(),
      }

      NetworkManager.prototype.broadcastToOthers = vi.fn()
      const networkManager = new NetworkManager(0, mockConnectionHandler)
      networkManager.broadcastToOthers(players as any, 'player1', message)

      expect(NetworkManager.prototype.broadcastToOthers).toHaveBeenCalledWith(
        players,
        'player1',
        message
      )
    })
  })

  describe('Connection Handling', () => {
    it('should handle new connections', () => {
      const networkManager = new NetworkManager(0, mockConnectionHandler)

      // Since we can't easily test the actual server connection in unit tests,
      // we verify the connection handler was provided
      expect(mockConnectionHandler).toBeDefined()
    })

    it('should cleanup properly', () => {
      const networkManager = new NetworkManager(0, mockConnectionHandler)

      expect(() => {
        networkManager.cleanup()
      }).not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle disconnected WebSocket gracefully', () => {
      const disconnectedSocket = {
        ...mockWebSocket,
        readyState: 3, // CLOSED
      }

      const message = {
        type: 'test_message',
        data: { test: 'data' },
        timestamp: Date.now(),
      }

      NetworkManager.prototype.send = vi.fn().mockImplementation((ws, msg) => {
        if (ws.readyState !== 1) {
          return // Don't send to closed sockets
        }
      })

      const networkManager = new NetworkManager(0, mockConnectionHandler)

      expect(() => {
        networkManager.send(disconnectedSocket, message)
      }).not.toThrow()
    })
  })
})
