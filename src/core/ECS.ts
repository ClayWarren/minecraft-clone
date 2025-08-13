import { Entity } from './Entity'
import { System } from './System'

export interface Component {
  readonly type: string
}

export class ECS {
  private entities: Map<string, Entity> = new Map()
  private systems: System[] = []

  // Entity management
  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity)
  }

  removeEntity(entityId: string): void {
    this.entities.delete(entityId)
  }

  getEntity(entityId: string): Entity | undefined {
    return this.entities.get(entityId)
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values())
  }

  getEntitiesWithComponent(componentType: string): Entity[] {
    return this.getAllEntities().filter(entity => entity.hasComponent(componentType))
  }

  getEntitiesWithComponents(...componentTypes: string[]): Entity[] {
    return this.getAllEntities().filter(entity =>
      componentTypes.every(type => entity.hasComponent(type))
    )
  }

  // System management
  addSystem(system: System): void {
    this.systems.push(system)
  }

  removeSystem(systemName: string): void {
    this.systems = this.systems.filter(system => system.name !== systemName)
  }

  getSystem(systemName: string): System | undefined {
    return this.systems.find(system => system.name === systemName)
  }

  // Update loop
  update(deltaTime: number): void {
    const entities = this.getAllEntities()

    for (const system of this.systems) {
      system.update(deltaTime, entities)
    }
  }

  // Cleanup
  cleanup(): void {
    for (const system of this.systems) {
      if (system.cleanup) {
        system.cleanup()
      }
    }

    this.entities.clear()
    this.systems = []
  }
}
