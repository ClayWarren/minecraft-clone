import { WebSocket, WebSocketServer } from 'ws'
import * as fs from 'fs'
import * as path from 'path'
import type { 
  Player, 
  BiomeDefinition, 
  Weather, 
  NetworkMessage,
  PlayerUpdateMessage,
  BlockUpdateMessage,
  ChunkDataMessage 
} from './src/types/server'

interface ServerPlayer extends Player {
  ws: WebSocket
  velocity: { x: number; y: number; z: number }
  hunger: number
  lastUpdate: number
}

interface CraftingRecipe {
  ingredients: Record<string, number>
  output: Record<string, number>
  durability?: number
}

class MinecraftServer {
  private wss: WebSocketServer
  private players: Map<string, ServerPlayer> = new Map()
  private blockData: Map<string, string> = new Map()
  private readonly chunkSize = 16
  private loadedChunks: Set<string> = new Set()
  // TODO: Implement structure generation
  // private _generatedStructures: Set<string> = new Set()
  // private _villages: Map<string, any> = new Map()

  // Game systems
  private timeOfDay = 0
  private readonly dayLength = 20 * 60 * 1000 // 20 minutes
  private startTime = Date.now()

  // Weather system
  private weather: Weather = {
    type: 'clear',
    intensity: 0,
    duration: 0,
    nextWeatherChange: Date.now() + Math.random() * 300000 + 60000
  }

  // TODO: Implement water physics
  // private _waterUpdates: Set<string> = new Set()
  // private _waterFlowTimer = 0

  // Biome definitions (TODO: Use in world generation)
  private biomes: Record<string, BiomeDefinition> = {
    plains: { surface: 'grass', subsurface: 'dirt', treeChance: 0.02, villageChance: 0.01, temperature: 0.8, humidity: 0.4 },
    desert: { surface: 'sand', subsurface: 'sandstone', treeChance: 0.001, villageChance: 0.005, temperature: 2.0, humidity: 0.0 },
    forest: { surface: 'grass', subsurface: 'dirt', treeChance: 0.08, villageChance: 0.003, temperature: 0.7, humidity: 0.8 },
    ocean: { surface: 'water', subsurface: 'sand', treeChance: 0, villageChance: 0, temperature: 0.5, humidity: 0.5 },
    tundra: { surface: 'snow', subsurface: 'dirt', treeChance: 0.01, villageChance: 0.002, temperature: 0.0, humidity: 0.5 },
    mountains: { surface: 'stone', subsurface: 'stone', treeChance: 0.005, villageChance: 0.001, temperature: 0.2, humidity: 0.3 }
  }

  // Block properties (TODO: Use in mining system)
  private blockProperties: Record<string, any> = {
    grass: { hardness: 0.6, tool: 'shovel', drops: ['dirt'], transparent: false },
    dirt: { hardness: 0.5, tool: 'shovel', drops: ['dirt'], transparent: false },
    stone: { hardness: 1.5, tool: 'pickaxe', drops: ['stone'], transparent: false },
    wood: { hardness: 2.0, tool: 'axe', drops: ['wood'], transparent: false },
    sand: { hardness: 0.5, tool: 'shovel', drops: ['sand'], transparent: false },
    water: { hardness: -1, tool: null, drops: [], transparent: true, liquid: true },
    bedrock: { hardness: -1, tool: null, drops: [], transparent: false },
    coal_ore: { hardness: 3.0, tool: 'pickaxe', drops: ['coal'], transparent: false },
    iron_ore: { hardness: 3.0, tool: 'pickaxe', drops: ['iron_ore'], transparent: false },
    diamond_ore: { hardness: 3.0, tool: 'pickaxe', drops: ['diamond'], transparent: false }
  }

  // Crafting recipes (TODO: Use in crafting system)
  private craftingRecipes: Record<string, CraftingRecipe> = {
    planks: { ingredients: { wood: 1 }, output: { planks: 4 } },
    sticks: { ingredients: { planks: 2 }, output: { sticks: 4 } },
    wooden_pickaxe: { ingredients: { planks: 3, sticks: 2 }, output: { wooden_pickaxe: 1 }, durability: 59 },
    stone_pickaxe: { ingredients: { stone: 3, sticks: 2 }, output: { stone_pickaxe: 1 }, durability: 131 },
    iron_pickaxe: { ingredients: { iron_ingot: 3, sticks: 2 }, output: { iron_pickaxe: 1 }, durability: 250 },
    diamond_pickaxe: { ingredients: { diamond: 3, sticks: 2 }, output: { diamond_pickaxe: 1 }, durability: 1561 }
  }

  constructor() {
    this.wss = new WebSocketServer({ port: 8080 })
    
    // Suppress unused variable warnings for future features
    void this.biomes
    void this.blockProperties
    void this.craftingRecipes
    
    this.init()
  }

  private init(): void {
    console.log('🎮 Minecraft Server (TypeScript) starting...')

    // Load world if exists
    this.loadWorld()

    // Start game loops
    this.startGameLoop()
    this.startPhysicsLoop()
    this.startWeatherLoop()

    // Setup WebSocket handlers
    this.setupWebSocket()

    console.log('✅ Minecraft Server ready on port 8080!')
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.handlePlayerConnect(ws)
    })
  }

  private handlePlayerConnect(ws: WebSocket): void {
    const playerId = this.generatePlayerId()
    console.log(`👤 Player ${playerId} connected`)

    // Initialize player data
    const player: ServerPlayer = {
      id: playerId,
      ws: ws,
      position: { x: 0, y: 80, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      username: `Player${playerId}`,
      velocity: { x: 0, y: 0, z: 0 },
      health: 20,
      hunger: 20,
      inventory: new Map([
        ['grass', 64], ['dirt', 64], ['stone', 64], ['wood', 32], ['sand', 32], ['bedrock', 999],
        ['coal_ore', 0], ['iron_ore', 0], ['diamond_ore', 0],
        ['wooden_pickaxe', 0], ['stone_pickaxe', 0], ['iron_pickaxe', 0], ['diamond_pickaxe', 0]
      ]),
      isFlying: false,
      isGrounded: false,
      lastUpdate: Date.now()
    }

    this.players.set(playerId, player)

    // Setup message handling
    ws.on('message', (data: Buffer) => {
      try {
        const message: NetworkMessage = JSON.parse(data.toString())
        this.handleMessage(playerId, message)
      } catch (error) {
        console.error(`Error parsing message from ${playerId}:`, error)
      }
    })

    ws.on('close', () => {
      this.handlePlayerDisconnect(playerId)
    })

    ws.on('error', (error) => {
      console.error(`WebSocket error for player ${playerId}:`, error)
      this.handlePlayerDisconnect(playerId)
    })

    // Send initial game state
    this.sendInitialGameState(player)
  }

  private generatePlayerId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  private handleMessage(playerId: string, message: NetworkMessage): void {
    const player = this.players.get(playerId)
    if (!player) return

    switch (message.type) {
      case 'player_update':
        this.handlePlayerUpdate(playerId, message as PlayerUpdateMessage)
        break
      case 'block_update':
        this.handleBlockUpdate(playerId, message as BlockUpdateMessage)
        break
      case 'chunk_request':
        this.handleChunkRequest(playerId, message.data.chunkX, message.data.chunkZ)
        break
      default:
        console.warn(`Unknown message type: ${message.type}`)
    }
  }

  private handlePlayerUpdate(playerId: string, message: PlayerUpdateMessage): void {
    const player = this.players.get(playerId)
    if (!player) return

    player.position = message.data.position
    player.rotation = message.data.rotation
    player.lastUpdate = Date.now()

    // Broadcast to other players
    this.broadcastToOthers(playerId, message)
  }

  private handleBlockUpdate(playerId: string, message: BlockUpdateMessage): void {
    void playerId // Suppress unused warning
    
    const { position, blockType } = message.data
    const key = `${position.x},${position.y},${position.z}`

    if (blockType === null) {
      // Remove block
      this.blockData.delete(key)
    } else {
      // Place block
      this.blockData.set(key, blockType)
    }

    // Broadcast to all players
    this.broadcast(message)

    // TODO: Mark chunk as modified for saving
    void position // Future implementation will use these
  }

  private handleChunkRequest(playerId: string, chunkX: number, chunkZ: number): void {
    const chunkKey = `${chunkX},${chunkZ}`
    
    if (!this.loadedChunks.has(chunkKey)) {
      this.generateChunk(chunkX, chunkZ)
    }

    this.sendChunkData(playerId, chunkX, chunkZ)
  }

  private generateChunk(chunkX: number, chunkZ: number): void {
    const chunkKey = `${chunkX},${chunkZ}`
    
    // Basic terrain generation (simplified)
    for (let x = 0; x < this.chunkSize; x++) {
      for (let z = 0; z < this.chunkSize; z++) {
        const worldX = chunkX * this.chunkSize + x
        const worldZ = chunkZ * this.chunkSize + z
        
        // Simple height map
        const height = Math.floor(30 + Math.sin(worldX * 0.1) * 10 + Math.cos(worldZ * 0.1) * 10)
        
        // Generate terrain layers
        for (let y = 0; y <= height; y++) {
          const blockKey = `${worldX},${y},${worldZ}`
          
          if (y === height) {
            this.blockData.set(blockKey, 'grass')
          } else if (y >= height - 3) {
            this.blockData.set(blockKey, 'dirt')
          } else {
            this.blockData.set(blockKey, 'stone')
          }
        }
      }
    }

    this.loadedChunks.add(chunkKey)
  }

  private sendChunkData(playerId: string, chunkX: number, chunkZ: number): void {
    const player = this.players.get(playerId)
    if (!player) return

    const blocks: Array<{ x: number; y: number; z: number; type: string }> = []

    // Collect all blocks in chunk
    for (let x = 0; x < this.chunkSize; x++) {
      for (let z = 0; z < this.chunkSize; z++) {
        for (let y = 0; y < 256; y++) {
          const worldX = chunkX * this.chunkSize + x
          const worldZ = chunkZ * this.chunkSize + z
          const blockKey = `${worldX},${y},${worldZ}`
          
          const blockType = this.blockData.get(blockKey)
          if (blockType) {
            blocks.push({ x: worldX, y, z: worldZ, type: blockType })
          }
        }
      }
    }

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
      data: this.weather,
      timestamp: Date.now()
    })

    // Send nearby chunks
    const chunkX = Math.floor(player.position.x / this.chunkSize)
    const chunkZ = Math.floor(player.position.z / this.chunkSize)
    
    for (let x = chunkX - 2; x <= chunkX + 2; x++) {
      for (let z = chunkZ - 2; z <= chunkZ + 2; z++) {
        this.handleChunkRequest(player.id, x, z)
      }
    }
  }

  private handlePlayerDisconnect(playerId: string): void {
    console.log(`👤 Player ${playerId} disconnected`)
    this.players.delete(playerId)
  }

  private sendToPlayer(playerId: string, message: NetworkMessage): void {
    const player = this.players.get(playerId)
    if (player && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message))
    }
  }

  private broadcast(message: NetworkMessage): void {
    const messageStr = JSON.stringify(message)
    this.players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(messageStr)
      }
    })
  }

  private broadcastToOthers(excludePlayerId: string, message: NetworkMessage): void {
    const messageStr = JSON.stringify(message)
    this.players.forEach((player, playerId) => {
      if (playerId !== excludePlayerId && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(messageStr)
      }
    })
  }

  private startGameLoop(): void {
    setInterval(() => {
      this.updateTime()
      this.updateWeather()
    }, 1000) // Update every second
  }

  private startPhysicsLoop(): void {
    setInterval(() => {
      this.updatePlayerPhysics()
    }, 50) // 20 TPS
  }

  private startWeatherLoop(): void {
    setInterval(() => {
      this.updateWeatherEffects()
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
    if (Date.now() > this.weather.nextWeatherChange) {
      this.changeWeather()
    }
  }

  private changeWeather(): void {
    const weatherTypes: Array<Weather['type']> = ['clear', 'rain', 'snow', 'storm']
    this.weather.type = weatherTypes[Math.floor(Math.random() * weatherTypes.length)]
    this.weather.intensity = Math.random()
    this.weather.duration = 60000 + Math.random() * 300000 // 1-6 minutes
    this.weather.nextWeatherChange = Date.now() + this.weather.duration

    console.log(`🌤️ Weather changed to: ${this.weather.type}`)

    this.broadcast({
      type: 'weather_update',
      data: this.weather,
      timestamp: Date.now()
    })
  }

  private updateWeatherEffects(): void {
    // TODO: Implement weather effects on world
  }

  private updatePlayerPhysics(): void {
    this.players.forEach(player => {
      // Basic gravity and collision
      if (!player.isGrounded) {
        player.velocity.y -= 0.98 // Gravity
      }

      // Simple ground check
      const groundY = this.getGroundHeight(player.position.x, player.position.z)
      if (player.position.y <= groundY + 1.8) {
        player.position.y = groundY + 1.8
        player.velocity.y = 0
        player.isGrounded = true
      } else {
        player.isGrounded = false
      }

      // Apply velocity
      player.position.x += player.velocity.x
      player.position.y += player.velocity.y
      player.position.z += player.velocity.z

      // Apply friction
      player.velocity.x *= 0.8
      player.velocity.z *= 0.8
    })
  }

  private getGroundHeight(x: number, z: number): number {
    // Find the highest block at this position
    for (let y = 255; y >= 0; y--) {
      const blockKey = `${Math.floor(x)},${y},${Math.floor(z)}`
      if (this.blockData.has(blockKey)) {
        return y
      }
    }
    return 0
  }

  private loadWorld(): void {
    try {
      const worldPath = path.join(process.cwd(), 'world.json')
      if (fs.existsSync(worldPath)) {
        const worldData = JSON.parse(fs.readFileSync(worldPath, 'utf8'))
        this.blockData = new Map(worldData.blocks || [])
        console.log('🌍 World loaded successfully')
      }
    } catch (error) {
      console.error('Error loading world:', error)
    }
  }

  public saveWorld(): void {
    try {
      const worldData = {
        blocks: Array.from(this.blockData.entries()),
        timestamp: Date.now()
      }
      const worldPath = path.join(process.cwd(), 'world.json')
      fs.writeFileSync(worldPath, JSON.stringify(worldData))
      console.log('🌍 World saved successfully')
    } catch (error) {
      console.error('Error saving world:', error)
    }
  }
}

// Start server
new MinecraftServer()

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Server shutting down...')
  process.exit(0)
})

export default MinecraftServer