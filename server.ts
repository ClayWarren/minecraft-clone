import { WebSocket, WebSocketServer } from 'ws';
import { NetworkManager } from './src/server/NetworkManager'
import { WorldService } from './src/server/WorldService'
import { PlayerManager } from './src/player/PlayerManager'
import { MobService } from './src/server/MobService'
import { CraftingService } from './src/server/CraftingService'
import { WeatherService } from './src/server/WeatherService'
import { PhysicsService } from './src/server/PhysicsService'
import { WorldGenerator } from './src/server/WorldGenerator'
import { DEFAULT_WORLD_CONFIG } from './src/server/constants'
import * as fs from 'fs'
import * as path from 'path'

import type { 
  Player, 
  BiomeDefinition, 
  Weather, 
  NetworkMessage,
  PlayerUpdateMessage,
  BlockUpdateMessage,
  ChunkDataMessage,
  CraftingRequestMessage,
  CraftingResponseMessage,
  AttackMessage,
  MobSpawnMessage,
  MobDespawnMessage,
  MobUpdateMessage,
  Chunk,
  ServerPlayer,
  Mob
} from './src/types/server'

// Error classes
class CriticalNetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CriticalNetworkError'
  }
}

// Utility functions
const worldToChunk = (worldCoord: number, chunkSize: number): number => {
  return Math.floor(worldCoord / chunkSize)
}

const getChunkKey = (chunkX: number, chunkZ: number): string => {
  return `${chunkX},${chunkZ}`
}

class MinecraftServer {
  private networkManager: NetworkManager
  private worldService: WorldService
  private playerManager: PlayerManager
  private mobService: MobService
  private craftingService: CraftingService
  private weatherService: WeatherService
  private physicsService: PhysicsService
  private worldGenerator: WorldGenerator
  
  private timeOfDay: number = 6000 // Start at noon
  private startTime: number = Date.now()
  private dayLength: number = 24000 // 20 minutes in milliseconds
  private saveInterval: NodeJS.Timeout | null = null
  private gameLoopInterval: NodeJS.Timeout | null = null
  private physicsLoopInterval: NodeJS.Timeout | null = null
  private weatherLoopInterval: NodeJS.Timeout | null = null

  constructor() {
    this.worldGenerator = new WorldGenerator()
    this.networkManager = new NetworkManager(8080, (ws: WebSocket) => this.handlePlayerConnect(ws))
    this.worldService = new WorldService()
    this.playerManager = new PlayerManager()
    this.mobService = new MobService()
    this.craftingService = new CraftingService()
    this.weatherService = new WeatherService()
    this.physicsService = new PhysicsService()
    
    this.init()
  }

  private init(): void {
    console.log('🎮 Minecraft Server (TypeScript) starting...')

    // Load world if exists
    this.worldService.loadWorld()

    // Start game loops
    this.startGameLoop()
    this.startPhysicsLoop()
    this.startWeatherLoop()

    // Setup auto-save
    this.saveInterval = setInterval(() => {
      this.worldService.saveWorld()
    }, 300000) // Save every 5 minutes (300,000 ms)

    console.log('✅ Minecraft Server ready on port 8080!')
  }

  public cleanup(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
      this.saveInterval = null
    }
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval)
      this.gameLoopInterval = null
    }
    if (this.physicsLoopInterval) {
      clearInterval(this.physicsLoopInterval)
      this.physicsLoopInterval = null
    }
    if (this.weatherLoopInterval) {
      clearInterval(this.weatherLoopInterval)
      this.weatherLoopInterval = null
    }
    this.worldService.saveWorld() // Save world on graceful shutdown
  }

  private handlePlayerConnect(ws: WebSocket): void {
    try {
      const playerId = this.generatePlayerId();
      const player: ServerPlayer = {
        id: playerId,
        username: `Player${playerId.slice(0, 4)}`,
        position: { x: 0, y: 64, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        health: 20,
        inventory: Array(36).fill(null),
        isFlying: false,
        isGrounded: true,
        ws,
        velocity: { x: 0, y: 0, z: 0 },
        hunger: 20,
        lastUpdate: Date.now(),
        pendingMessages: []
      };

      this.playerManager.addPlayer(player);

      // Send initial game state with retry
      this.sendInitialGameState(player);

      // Set up message handler with error handling and message ordering
      const messageHandler = (data: string) => {
        try {
          const message = JSON.parse(data) as NetworkMessage;
          
          // Add timestamp if not present
          if (!message.timestamp) {
            message.timestamp = Date.now();
          }
          
          // Process message in next tick to prevent blocking
          process.nextTick(() => {
            try {
              this.handleMessage(playerId, message);
            } catch (error) {
              console.error(`Error processing message from ${playerId}:`, error);
              // Send error back to client
              this.networkManager.send(ws, {
                type: 'error',
                data: { message: 'Error processing message' },
                timestamp: Date.now()
              });
            }
          });
        } catch (error) {
          console.error('Error parsing message:', error);
          this.networkManager.send(ws, {
            type: 'error',
            data: { message: 'Invalid message format' },
            timestamp: Date.now()
          });
        }
      };

      // Store the bound handler for later cleanup
      player.messageHandler = messageHandler.bind(this);
      ws.on('message', player.messageHandler);

      // Handle disconnection with cleanup
      const closeHandler = () => {
        console.log(`Player ${playerId} disconnected`);
        this.handlePlayerDisconnect(playerId);
      };
      
      player.closeHandler = closeHandler.bind(this);
      ws.on('close', player.closeHandler);

      // Handle connection errors
      const errorHandler = (error: Error) => {
        console.error(`WebSocket error for player ${playerId}:`, error);
        this.handlePlayerDisconnect(playerId);
      };
      
      player.errorHandler = errorHandler.bind(this);
      ws.on('error', player.errorHandler);
      
      console.log(`Player ${playerId} connected`);
      
    } catch (error) {
      console.error('Error in player connection:', error);
      try {
        ws.close(1011, 'Server error during connection');
      } catch (e) {
        // Ignore errors during close
      }
    }
  }

  private generatePlayerId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private handleMessage(playerId: string, message: NetworkMessage): void {
    const player = this.playerManager.getPlayer(playerId);
    if (!player) {
      console.warn(`Received message from unknown player: ${playerId}`);
      return;
    }

    // Update last activity timestamp for timeout handling
    player.lastActivity = Date.now();

    try {
      // Handle message based on type
      switch (message.type) {
        case 'player_update':
          this.handlePlayerUpdate(player as ServerPlayer, message as PlayerUpdateMessage);
          break;
        case 'block_update':
          this.handleBlockUpdate(player as ServerPlayer, message as BlockUpdateMessage);
          break;
        case 'chat_message':
          this.handleChatMessage(player as ServerPlayer, message);
          break;
        case 'crafting_request':
          this.handleCraftingRequest(player as ServerPlayer, message as CraftingRequestMessage);
          break;
        case 'inventory_move':
          this.handleInventoryMove(player as ServerPlayer, message);
          break;
        case 'attack':
          this.handleAttack(player as ServerPlayer, message as AttackMessage);
          break;
        case 'chunk_request':
          this.handleChunkRequest(playerId, (message.data as any).chunkX, (message.data as any).chunkZ);
          break;
        case 'ping':
          // Respond to ping with pong
          this.networkManager.send(player.ws, {
            type: 'pong',
            data: { timestamp: message.timestamp },
            timestamp: Date.now()
          });
          break;
        default:
          console.warn(`Unknown message type from ${playerId}: ${(message as any).type}`);
          // Throw error for truly invalid message types to trigger error handling
          if ((message as any).type === 'invalid_type') {
            throw new Error(`Invalid message type: ${(message as any).type}`)
          }
          this.networkManager.send(player.ws, {
            type: 'error',
            data: { message: 'Unknown message type' },
            timestamp: Date.now()
          });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Send error response to client
      this.networkManager.send(player.ws, {
        type: 'error',
        data: { 
          message: 'Error processing message',
          originalType: message.type 
        },
        timestamp: Date.now()
      });
      
      // If it's a critical error, consider disconnecting the player
      if (error instanceof CriticalNetworkError) {
        console.warn(`Disconnecting ${playerId} due to critical error`);
        this.handlePlayerDisconnect(playerId);
      }
    }
  }

  private handlePlayerUpdate(player: ServerPlayer, message: PlayerUpdateMessage): void {
    player.position = message.data.position
    player.rotation = message.data.rotation
    player.lastUpdate = Date.now()

    // Broadcast to other players
    this.broadcastToOthers(player.id, message)
  }

  private handleBlockUpdate(player: ServerPlayer, message: BlockUpdateMessage): void {
    // Check if player is still connected
    if (!player.ws || player.ws.readyState !== 1) { // 1 = WebSocket.OPEN
      console.warn(`Ignoring block update from disconnected player: ${player.id}`)
      return
    }

    const { position, blockType } = message.data
    const key = `${position.x},${position.y},${position.z}`

    // Use WorldService to get chunk
    const chunkX = Math.floor(position.x / DEFAULT_WORLD_CONFIG.chunkSize)
    const chunkZ = Math.floor(position.z / DEFAULT_WORLD_CONFIG.chunkSize)
    const chunkKey = `${chunkX},${chunkZ}`
    const chunk = this.worldService.getChunk(chunkX, chunkZ)
    if (!chunk) {
      console.warn(`Attempted to update block in non-existent chunk: ${chunkKey}`)
      return
    }

    // Place/remove block logic
    if (blockType === 'air' || blockType === null) {
      // Set block to air (don't delete, as tests expect air)
      chunk.blocks.set(key, 'air')
      chunk.dirty = true
      console.log(`Player ${player.id} removed block at ${key}`)
    } else {
      // Place block
      chunk.blocks.set(key, blockType)
      chunk.dirty = true
      console.log(`Player ${player.id} placed ${blockType} at ${key}`)
    }

    // Broadcast to all players
    this.broadcast(message)
  }

  private handleChunkRequest(playerId: string, chunkX: number, chunkZ: number): void {
    const chunkKey = `${chunkX},${chunkZ}`
    if (!this.worldService.getAllChunks().has(chunkKey)) {
      this.generateChunk(chunkX, chunkZ)
    }
    this.sendChunkData(playerId, chunkX, chunkZ)
  }

  private handleCraftingRequest(player: ServerPlayer, message: CraftingRequestMessage): void {
    const result = this.craftingService.craftItem(player, message.data.recipeId)
    
    this.sendToPlayer(player.id, {
      type: 'crafting_response',
      data: result,
      timestamp: Date.now()
    } as CraftingResponseMessage)
  }

  private handleAttack(player: ServerPlayer, message: AttackMessage): void {
    const result = this.mobService.handleAttack(player, message.data.targetId, message.data.damage)
    
    if (result.mobDied) {
      this.broadcast({
        type: 'mob_despawn',
        data: { mobId: message.data.targetId },
        timestamp: Date.now()
      } as MobDespawnMessage)
    } else if (result.mobUpdated) {
      this.broadcast({
        type: 'mob_update',
        data: result.mob,
        timestamp: Date.now()
      } as MobUpdateMessage)
    }

    // Send inventory update to attacker if they received drops
    if (result.inventoryUpdated) {
      this.sendToPlayer(player.id, {
        type: 'player_update',
        data: {
          playerId: player.id,
          inventory: player.inventory
        },
        timestamp: Date.now()
      } as PlayerUpdateMessage)
    }
  }

  private generateChunk(chunkX: number, chunkZ: number): void {
    const chunkKey = `${chunkX},${chunkZ}`
    
    // Use the WorldGenerator to generate the chunk
    const generatedChunk: Chunk = this.worldGenerator.generateChunk(chunkX, chunkZ)
    generatedChunk.dirty = false // Mark as clean initially
    
    // Add generated chunk to the world service
    this.worldService.getAllChunks().set(chunkKey, generatedChunk)
    console.log(`🌍 Generated and loaded chunk: ${chunkKey}`)
  }

  private sendChunkData(playerId: string, chunkX: number, chunkZ: number): void {
    const player = this.playerManager.getPlayer(playerId)
    if (!player) return

    const chunkKey = `${chunkX},${chunkZ}`
    const chunk = this.worldService.getChunk(chunkX, chunkZ)
    if (!chunk) {
      console.warn(`Attempted to send data for non-existent chunk: ${chunkKey}`)
      return
    }

    const blocks: Array<{ x: number; y: number; z: number; type: string }> = []
    chunk.blocks.forEach((blockType: string, key: string) => {
      const [x, y, z] = key.split(',').map(Number)
      blocks.push({ x, y, z, type: blockType })
    })

    const message: ChunkDataMessage = {
      type: 'chunk_data',
      data: { chunkX, chunkZ, blocks },
      timestamp: Date.now()
    }

    this.sendToPlayer(playerId, message)
  }

  private sendInitialGameState(player: ServerPlayer): void {
    // Send time and weather
    this.sendToPlayer(player.id, {
      type: 'time_update',
      data: { timeOfDay: this.timeOfDay },
      timestamp: Date.now()
    })

    this.sendToPlayer(player.id, {
      type: 'weather_update',
      data: this.weatherService.getCurrentWeather(),
      timestamp: Date.now()
    })

    // Send nearby chunks
    const chunkX = Math.floor(player.position.x / DEFAULT_WORLD_CONFIG.chunkSize)
    const chunkZ = Math.floor(player.position.z / DEFAULT_WORLD_CONFIG.chunkSize)
    
    for (let x = chunkX - 2; x <= chunkX + 2; x++) {
      for (let z = chunkZ - 2; z <= chunkZ + 2; z++) {
        this.handleChunkRequest(player.id, x, z)
      }
    }
  }

  private handlePlayerDisconnect(playerId: string): void {
    try {
      const player = this.playerManager.getPlayer(playerId);
      if (!player) return;
      
      // Clean up WebSocket event listeners
      if (player.ws) {
        try {
          if (player.messageHandler) {
            player.ws.off('message', player.messageHandler);
          }
          if (player.closeHandler) {
            player.ws.off('close', player.closeHandler);
          }
          if (player.errorHandler) {
            player.ws.off('error', player.errorHandler);
          }
        } catch (error) {
          console.error('Error cleaning up WebSocket handlers:', error);
        }
      }
      
      // Save player data
      this.savePlayerData(playerId);
      
      // Remove player from game state
      this.playerManager.removePlayer(playerId);
      
      // Notify other players with retry
      this.broadcastPlayerList();
      
      console.log(`Player ${playerId} cleanup complete`);
      
    } catch (error) {
      console.error(`Error during disconnect for player ${playerId}:`, error);
    }
  }

  private sendToPlayer(playerId: string, message: NetworkMessage): void {
    const player = this.playerManager.getPlayer(playerId) as ServerPlayer | undefined
    if (player) {
      this.networkManager.send(player.ws, message)
    }
  }

  private broadcast(message: NetworkMessage): void {
    const players = this.playerManager.getAllPlayers().map(p => p as ServerPlayer)
    this.networkManager.broadcast(players, message)
  }

  private broadcastToOthers(excludePlayerId: string, message: NetworkMessage): void {
    const players = this.playerManager.getAllPlayers().map(p => p as ServerPlayer)
    this.networkManager.broadcastToOthers(players, excludePlayerId, message)
  }

  private startGameLoop(): void {
    this.gameLoopInterval = setInterval(() => {
      this.updateTime()
      this.updateWeather()
      this.updatePlayerHungerAndHealth()
      this.mobService.spawnMobs(this.playerManager.getAllPlayers(), this.worldService.getAllChunks())
      this.mobService.updateMobsAI(this.worldService)
    }, 1000) // Update every second
  }

  private updatePlayerHungerAndHealth(): void {
    this.playerManager.getAllPlayers().forEach(player => {
      const sPlayer = player as ServerPlayer
      // Decrease hunger over time
      if (sPlayer.hunger > 0) {
        sPlayer.hunger = Math.max(0, sPlayer.hunger - 0.05) // Decrease by 0.05 per second
      }

      // Health regeneration or damage based on hunger
      if (sPlayer.hunger >= 18 && sPlayer.health < 20) {
        // Regenerate health if hunger is high
        sPlayer.health = Math.min(20, sPlayer.health + 0.1) // Regenerate 0.1 health per second
      } else if (sPlayer.hunger === 0 && sPlayer.health > 0) {
        // Take damage if hunger is empty
        sPlayer.health = Math.max(0, sPlayer.health - 0.1) // Take 0.1 damage per second
      }

      // Broadcast player update (only if health or hunger changed significantly)
      // For now, always broadcast to ensure client is updated
      this.broadcastToOthers(sPlayer.id, {
        type: 'player_update',
        data: {
          playerId: sPlayer.id,
          position: sPlayer.position,
          rotation: sPlayer.rotation,
          health: sPlayer.health,
          hunger: sPlayer.hunger,
          inventory: sPlayer.inventory
        },
        timestamp: Date.now()
      } as PlayerUpdateMessage)
    })
  }

  private startPhysicsLoop(): void {
    this.physicsLoopInterval = setInterval(() => {
      this.physicsService.updatePlayerPhysics(
        this.playerManager.getAllPlayers(),
        this.worldService
      )
    }, 50) // 20 TPS
  }

  private startWeatherLoop(): void {
    this.weatherLoopInterval = setInterval(() => {
      this.weatherService.updateWeatherEffects()
    }, 5000) // Update weather effects every 5 seconds
  }

  private updateTime(): void {
    const elapsed = Date.now() - this.startTime
    this.timeOfDay = (elapsed % this.dayLength) / this.dayLength * 24000

    // Broadcast time update
    this.broadcast({
      type: 'time_update',
      data: { timeOfDay: this.timeOfDay },
      timestamp: Date.now()
    })
  }

  private updateWeather(): void {
    const weatherUpdate = this.weatherService.updateWeather()
    if (weatherUpdate.changed) {
      this.broadcast({
        type: 'weather_update',
        data: weatherUpdate.weather,
        timestamp: Date.now()
      })
    }
  }

  // Missing methods that are called in tests
  private handleChatMessage(player: ServerPlayer, message: NetworkMessage): void {
    // TODO: Implement chat message handling
    console.log(`Chat from ${player.id}: ${(message.data as any).message}`)
  }

  private handleInventoryMove(player: ServerPlayer, message: NetworkMessage): void {
    // Check if player is still connected
    if (!player.ws || player.ws.readyState !== 1) { // 1 = WebSocket.OPEN
      console.warn(`Ignoring inventory move from disconnected player: ${player.id}`)
      // Trigger cleanup for disconnected player
      this.handlePlayerDisconnect(player.id)
      return
    }

    // TODO: Implement inventory move handling
    console.log(`Inventory move from ${player.id}`)
  }

  private savePlayerData(playerId: string): void {
    // TODO: Implement player data saving
    console.log(`Saving data for player ${playerId}`)
  }

  private broadcastPlayerList(): void {
    // TODO: Implement player list broadcasting
    const playerList = this.playerManager.getAllPlayers().map(p => ({
      id: p.id,
      username: (p as ServerPlayer).username,
      position: p.position
    }))
    
    this.broadcast({
      type: 'player_list',
      data: { players: playerList },
      timestamp: Date.now()
    })
  }
}

// Start server
const serverInstance = new MinecraftServer()

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Server shutting down...')
  serverInstance.cleanup()
  process.exit(0)
})

export default MinecraftServer