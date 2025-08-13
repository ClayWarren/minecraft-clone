/**
 * Integration example showing how to use all game development best practices together
 * This demonstrates professional game architecture for AAA-quality games
 */
import { GameLoop } from './GameLoop'
import { GameStateManager, GameState, createStandardTransitions } from './GameStateManager'
import { poolManager } from './ObjectPool'
import { profiler, memoryProfiler } from './Profiler'
import { assetManager, AssetType } from './AssetManager'
import { inputBuffer, InputActionType } from './InputBuffer'
import { InstancedVoxelRenderer } from '../rendering/InstancedVoxelRenderer'
import * as THREE from 'three'

/**
 * Main game class integrating all professional game development systems
 */
export class ProfessionalGameEngine {
  // Core systems
  private gameLoop: GameLoop
  private stateManager: GameStateManager
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private voxelRenderer: InstancedVoxelRenderer

  // Performance monitoring
  private performanceUpdateInterval = 1000 // Update every second
  private lastPerformanceUpdate = 0

  constructor(canvas: HTMLCanvasElement) {
    console.log('🚀 Initializing Professional Game Engine...')

    // Initialize Three.js
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Initialize game systems
    this.voxelRenderer = new InstancedVoxelRenderer(this.scene)
    this.gameLoop = new GameLoop()
    this.stateManager = new GameStateManager()

    this.setupGameSystems()
  }

  /**
   * Initialize all game development systems
   */
  private setupGameSystems(): void {
    profiler.time('GameEngine.setupGameSystems', () => {
      this.setupObjectPools()
      this.setupAssetManager()
      this.setupInputSystem()
      this.setupGameStates()
      this.setupGameLoop()
    })
  }

  /**
   * Setup object pools for frequently created objects
   */
  private setupObjectPools(): void {
    profiler.time('GameEngine.setupObjectPools', () => {
      // Vector3 pool for positions, velocities, etc.
      poolManager.registerPool(
        'vector3',
        () => new THREE.Vector3(),
        obj => obj.set(0, 0, 0),
        50, // Initial size
        500 // Max size
      )

      // Euler pool for rotations
      poolManager.registerPool(
        'euler',
        () => new THREE.Euler(),
        obj => obj.set(0, 0, 0),
        20,
        200
      )

      // Matrix4 pool for transformations
      poolManager.registerPool(
        'matrix4',
        () => new THREE.Matrix4(),
        obj => obj.identity(),
        20,
        100
      )

      console.log('✅ Object pools initialized')
    })
  }

  /**
   * Setup asset management system
   */
  private setupAssetManager(): void {
    profiler.time('GameEngine.setupAssetManager', () => {
      // Register block textures
      assetManager.registerAssets([
        {
          id: 'grass_texture',
          type: AssetType.TEXTURE,
          url: '/textures/blocks/grass.png',
          preload: true,
          persistent: true,
        },
        {
          id: 'stone_texture',
          type: AssetType.TEXTURE,
          url: '/textures/blocks/stone.png',
          preload: true,
          persistent: true,
        },
        {
          id: 'dirt_texture',
          type: AssetType.TEXTURE,
          url: '/textures/blocks/dirt.png',
          preload: true,
          persistent: true,
        },
      ])

      // Setup loading callbacks
      assetManager.setCallbacks({
        onProgress: progress => {
          console.log(`Loading assets: ${progress.percentage.toFixed(1)}% (${progress.currentAsset})`)
        },
        onComplete: () => {
          console.log('✅ All assets loaded')
          this.stateManager.changeState(GameState.MENU)
        },
        onError: (error, assetId) => {
          console.error(`❌ Failed to load asset '${assetId}':`, error)
        },
      })

      console.log('✅ Asset manager configured')
    })
  }

  /**
   * Setup input buffering system
   */
  private setupInputSystem(): void {
    profiler.time('GameEngine.setupInputSystem', () => {
      // Setup event listeners
      window.addEventListener('keydown', event => {
        inputBuffer.handleKeyboardInput(event)
        this.stateManager.handleInput(event as any)
      })

      window.addEventListener('keyup', event => {
        inputBuffer.handleKeyboardInput(event)
      })

      window.addEventListener('mousedown', event => {
        inputBuffer.handleMouseInput(event)
        this.stateManager.handleInput(event as any)
      })

      window.addEventListener('wheel', event => {
        inputBuffer.handleMouseInput(event)
        this.stateManager.handleInput(event as any)
      })

      console.log('✅ Input system initialized')
    })
  }

  /**
   * Setup game state management
   */
  private setupGameStates(): void {
    profiler.time('GameEngine.setupGameStates', () => {
      // Register standard transitions
      const transitions = createStandardTransitions()
      transitions.forEach(transition => this.stateManager.registerTransition(transition))

      // Register state handlers
      this.stateManager.registerState(GameState.INITIALIZING, {
        onEnter: () => {
          console.log('🔄 Initializing game...')
          // Start asset loading
          assetManager.loadQueuedAssets()
        },
      })

      this.stateManager.registerState(GameState.MENU, {
        onEnter: () => console.log('📋 Entered menu state'),
        onInput: event => {
          if ((event as KeyboardEvent).code === 'Enter') {
            this.stateManager.changeState(GameState.LOADING)
            return true
          }
          return false
        },
      })

      this.stateManager.registerState(GameState.LOADING, {
        onEnter: () => {
          console.log('⏳ Loading game...')
          // Simulate loading time
          setTimeout(() => {
            this.stateManager.changeState(GameState.PLAYING)
          }, 2000)
        },
      })

      this.stateManager.registerState(GameState.PLAYING, {
        onEnter: () => {
          console.log('🎮 Game started!')
          this.setupGameScene()
        },
        onUpdate: deltaTime => this.updateGameplay(deltaTime),
        onRender: alpha => this.renderGame(alpha),
        onInput: event => {
          if ((event as KeyboardEvent).code === 'Escape') {
            this.stateManager.changeState(GameState.PAUSED)
            return true
          }
          return false
        },
      })

      this.stateManager.registerState(GameState.PAUSED, {
        onEnter: () => console.log('⏸️ Game paused'),
        onInput: event => {
          if ((event as KeyboardEvent).code === 'Escape') {
            this.stateManager.changeState(GameState.PLAYING)
            return true
          }
          return false
        },
      })

      console.log('✅ Game states configured')
    })
  }

  /**
   * Setup the main game loop with fixed timestep physics
   */
  private setupGameLoop(): void {
    profiler.time('GameEngine.setupGameLoop', () => {
      this.gameLoop.setFixedUpdateCallback(deltaTime => {
        profiler.time('GameLoop.FixedUpdate', () => {
          // Fixed timestep physics updates
          this.updatePhysics(deltaTime)
        })
      })

      this.gameLoop.setUpdateCallback((deltaTime, alpha) => {
        profiler.time('GameLoop.Update', () => {
          // Variable timestep updates
          this.updateSystems(deltaTime, alpha)
        })
      })

      this.gameLoop.setRenderCallback(alpha => {
        profiler.time('GameLoop.Render', () => {
          // Rendering with interpolation
          this.render(alpha)
        })
      })

      console.log('✅ Game loop configured')
    })
  }

  /**
   * Start the game engine
   */
  start(): void {
    console.log('🎮 Starting Professional Game Engine')
    this.stateManager.changeState(GameState.INITIALIZING)
    this.gameLoop.start()
  }

  /**
   * Stop the game engine
   */
  stop(): void {
    console.log('🛑 Stopping Professional Game Engine')
    this.gameLoop.stop()
  }

  /**
   * Setup the 3D game scene
   */
  private setupGameScene(): void {
    profiler.time('GameEngine.setupGameScene', () => {
      // Add lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
      this.scene.add(ambientLight)

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(10, 10, 5)
      directionalLight.castShadow = true
      this.scene.add(directionalLight)

      // Position camera
      this.camera.position.set(0, 5, 10)
      this.camera.lookAt(0, 0, 0)

      // Add some example voxel blocks
      this.addExampleBlocks()
    })
  }

  /**
   * Add example blocks to demonstrate instanced rendering
   */
  private addExampleBlocks(): void {
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)
    const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x7cb342 })

    this.voxelRenderer.registerBlockType('grass', cubeGeometry, grassMaterial)

    // Add a grid of grass blocks
    for (let x = -5; x <= 5; x++) {
      for (let z = -5; z <= 5; z++) {
        this.voxelRenderer.addBlock('grass', new THREE.Vector3(x, 0, z))
      }
    }
  }

  /**
   * Fixed timestep physics updates
   */
  private updatePhysics(deltaTime: number): void {
    // Physics simulation would go here
    // This runs at exactly 60 FPS for consistent simulation
  }

  /**
   * Variable timestep system updates
   */
  private updateSystems(deltaTime: number, alpha: number): void {
    // Clean up input buffer
    inputBuffer.cleanExpiredInputs()

    // Update game state
    this.stateManager.update(deltaTime)

    // Handle player input
    this.handlePlayerInput()

    // Update performance monitoring
    this.updatePerformanceMonitoring()

    // Memory management
    this.performMemoryManagement()
  }

  /**
   * Handle player input from buffer
   */
  private handlePlayerInput(): void {
    // Example: Check for jump input
    if (inputBuffer.consumeInput(InputActionType.JUMP)) {
      console.log('Player jumped!')
    }

    // Example: Check for inventory input
    if (inputBuffer.consumeInput(InputActionType.OPEN_INVENTORY)) {
      console.log('Opening inventory...')
    }
  }

  /**
   * Main rendering function
   */
  private render(alpha: number): void {
    // State-specific rendering
    this.stateManager.render(alpha)

    // Always render the 3D scene if in playing state
    if (this.stateManager.getCurrentState() === GameState.PLAYING) {
      this.renderer.render(this.scene, this.camera)
    }
  }

  /**
   * Game-specific rendering
   */
  private renderGame(alpha: number): void {
    // Interpolation-based rendering would go here
    // Use alpha for smooth movement between fixed timesteps
  }

  /**
   * Update performance monitoring
   */
  private updatePerformanceMonitoring(): void {
    const now = performance.now()
    if (now - this.lastPerformanceUpdate >= this.performanceUpdateInterval) {
      // Take memory measurement
      memoryProfiler.measure()

      // Log performance stats in development
      if (process.env.NODE_ENV === 'development') {
        const gameLoopStats = this.gameLoop.getPerformanceStats()
        const voxelStats = this.voxelRenderer.getStats()
        const poolStats = poolManager.getAllStats()

        console.log('📊 Performance Stats:', {
          fps: gameLoopStats.fps,
          frameTime: gameLoopStats.frameTime,
          voxelInstances: voxelStats.totalInstances,
          memoryUsage: memoryProfiler.getStats().current.heapUsed.toFixed(1) + 'MB',
          poolUsage: poolStats,
        })
      }

      this.lastPerformanceUpdate = now
    }
  }

  /**
   * Perform memory management tasks
   */
  private performMemoryManagement(): void {
    // Clean up unused assets periodically
    assetManager.cleanupUnusedAssets()

    // Optimize instanced renderers
    this.voxelRenderer.optimize()
  }

  /**
   * Get engine statistics for debugging
   */
  getEngineStats(): EngineStats {
    return {
      gameLoop: this.gameLoop.getPerformanceStats(),
      voxelRenderer: this.voxelRenderer.getStats(),
      memory: memoryProfiler.getStats(),
      assets: assetManager.getStats(),
      input: inputBuffer.getStats(),
      currentState: this.stateManager.getCurrentState(),
      profilerData: profiler.getAllData(),
    }
  }
}

export interface EngineStats {
  gameLoop: {
    fps: number
    frameTime: number
    averageFrameTime: number
    accumulator: number
  }
  voxelRenderer: {
    totalMeshes: number
    totalInstances: number
    memoryUsage: number
    maxInstancesPerMesh: number
  }
  memory: {
    current: { timestamp: number; heapUsed: number; heapTotal: number; external: number }
    average: number
    peak: number
    measurementCount: number
  }
  assets: {
    totalAssets: number
    loadedAssets: number
    memoryUsage: number
    isLoading: boolean
    loadProgress: { loaded: number; total: number; percentage: number; currentAsset?: string }
  }
  input: {
    bufferSize: number
    unconsumedInputs: number
    oldestInputAge: number
  }
  currentState: GameState
  profilerData: Record<string, { average: number; min: number; max: number; latest: number; sampleCount: number }>
}