import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CraftingService } from '../../src/server/CraftingService'
import type { ServerPlayer } from '../../src/types/server'

describe('CraftingService', () => {
  let craftingService: CraftingService
  let mockPlayer: ServerPlayer

  beforeEach(() => {
    craftingService = new CraftingService()
    
    // Create a mock player with inventory
    mockPlayer = {
      id: 'test-player',
      username: 'TestPlayer',
      position: { x: 0, y: 64, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 20,
      inventory: [
        { item: { id: 'wood', name: 'Wood', stackable: true, maxStackSize: 64 }, quantity: 10 },
        { item: { id: 'stick', name: 'Stick', stackable: true, maxStackSize: 64 }, quantity: 5 },
        null,
        null,
        null
      ],
      isFlying: false,
      isGrounded: true,
      ws: {} as any,
      velocity: { x: 0, y: 0, z: 0 },
      hunger: 20,
      lastUpdate: Date.now()
    }
  })

  describe('craftItem', () => {
    it('should successfully craft a wooden pickaxe with sufficient materials', () => {
      const result = craftingService.craftItem(mockPlayer, 'wooden_pickaxe')

      expect(result.success).toBe(true)
      expect(result.craftedItem).toEqual({ id: 'wooden_pickaxe', quantity: 1 })
      
      // Check that ingredients were consumed
      expect(mockPlayer.inventory[0]?.quantity).toBe(7) // 10 - 3 = 7 wood
      expect(mockPlayer.inventory[1]?.quantity).toBe(3) // 5 - 2 = 3 sticks
      
      // Check that output was added
      expect(mockPlayer.inventory[2]?.item.id).toBe('wooden_pickaxe')
      expect(mockPlayer.inventory[2]?.quantity).toBe(1)
    })

    it('should fail to craft when recipe does not exist', () => {
      const result = craftingService.craftItem(mockPlayer, 'nonexistent_recipe')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Recipe not found.')
    })

    it('should fail to craft when insufficient materials', () => {
      // Remove wood from inventory
      mockPlayer.inventory[0] = null

      const result = craftingService.craftItem(mockPlayer, 'wooden_pickaxe')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Not enough wood')
    })

    it('should handle crafting with exact material requirements', () => {
      // Set exact required amounts
      mockPlayer.inventory[0] = { item: { id: 'wood', name: 'Wood', stackable: true, maxStackSize: 64 }, quantity: 3 }
      mockPlayer.inventory[1] = { item: { id: 'stick', name: 'Stick', stackable: true, maxStackSize: 64 }, quantity: 2 }

      const result = craftingService.craftItem(mockPlayer, 'wooden_pickaxe')

      expect(result.success).toBe(true)
      // Check that ingredients were consumed and output was added
      expect(mockPlayer.inventory[0]?.item.id).toBe('wooden_pickaxe')
      expect(mockPlayer.inventory[0]?.quantity).toBe(1)
      expect(mockPlayer.inventory[1]).toBeNull()
    })

    it('should stack items correctly when adding to existing stack', () => {
      // Add existing wooden pickaxe to inventory
      mockPlayer.inventory[2] = { item: { id: 'wooden_pickaxe', name: 'Wooden Pickaxe', stackable: true, maxStackSize: 64 }, quantity: 1 }

      const result = craftingService.craftItem(mockPlayer, 'wooden_pickaxe')

      expect(result.success).toBe(true)
      expect(mockPlayer.inventory[2]?.quantity).toBe(2)
    })
  })

  describe('recipe management', () => {
    it('should return existing recipe', () => {
      const recipe = craftingService.getRecipe('wooden_pickaxe')
      
      expect(recipe).toBeDefined()
      expect(recipe?.id).toBe('wooden_pickaxe')
      expect(recipe?.ingredients).toEqual({ 'wood': 3, 'stick': 2 })
      expect(recipe?.output).toEqual({ 'wooden_pickaxe': 1 })
    })

    it('should return undefined for non-existent recipe', () => {
      const recipe = craftingService.getRecipe('nonexistent')
      
      expect(recipe).toBeUndefined()
    })

    it('should add new recipe', () => {
      const newRecipe = {
        id: 'test_recipe',
        ingredients: { 'test_item': 1 },
        output: { 'test_output': 1 }
      }

      craftingService.addRecipe(newRecipe)
      const retrievedRecipe = craftingService.getRecipe('test_recipe')
      
      expect(retrievedRecipe).toEqual(newRecipe)
    })

    it('should remove existing recipe', () => {
      const removed = craftingService.removeRecipe('wooden_pickaxe')
      
      expect(removed).toBe(true)
      expect(craftingService.getRecipe('wooden_pickaxe')).toBeUndefined()
    })

    it('should return false when removing non-existent recipe', () => {
      const removed = craftingService.removeRecipe('nonexistent')
      
      expect(removed).toBe(false)
    })

    it('should return all recipes', () => {
      const recipes = craftingService.getAllRecipes()
      
      expect(recipes).toBeDefined()
      expect(Object.keys(recipes).length).toBeGreaterThan(0)
      expect(recipes['wooden_pickaxe']).toBeDefined()
      expect(recipes['stone_pickaxe']).toBeDefined()
    })
  })

  describe('inventory management', () => {
    it('should handle empty inventory slots correctly', () => {
      // Clear inventory
      mockPlayer.inventory = [null, null, null, null, null]

      const result = craftingService.craftItem(mockPlayer, 'stick')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Not enough wood')
    })

    it('should handle partial ingredient consumption', () => {
      // Set up inventory with multiple stacks of same item
      mockPlayer.inventory = [
        { item: { id: 'wood', name: 'Wood', stackable: true, maxStackSize: 64 }, quantity: 1 },
        { item: { id: 'wood', name: 'Wood', stackable: true, maxStackSize: 64 }, quantity: 1 },
        { item: { id: 'wood', name: 'Wood', stackable: true, maxStackSize: 64 }, quantity: 1 },
        null,
        null
      ]

      const result = craftingService.craftItem(mockPlayer, 'stick')

      expect(result.success).toBe(true)
      // Should consume from first stack, then second stack, and add output to first empty slot
      expect(mockPlayer.inventory[0]?.item.id).toBe('stick')
      expect(mockPlayer.inventory[0]?.quantity).toBe(4)
      expect(mockPlayer.inventory[1]).toBeNull()
      expect(mockPlayer.inventory[2]?.quantity).toBe(1)
    })
  })
})
