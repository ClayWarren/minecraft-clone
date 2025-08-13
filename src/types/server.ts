// Shared types between client and server
export interface Player {
  id: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  username: string
  health: number
  inventory: Map<string, number>
  isFlying: boolean
  isGrounded: boolean
}

export interface Block {
  type: string
  position: { x: number; y: number; z: number }
  metadata?: any
}

export interface Chunk {
  x: number
  z: number
  blocks: Map<string, string>
  generated: boolean
  modified: boolean
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

// Network message types
export interface NetworkMessage {
  type: string
  data: any
  timestamp: number
}

export interface PlayerUpdateMessage extends NetworkMessage {
  type: 'player_update'
  data: {
    playerId: string
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
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