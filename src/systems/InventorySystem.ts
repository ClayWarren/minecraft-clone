import { System } from '@/core/System'
import { Entity } from '@/core/Entity'

export class InventorySystem extends System {
  public readonly name = 'inventory'

  constructor() {
    super()
  }

  update(_deltaTime: number, entities: Entity[]): void {
    for (const entity of entities) {
      if (!entity.hasComponent('inventory')) {
        continue
      }

      // Get the inventory component (currently unused)
      // In the future, we can add logic here to handle inventory updates,
      // such as checking for item durability, applying effects, etc.
      // const inventory = entity.getComponent<InventoryComponent>('inventory')
    }
  }
}
