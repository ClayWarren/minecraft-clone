import { Component } from '@/core/ECS'
import { ItemStack } from '@/types/items'

export class InventoryComponent implements Component {
  public readonly type = 'inventory'

  public items: (ItemStack | null)[]
  public size: number
  public hotbarSize: number

  constructor(size = 36, hotbarSize = 9) {
    this.size = size
    this.hotbarSize = hotbarSize
    this.items = new Array(size).fill(null)
  }

  public addItem(itemStack: ItemStack): boolean {
    // First, try to stack with existing items
    for (let i = 0; i < this.size; i++) {
      const existingStack = this.items[i]
      if (
        existingStack &&
        existingStack.item.id === itemStack.item.id &&
        existingStack.item.stackable &&
        existingStack.quantity < existingStack.item.maxStackSize
      ) {
        const canAdd = existingStack.item.maxStackSize - existingStack.quantity
        const toAdd = Math.min(canAdd, itemStack.quantity)
        existingStack.quantity += toAdd
        itemStack.quantity -= toAdd

        if (itemStack.quantity === 0) {
          return true
        }
      }
    }

    // Next, find an empty slot
    for (let i = 0; i < this.size; i++) {
      if (!this.items[i]) {
        this.items[i] = { ...itemStack }
        itemStack.quantity = 0
        return true
      }
    }

    return false // Inventory is full
  }

  public removeItem(slot: number, quantity = 1): boolean {
    const itemStack = this.items[slot]
    if (itemStack) {
      itemStack.quantity -= quantity
      if (itemStack.quantity <= 0) {
        this.items[slot] = null
      }
      return true
    }
    return false
  }

  public getItem(slot: number): ItemStack | null {
    return this.items[slot]
  }

  public hasItem(itemId: string, quantity = 1): boolean {
    let count = 0
    for (const itemStack of this.items) {
      if (itemStack && itemStack.item.id === itemId) {
        count += itemStack.quantity
      }
    }
    return count >= quantity
  }
}
