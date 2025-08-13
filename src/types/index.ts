import { Vector3, Mesh } from 'three'

// Core game types
export interface BlockType {
  name: string
  color: number
  hardness: number
  toolRequired?: string
  drops?: string[]
  transparent?: boolean
  liquid?: boolean
}

export interface BiomeType {
  name: string
  temperature: number
  humidity: number
  surfaceBlock: string
  subsurfaceBlock: string
  treeChance: number
  villageChance: number
}

export interface PlayerInput {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  jump: boolean
  sprint: boolean
  sneak: boolean
  mouseX: number
  mouseY: number
  leftClick: boolean
  rightClick: boolean
}

export interface ChunkCoordinate {
  x: number
  z: number
}

export interface BlockPosition {
  x: number
  y: number
  z: number
}

export type GameMode = 'single' | 'multi'

// ECS Component interfaces
export interface Component {
  readonly type: string
}

export interface Entity {
  readonly id: string
  components: Map<string, Component>
  addComponent(component: Component): void
  removeComponent(type: string): void
  getComponent<T extends Component>(type: string): T | undefined
  hasComponent(type: string): boolean
}

export interface System {
  readonly name: string
  update(deltaTime: number, entities: Entity[]): void
  cleanup?(): void
}

// Component types
export interface TransformComponent extends Component {
  position: Vector3
  rotation: Vector3
  scale: Vector3
}

export interface VelocityComponent extends Component {
  velocity: Vector3
  acceleration: Vector3
  isGrounded: boolean
  jumpHeight: number
  speed: number
}

export interface MeshComponent extends Component {
  mesh: Mesh
  visible: boolean
}

export interface CollisionComponent extends Component {
  bounds: Vector3
  solid: boolean
}

export interface HealthComponent extends Component {
  current: number
  maximum: number
}

export interface Weather {
  type: 'clear' | 'rain' | 'snow'
  intensity: number
}

export interface Game {
  ws: WebSocket
  // Add other game properties as needed
}

declare global {
  interface Window {
    game: Game
    updateHotbar?: (items: Map<string, number>) => void
  }
}

export interface InventoryComponent extends Component {
  items: Map<string, number>
  selectedSlot: number
  maxSlots: number
}
