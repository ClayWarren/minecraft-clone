import type { ServerPlayer } from '../types/server'

interface CraftingRecipe {
  id: string
  ingredients: Record<string, number>
  output: Record<string, number>
  requiresTable?: boolean
}

interface CraftingResult {
  success: boolean
  message?: string
  craftedItem?: { id: string; quantity: number }
}

export class CraftingService {
  private craftingRecipes: Record<string, CraftingRecipe> = {
    wooden_pickaxe: {
      id: 'wooden_pickaxe',
      ingredients: { wood: 3, stick: 2 },
      output: { wooden_pickaxe: 1 },
    },
    stone_pickaxe: {
      id: 'stone_pickaxe',
      ingredients: { cobblestone: 3, stick: 2 },
      output: { stone_pickaxe: 1 },
    },
    iron_pickaxe: {
      id: 'iron_pickaxe',
      ingredients: { iron_ingot: 3, stick: 2 },
      output: { iron_pickaxe: 1 },
    },
    wooden_sword: {
      id: 'wooden_sword',
      ingredients: { wood: 2, stick: 1 },
      output: { wooden_sword: 1 },
    },
    stone_sword: {
      id: 'stone_sword',
      ingredients: { cobblestone: 2, stick: 1 },
      output: { stone_sword: 1 },
    },
    iron_sword: {
      id: 'iron_sword',
      ingredients: { iron_ingot: 2, stick: 1 },
      output: { iron_sword: 1 },
    },
    stick: {
      id: 'stick',
      ingredients: { wood: 2 },
      output: { stick: 4 },
    },
    torch: {
      id: 'torch',
      ingredients: { coal: 1, stick: 1 },
      output: { torch: 4 },
    },
    furnace: {
      id: 'furnace',
      ingredients: { cobblestone: 8 },
      output: { furnace: 1 },
    },
    chest: {
      id: 'chest',
      ingredients: { wood: 8 },
      output: { chest: 1 },
    },
  }

  public craftItem(player: ServerPlayer, recipeId: string): CraftingResult {
    const recipe = this.craftingRecipes[recipeId]

    if (!recipe) {
      return {
        success: false,
        message: 'Recipe not found.',
      }
    }

    // Check if player has ingredients
    for (const ingredient in recipe.ingredients) {
      const requiredAmount = recipe.ingredients[ingredient]
      // Count total of ingredient in inventory
      let playerAmount = 0
      for (const stack of player.inventory) {
        if (stack && stack.item.id === ingredient) playerAmount += stack.quantity
      }
      if (playerAmount < requiredAmount) {
        return {
          success: false,
          message: `Not enough ${ingredient}. Need ${requiredAmount}, have ${playerAmount}.`,
        }
      }
    }

    // Consume ingredients
    for (const ingredient in recipe.ingredients) {
      const requiredAmount = recipe.ingredients[ingredient]
      // Remove requiredAmount from inventory
      let toRemove = requiredAmount
      for (let i = 0; i < player.inventory.length && toRemove > 0; i++) {
        const stack = player.inventory[i]
        if (stack && stack.item.id === ingredient) {
          const removeQty = Math.min(stack.quantity, toRemove)
          stack.quantity -= removeQty
          toRemove -= removeQty
          if (stack.quantity === 0) {
            player.inventory[i] = null
          }
        }
      }
    }

    // Add output to inventory
    for (const outputItem in recipe.output) {
      const outputAmount = recipe.output[outputItem]
      // Add outputAmount to inventory
      let added = false
      for (const stack of player.inventory) {
        if (stack && stack.item.id === outputItem) {
          stack.quantity += outputAmount
          added = true
          break
        }
      }
      if (!added) {
        const emptyIdx = player.inventory.findIndex(s => s === null)
        if (emptyIdx !== -1) {
          player.inventory[emptyIdx] = {
            item: { id: outputItem, name: outputItem, stackable: true, maxStackSize: 64 },
            quantity: outputAmount,
          }
        }
      }

      console.log(`Player ${player.id} crafted ${outputAmount} ${outputItem}.`)

      return {
        success: true,
        craftedItem: { id: outputItem, quantity: outputAmount },
      }
    }

    return {
      success: false,
      message: 'Failed to craft item.',
    }
  }

  public getRecipe(recipeId: string): CraftingRecipe | undefined {
    return this.craftingRecipes[recipeId]
  }

  public getAllRecipes(): Record<string, CraftingRecipe> {
    return this.craftingRecipes
  }

  public addRecipe(recipe: CraftingRecipe): void {
    this.craftingRecipes[recipe.id] = recipe
  }

  public removeRecipe(recipeId: string): boolean {
    if (this.craftingRecipes[recipeId]) {
      delete this.craftingRecipes[recipeId]
      return true
    }
    return false
  }
}
