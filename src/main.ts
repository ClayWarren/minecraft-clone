import { Game } from './Game'
import { GameMode } from './types'

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
  const gameMode: GameMode = urlParams.get('multiplayer') === 'true' ? 'multi' : 'single'
  
  console.log(`🎮 Starting in ${gameMode}player mode`)

  // Hide menu and show game
  const menu = document.getElementById('menu')
  const gameContainer = document.getElementById('gameContainer')
  
  if (menu) menu.style.display = 'none'
  if (gameContainer) gameContainer.style.display = 'block'

  // Initialize game
  const game = new Game(canvas, gameMode)

  // Handle game cleanup on page unload
  window.addEventListener('beforeunload', () => {
    game.cleanup()
  })

  // Add global game reference for debugging
  ;(window as any).game = game
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