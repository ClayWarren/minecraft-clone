import * as THREE from 'three'
import { ECS } from '@/core/ECS'
import { Entity } from '@/core/Entity'
import { 
  TransformComponent, 
  VelocityComponent,
  CollisionComponent, 
  PlayerComponent,
  InventoryComponent,
  HealthComponent,
  WorldComponent
} from '@/components'
import { PhysicsSystem } from '@/systems/PhysicsSystem'
import { RenderSystem } from '@/systems/RenderSystem'
import { InputSystem } from '@/systems/InputSystem'
import { BlockSystem } from '@/systems/BlockSystem'
import { WorldSystem } from '@/systems/WorldSystem'
import { GameMode } from '@/types'

export class Game {
  private ecs: ECS
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private clock: THREE.Clock

  private player!: Entity
  private gameMode: GameMode
  private isRunning = false

  constructor(canvas: HTMLCanvasElement, mode: GameMode = 'single') {
    this.gameMode = mode
    console.log(`🎮 Initializing game in ${mode} mode`)
    this.clock = new THREE.Clock()
    
    // Initialize Three.js
    this.initializeRenderer(canvas)
    this.initializeScene()
    this.initializeCamera()
    
    // Initialize ECS
    this.ecs = new ECS()
    this.initializeSystems()
    
    // Create world and player
    this.createWorld()
    this.player = this.createPlayer()
    
    // Start game loop
    this.start()
  }

  private initializeRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({ 
      canvas,
      antialias: true,
      alpha: false 
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setClearColor(0x87CEEB, 1) // Sky blue
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this))
  }

  private initializeScene(): void {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87CEEB) // Sky blue background
    this.scene.fog = new THREE.Fog(0x87CEEB, 25, 100)
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8)
    this.scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    directionalLight.position.set(10, 20, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 1
    directionalLight.shadow.camera.far = 100
    directionalLight.shadow.camera.left = -50
    directionalLight.shadow.camera.right = 50
    directionalLight.shadow.camera.top = 50
    directionalLight.shadow.camera.bottom = -50
    this.scene.add(directionalLight)
    
    // Add a point light for better illumination
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 50)
    pointLight.position.set(0, 10, 0)
    this.scene.add(pointLight)
  }

  private initializeCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    )
    this.camera.position.set(0, 5, 10)
    this.camera.lookAt(0, 0, 0)
  }

  private initializeSystems(): void {
    // Add core systems
    this.ecs.addSystem(new InputSystem(this.camera))
    this.ecs.addSystem(new PhysicsSystem())
    this.ecs.addSystem(new WorldSystem(this.scene, 12345)) // Fixed seed for consistent world
    this.ecs.addSystem(new BlockSystem(this.camera, this.scene))
    this.ecs.addSystem(new RenderSystem(this.scene, this.renderer, this.camera))
  }

  private createPlayer(): Entity {
    const player = new Entity('player')
    
    // Add components - start player above the procedurally generated terrain
    player.addComponent(new TransformComponent(
      new THREE.Vector3(0, 80, 0), // Start position high above terrain (will fall down)
      new THREE.Vector3(0, 0, 0),  // Rotation
      new THREE.Vector3(1, 1, 1)   // Scale
    ))
    
    player.addComponent(new VelocityComponent())
    player.addComponent(new CollisionComponent(new THREE.Vector3(0.8, 1.8, 0.8)))
    player.addComponent(new PlayerComponent())
    
    // Create inventory with some starting items
    const inventory = new InventoryComponent()
    inventory.addItem('dirt', 64)
    inventory.addItem('stone', 32)
    inventory.addItem('wood', 16)
    inventory.addItem('planks', 16)
    player.addComponent(inventory)
    
    player.addComponent(new HealthComponent(100))

    // Player doesn't have a visible mesh in first-person
    
    this.ecs.addEntity(player)
    console.log('👤 Player created with starting inventory')
    return player
  }

  // Legacy methods - no longer needed with block system
  // private createTestCube(): void { ... }
  // private createGround(): void { ... }

  private createWorld(): void {
    const world = new Entity('world')
    world.addComponent(new WorldComponent())
    this.ecs.addEntity(world)
    
    console.log('🌍 World entity created (managed by WorldSystem)')
  }

  public start(): void {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log(`🎮 Starting Minecraft Clone with TypeScript + ECS in ${this.gameMode} mode`)
    
    // World is now generated procedurally by WorldSystem
    console.log('🌍 Procedural world generation active')
    
    // Start game loop
    this.gameLoop()
  }

  public stop(): void {
    this.isRunning = false
  }

  private gameLoop(): void {
    if (!this.isRunning) return

    const deltaTime = this.clock.getDelta()
    
    // Update ECS systems
    this.ecs.update(deltaTime)
    
    // Update camera position to follow player
    this.updateCamera()
    
    // Update debug info
    this.updateDebugInfo()
    
    // Continue loop
    requestAnimationFrame(this.gameLoop.bind(this))
  }

  private updateDebugInfo(): void {
    const fpsElement = document.getElementById('fps')
    const entityCountElement = document.getElementById('entity-count')
    
    if (fpsElement) {
      const fps = Math.round(1 / this.clock.getDelta())
      fpsElement.textContent = fps.toString()
    }
    
    if (entityCountElement) {
      entityCountElement.textContent = this.ecs.getAllEntities().length.toString()
    }
  }

  private updateCamera(): void {
    const playerTransform = this.player.getComponent<TransformComponent>('transform')
    if (playerTransform) {
      // First-person camera follows player position
      this.camera.position.copy(playerTransform.position)
      this.camera.position.y += 1.6 // Eye height
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  public cleanup(): void {
    this.stop()
    this.ecs.cleanup()
    window.removeEventListener('resize', this.onWindowResize.bind(this))
  }

  // Public getters for debugging
  public getECS(): ECS { return this.ecs }
  public getPlayer(): Entity { return this.player }
  public getScene(): THREE.Scene { return this.scene }
}