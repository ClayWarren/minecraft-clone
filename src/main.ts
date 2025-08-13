import { Game } from './Game'
import { GameMode, DEFAULT_GAME_MODE } from './types/game'
import { InventoryComponent } from './components/InventoryComponent'

// UI Elements
const inventoryDisplay = document.getElementById('inventory-display') as HTMLDivElement
const hotbarDisplay = document.getElementById('hotbar') as HTMLDivElement
const craftingUI = document.getElementById('crafting-ui') as HTMLDivElement
const closeCraftingBtn = document.getElementById('close-crafting-btn') as HTMLButtonElement
const craftingRecipesContainer = document.querySelector('.crafting-recipes') as HTMLDivElement

let selectedHotbarSlot = 0 // 0-indexed

// Hardcoded recipes (should ideally come from server or a shared config)
const CRAFTING_RECIPES: Record<
  string,
  { ingredients: Record<string, number>; output: { id: string; quantity: number } }
> = {
  planks: { ingredients: { wood: 1 }, output: { id: 'planks', quantity: 4 } },
  sticks: { ingredients: { planks: 2 }, output: { id: 'sticks', quantity: 4 } },
  wooden_pickaxe: {
    ingredients: { planks: 3, sticks: 2 },
    output: { id: 'wooden_pickaxe', quantity: 1 },
  },
  stone_pickaxe: {
    ingredients: { stone: 3, sticks: 2 },
    output: { id: 'stone_pickaxe', quantity: 1 },
  },
  iron_pickaxe: {
    ingredients: { iron_ingot: 3, sticks: 2 },
    output: { id: 'iron_pickaxe', quantity: 1 },
  },
  diamond_pickaxe: {
    ingredients: { diamond: 3, sticks: 2 },
    output: { id: 'diamond_pickaxe', quantity: 1 },
  },
}

// Function to update inventory UI
function updateInventoryUI(inventory: (import('@/types/items').ItemStack | null)[]): void {
  if (!inventoryDisplay) return

  inventoryDisplay.innerHTML = '' // Clear existing slots

  inventory.forEach((stack, _index) => {
    if (stack) {
      const slot = document.createElement('div')
      slot.classList.add('inventory-slot')
      slot.innerHTML = `<span>${stack.item.name}</span><span class="item-count">${stack.quantity}</span>`
      inventoryDisplay.appendChild(slot)
    }
  })
}

// Function to update hotbar UI
function updateHotbarUI(
  inventory: (import('@/types/items').ItemStack | null)[],
  selectedSlot: number
): void {
  if (!hotbarDisplay) return

  hotbarDisplay.innerHTML = '' // Clear existing slots

  const hotbarSize = 9 // Minecraft hotbar size

  for (let i = 0; i < hotbarSize; i++) {
    const slot = document.createElement('div')
    slot.classList.add('hotbar-slot')
    if (i === selectedSlot) {
      slot.classList.add('active')
    }

    const itemStack = inventory[i]
    if (itemStack) {
      slot.innerHTML = `<span>${itemStack.item.name}</span><span class="item-count">${itemStack.quantity}</span>`
    } else {
      slot.innerHTML = `<span>${i + 1}</span>` // Slot number
    }
    hotbarDisplay.appendChild(slot)
  }
}

// Function to populate crafting UI
function populateCraftingUI(gameInstance: Game): void {
  if (!craftingRecipesContainer) return

  craftingRecipesContainer.innerHTML = '' // Clear existing recipes

  for (const recipeId in CRAFTING_RECIPES) {
    const recipe = CRAFTING_RECIPES[recipeId]
    const recipeCard = document.createElement('div')
    recipeCard.classList.add('recipe-card')

    const ingredientsHtml = Object.entries(recipe.ingredients)
      .map(([item, count]) => `${count} ${item}`)
      .join(', ')

    recipeCard.innerHTML = `
      <h3>${recipe.output.id} (${recipe.output.quantity})</h3>
      <p class="recipe-ingredients">Ingredients: ${ingredientsHtml}</p>
      <button class="craft-button" data-recipe-id="${recipeId}">Craft</button>
    `
    craftingRecipesContainer.appendChild(recipeCard)
  }

  // Add event listeners to craft buttons
  craftingRecipesContainer.querySelectorAll('.craft-button').forEach(button => {
    button.addEventListener('click', event => {
      const recipeId = (event.target as HTMLButtonElement).dataset.recipeId
      if (recipeId) {
        gameInstance.sendCraftingRequest(recipeId)
      }
    })
  })
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing Minecraft Clone...')

  // Get canvas element
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
  if (!canvas) {
    console.error('Canvas element not found!')
    return
  }

  // Determine game mode from URL
  const urlParams = new URLSearchParams(window.location.search)
  const gameMode: GameMode = urlParams.get('multiplayer') === 'true' ? 'multi' : DEFAULT_GAME_MODE

  console.log(`🎮 Starting in ${gameMode}player mode`)

  // Hide menu and show game
  const menu = document.getElementById('menu')
  const gameContainer = document.getElementById('gameContainer')

  if (menu) menu.style.display = 'none'
  if (gameContainer) gameContainer.style.display = 'block'

  // Initialize game
  const game = new Game(canvas, gameMode, updateInventoryUI)

  // Handle game cleanup on page unload
  window.addEventListener('beforeunload', () => {
    game.cleanup()
  })

  // Add global game reference for debugging
  ;(window as unknown as { game: Game }).game = game

  // Initial hotbar update
  updateHotbarUI([], selectedHotbarSlot) // Empty inventory initially

  // Keyboard input for hotbar selection and crafting UI toggle
  document.addEventListener('keydown', event => {
    if (document.pointerLockElement) {
      // Only if cursor is locked
      const numKey = parseInt(event.key)
      if (!isNaN(numKey) && numKey >= 1 && numKey <= 9) {
        selectedHotbarSlot = numKey - 1 // Adjust to 0-indexed
        updateHotbarUI(
          game.getPlayer().getComponent<InventoryComponent>('inventory')!.items,
          selectedHotbarSlot
        )
        // Inform Game.ts about the selected item change
        const inventory = game.getPlayer().getComponent<InventoryComponent>('inventory')!.items
        const selectedItemName = inventory[selectedHotbarSlot]?.item.id || 'air'
        game.setSelectedItem(selectedItemName) // Pass selected item name to Game
      } else if (event.key === 'c' || event.key === 'C') {
        // Toggle crafting UI
        if (craftingUI.style.display === 'block') {
          craftingUI.style.display = 'none'
          document.exitPointerLock()
        } else {
          craftingUI.style.display = 'block'
          populateCraftingUI(game)
          canvas.requestPointerLock() // Re-lock pointer after closing UI
        }
      }
    }
  })

  // Mouse wheel for hotbar selection
  document.addEventListener(
    'wheel',
    event => {
      if (document.pointerLockElement) {
        event.preventDefault() // Prevent page scrolling
        if (event.deltaY < 0) {
          // Scroll up (previous slot)
          selectedHotbarSlot = (selectedHotbarSlot - 1 + 9) % 9
        } else {
          // Scroll down (next slot)
          selectedHotbarSlot = (selectedHotbarSlot + 1) % 9
        }
        updateHotbarUI(
          game.getPlayer().getComponent<InventoryComponent>('inventory')!.items,
          selectedHotbarSlot
        )
        // Inform Game.ts about the selected item change
        const inventory = game.getPlayer().getComponent<InventoryComponent>('inventory')!.items
        const selectedItemName = inventory[selectedHotbarSlot]?.item.id || 'air'
        game.setSelectedItem(selectedItemName) // Pass selected item name to Game
      }
    },
    { passive: false }
  )

  // Close crafting UI button
  if (closeCraftingBtn) {
    closeCraftingBtn.addEventListener('click', () => {
      craftingUI.style.display = 'none'
      canvas.requestPointerLock()
    })
  }
})

// Show instructions
console.log(`
🎮 MINECRAFT CLONE CONTROLS:
- WASD: Move
- Mouse: Look around
- Space: Jump
- Shift: Sneak
- Ctrl: Sprint
- Click: Lock cursor
- ESC: Unlock cursor
- C: Toggle Crafting UI
`)

// Setup menu event listeners
document.addEventListener('DOMContentLoaded', () => {
  const singlePlayerBtn = document.getElementById('singlePlayerBtn')
  const multiPlayerBtn = document.getElementById('multiPlayerBtn')

  if (singlePlayerBtn) {
    singlePlayerBtn.addEventListener('click', () => {
      window.location.href = window.location.pathname + '?mode=single'
    })
  }

  if (multiPlayerBtn) {
    multiPlayerBtn.addEventListener('click', () => {
      window.location.href = window.location.pathname + '?multiplayer=true'
    })
  }
})
