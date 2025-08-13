// Shared types between client and server
export interface Player {
  id: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  username: string
  health: number
  inventory: (import('./items').ItemStack | null)[]
  isFlying: boolean
  isGrounded: boolean
}

// Custom error for critical network issues
export class CriticalNetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CriticalNetworkError'
  }
}

export interface ServerPlayer extends Player {
  ws: WebSocket
  velocity: { x: number; y: number; z: number }
  hunger: number
  lastUpdate: number
  lastActivity: number
  pendingMessages: NetworkMessage[]
  messageHandler?: (data: string) => void
  closeHandler?: () => void
}

export interface Block {
  type: string
  position: { x: number; y: number; z: number }
  metadata?: Record<string, unknown>
}

export interface Chunk {
  x: number
  z: number
  blocks: Map<string, string>
  generated: boolean
  modified: boolean
  dirty?: boolean
  loaded?: boolean
  entities?: unknown[]
}

export interface BiomeDefinition {
  surface: string
  subsurface: string
  treeChance: number
  villageChance: number
  temperature: number
  humidity: number
}

export interface Weather {
  type: 'clear' | 'rain' | 'snow' | 'storm'
  intensity: number
  duration: number
  nextWeatherChange: number
}

export interface GameState {
  timeOfDay: number
  weather: Weather
  players: Map<string, Player>
  chunks: Map<string, Chunk>
}

export interface GameMode {
  type: 'survival' | 'creative' | 'adventure' | 'spectator'
  canBreakBlocks: boolean
  canPlaceBlocks: boolean
  canTakeDamage: boolean
  canFly: boolean
}

// Network message types
export interface NetworkMessage {
  type: string
  data: unknown
  timestamp: number
}

export interface PlayerUpdateMessage extends NetworkMessage {
  type: 'player_update'
  data: {
    playerId: string
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
    health?: number
    hunger?: number
    inventory?: (import('./items').ItemStack | null)[]
  }
}

export interface BlockUpdateMessage extends NetworkMessage {
  type: 'block_update'
  data: {
    position: { x: number; y: number; z: number }
    blockType: string | null
    playerId: string
  }
}

export interface ChunkDataMessage extends NetworkMessage {
  type: 'chunk_data'
  data: {
    chunkX: number
    chunkZ: number
    blocks: Array<{ x: number; y: number; z: number; type: string }>
  }
}

export interface WeatherUpdateMessage extends NetworkMessage {
  type: 'weather_update'
  data: Weather
}

export interface TimeUpdateMessage extends NetworkMessage {
  type: 'time_update'
  data: {
    timeOfDay: number
  }
}

export interface CraftingRequestMessage extends NetworkMessage {
  type: 'crafting_request'
  data: {
    recipeId: string
  }
}

export interface CraftingResponseMessage extends NetworkMessage {
  type: 'crafting_response'
  data: {
    success: boolean
    message?: string
    craftedItem?: { id: string; quantity: number }
  }
}

export interface Mob {
  id: string
  type: string
  position: { x: number; y: number; z: number }
  health: number
  rotation?: { x: number; y: number; z: number }
  velocity?: { x: number; y: number; z: number }
}

export interface MobSpawnMessage extends NetworkMessage {
  type: 'mob_spawn'
  data: Mob
}

export interface MobUpdateMessage extends NetworkMessage {
  type: 'mob_update'
  data: Mob
}

export interface MobDespawnMessage extends NetworkMessage {
  type: 'mob_despawn'
  data: { mobId: string }
}

export interface AttackMessage extends NetworkMessage {
  type: 'attack'
  data: {
    targetId: string
    damage: number
    attackerId: string
  }
}

export interface GameModeUpdateMessage extends NetworkMessage {
  type: 'game_mode_update'
  data: {
    gameMode: GameMode
  }
}
