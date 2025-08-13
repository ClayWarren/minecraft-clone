import { Vector3, Mesh } from 'three'
import {
  Component,
  TransformComponent as ITransformComponent,
  VelocityComponent as IVelocityComponent,
  MeshComponent as IMeshComponent,
  CollisionComponent as ICollisionComponent,
  HealthComponent as IHealthComponent,
} from '@/types'

export class TransformComponent implements ITransformComponent {
  readonly type = 'transform'
  public position: Vector3
  public rotation: Vector3
  public scale: Vector3

  constructor(
    position = new Vector3(0, 0, 0),
    rotation = new Vector3(0, 0, 0),
    scale = new Vector3(1, 1, 1)
  ) {
    this.position = position
    this.rotation = rotation
    this.scale = scale
  }
}

export class VelocityComponent implements IVelocityComponent {
  readonly type = 'velocity'
  public velocity: Vector3
  public acceleration: Vector3
  public isGrounded: boolean
  public jumpHeight: number
  public speed: number

  constructor(
    velocity = new Vector3(0, 0, 0),
    acceleration = new Vector3(0, 0, 0),
    isGrounded = false,
    jumpHeight = 1,
    speed = 1
  ) {
    this.velocity = velocity
    this.acceleration = acceleration
    this.isGrounded = isGrounded
    this.jumpHeight = jumpHeight
    this.speed = speed
  }
}

export class MeshComponent implements IMeshComponent {
  readonly type = 'mesh'
  public mesh: Mesh
  public visible: boolean

  constructor(mesh: Mesh, visible = true) {
    this.mesh = mesh
    this.visible = visible
  }
}

export class CollisionComponent implements ICollisionComponent {
  readonly type = 'collision'
  public bounds: Vector3
  public solid: boolean

  constructor(bounds = new Vector3(1, 1, 1), solid = true) {
    this.bounds = bounds
    this.solid = solid
  }
}

export class HealthComponent implements IHealthComponent {
  readonly type = 'health'
  public current: number
  public maximum: number

  constructor(maximum = 100) {
    this.maximum = maximum
    this.current = maximum
  }

  heal(amount: number): void {
    this.current = Math.min(this.current + amount, this.maximum)
  }

  damage(amount: number): void {
    this.current = Math.max(this.current - amount, 0)
  }

  isDead(): boolean {
    return this.current <= 0
  }
}

// InventoryComponent is now exported from InventoryComponent.ts (ItemStack[] version)

export class PlayerComponent implements Component {
  readonly type = 'player'

  constructor(
    public movementSpeed = 5,
    public jumpHeight = 8,
    public isGrounded = false,
    public canFly = false
  ) {}
}

export class AIComponent implements Component {
  readonly type = 'ai'

  constructor(
    public behavior: 'passive' | 'hostile' | 'neutral' = 'passive',
    public target: Vector3 | null = null,
    public alertRadius = 10,
    public attackRadius = 2
  ) {}
}

// Re-export block components
export * from './BlockComponent'
export * from './InventoryComponent'
// export * from './HealthComponent' // No separate file, class is defined above
export * from './MobComponent'
