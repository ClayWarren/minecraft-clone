import { System as ISystem, Entity } from '@/types'

export abstract class System implements ISystem {
  public abstract readonly name: string
  protected requiredComponents: string[] = []

  abstract update(deltaTime: number, entities: Entity[]): void

  protected getEntitiesWithComponents(entities: Entity[]): Entity[] {
    if (this.requiredComponents.length === 0) {
      return entities
    }

    return entities.filter(entity =>
      this.requiredComponents.every(component => entity.hasComponent(component))
    )
  }

  cleanup?(): void
}
