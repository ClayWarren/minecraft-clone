import { System } from '@/core/System'
import { Entity } from '@/core/Entity'
import { InventoryComponent } from '@/components/InventoryComponent'

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

      const _inventory = entity.getComponent<InventoryComponent>('inventory')
      // In the future, we can add logic here to handle inventory updates,
      // such as checking for item durability, applying effects, etc.
    }
  }
}
