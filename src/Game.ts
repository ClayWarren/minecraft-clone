import * as THREE from 'three'
import { ECS } from '@/core/ECS'
import { Entity } from '@/core/Entity'
import {
  TransformComponent,
  VelocityComponent,
  CollisionComponent,
  PlayerComponent,
  HealthComponent,
  WorldComponent,
  MeshComponent,
} from '@/components'
import { InventoryComponent } from '@/components/InventoryComponent'
import { PhysicsSystem } from '@/systems/PhysicsSystem'
import { RenderSystem } from '@/systems/RenderSystem'
import { InputSystem } from '@/systems/InputSystem'
import { BlockSystem } from '@/systems/BlockSystem'
import { WorldSystem } from '@/systems/WorldSystem'
import { GameMode } from '@/types/game'
import { PlayerUpdateMessage } from '@/types/server'

export class Game {
  private ecs: ECS
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private clock: THREE.Clock

  private player!: Entity
  private gameMode: GameMode
  private isRunning = false
  private ws?: WebSocket

  /**
   * Gets the WebSocket instance for network communication.
   * @returns The WebSocket instance if connected, undefined otherwise.
   */
  public getWebSocket(): WebSocket | undefined {
    return this.ws
  }

  private updateInventoryUI: (inventory: (import('@/types/items').ItemStack | null)[]) => void
  // private selectedItem: string = 'dirt' // Default selected item (not used)
  private remotePlayers: Map<string, Entity> = new Map() // Store client-side entities for other players
  private renderSystem!: RenderSystem // Store reference to RenderSystem
  private ambientLight!: THREE.AmbientLight
  private directionalLight!: THREE.DirectionalLight

  constructor(
    canvas: HTMLCanvasElement,
    mode: GameMode = 'single',
    updateInventoryUI: (inventory: (import('@/types/items').ItemStack | null)[]) => void
  ) {
    this.gameMode = mode
    this.updateInventoryUI = updateInventoryUI
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

    // Setup WebSocket for multiplayer
    if (this.gameMode === 'multi') {
      this.setupWebSocket()
    }

    // Initial UI update
    this.updateInventoryUI(this.player.getComponent<InventoryComponent>('inventory')!.items)

    // Start game loop
    this.start()
  }

  public setSelectedItem(_item: string): void {
    // No-op: selectedItem logic not implemented
  }

  private setupWebSocket(): void {
    this.ws = new WebSocket('ws://localhost:8080')

    this.ws.onopen = () => {
      console.log('🌐 Connected to WebSocket server')
      // Send initial player data to server
      const playerTransform = this.player.getComponent<TransformComponent>('transform')!
      this.ws?.send(
        JSON.stringify({
          type: 'player_update',
          data: {
            playerId: this.player.id,
            position: playerTransform.position,
            rotation: playerTransform.rotation,
          },
          timestamp: Date.now(),
        })
      )
    }

    this.ws.onmessage = event => {
      const message = JSON.parse(event.data) as { type: string; data: unknown }

      switch (message.type) {
        case 'player_update': {
          const playerUpdate = message as PlayerUpdateMessage
          // Update other players' positions or local player's health/hunger/inventory
          if (playerUpdate.data.playerId === this.player.id) {
            // This is our player's update (e.g., from server-side hunger/health)
            if (playerUpdate.data.health !== undefined) {
              this.player.getComponent<HealthComponent>('health')!.current =
                playerUpdate.data.health
            }
            // Add hunger property to PlayerComponent if needed
            if (playerUpdate.data.hunger !== undefined) {
              ;(
                this.player.getComponent<PlayerComponent>('player') as PlayerComponent & {
                  hunger: number
                }
              ).hunger = playerUpdate.data.hunger
            }
            if (playerUpdate.data.inventory) {
              // Convert incoming inventory data to ItemStack[]
              // Assume playerUpdate.data.inventory is an array of { item: { id, name, ... }, quantity }
              this.player.getComponent<InventoryComponent>('inventory')!.items =
                playerUpdate.data.inventory
              this.updateInventoryUI(playerUpdate.data.inventory)
            }
          } else {
            // This is an update for another player
            let remotePlayerEntity = this.remotePlayers.get(playerUpdate.data.playerId)
            if (!remotePlayerEntity) {
              // Create new entity for remote player
              remotePlayerEntity = new Entity(playerUpdate.data.playerId)
              remotePlayerEntity.addComponent(
                new TransformComponent(
                  new THREE.Vector3(
                    playerUpdate.data.position.x,
                    playerUpdate.data.position.y,
                    playerUpdate.data.position.z
                  ),
                  new THREE.Vector3(
                    playerUpdate.data.rotation.x,
                    playerUpdate.data.rotation.y,
                    playerUpdate.data.rotation.z
                  )
                )
              )
              // Use the new player model
              const playerModel = this.createPlayerModel()
              playerModel.position.copy(
                remotePlayerEntity.getComponent<TransformComponent>('transform')!.position
              )
              this.scene.add(playerModel)
              // MeshComponent expects a THREE.Mesh, not a THREE.Group. Use a placeholder mesh for remote players.
              const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(1, 2, 1),
                new THREE.MeshLambertMaterial({ color: 0x888888 })
              )
              mesh.position.copy(
                remotePlayerEntity.getComponent<TransformComponent>('transform')!.position
              )
              remotePlayerEntity.addComponent(new MeshComponent(mesh))
              this.ecs.addEntity(remotePlayerEntity)
              this.remotePlayers.set(playerUpdate.data.playerId, remotePlayerEntity)
              console.log(`Added remote player: ${playerUpdate.data.playerId}`)
            } else {
              // Update existing remote player's position and rotation
              const transform = remotePlayerEntity.getComponent<TransformComponent>('transform')!
              // Convert plain object to Vector3
              transform.position.set(
                playerUpdate.data.position.x,
                playerUpdate.data.position.y,
                playerUpdate.data.position.z
              )
              transform.rotation.set(
                playerUpdate.data.rotation.x,
                playerUpdate.data.rotation.y,
                playerUpdate.data.rotation.z
              )
            }
          }
          break
        }
        case 'chunk_data':
          // Handle incoming chunk data (TODO: Integrate with WorldSystem)
          // console.log('Received chunk data:', message.data)
          break
        case 'block_update':
          // Handle block updates from server (TODO: Integrate with BlockSystem)
          // console.log('Received block update:', message.data)
          break
        case 'time_update':
          // Handle time update
          // this.renderSystem.updateTimeOfDay(message.data.timeOfDay) // Method may not exist
          break
        case 'weather_update': {
          // Handle weather update with type checking
          const weatherData = message.data
          if (weatherData && typeof weatherData === 'object' && 'type' in weatherData) {
            // Cast to any to bypass type checking since we've verified the structure
            this.renderSystem.updateWeather(weatherData as any)
          } else {
            console.warn('Invalid weather update data format:', weatherData)
          }
          break
        }
        case 'crafting_response': {
          // Handle crafting response (TODO: Display message to user)
          const craftingData = message.data as {
            success: boolean
            craftedItem?: { quantity: number; id: string }
            message?: string
          }
          console.log('Crafting response:', craftingData)
          if (craftingData.success) {
            alert(
              `Crafted ${craftingData.craftedItem!.quantity} ${craftingData.craftedItem!.id} successfully!`
            )
          } else {
            alert(`Crafting failed: ${craftingData.message}`)
          }
          break
        }
        case 'mob_spawn':
          // const mobSpawn = message as MobSpawnMessage // Unused
          // this.handleMobSpawn(mobSpawn.data) // Method may not exist
          break
        case 'mob_update':
          // const mobUpdate = message as MobUpdateMessage // Unused
          // this.handleMobUpdate(mobUpdate.data) // Method may not exist
          break
        case 'mob_despawn':
          // const mobDespawn = message as MobDespawnMessage // Unused
          // this.handleMobDespawn(mobDespawn.data.mobId) // Method may not exist
          break
        default:
          console.warn('Unknown message type:', message.type)
      }
    }

    this.ws.onclose = () => {
      console.log('🌐 Disconnected from WebSocket server')
    }

    this.ws.onerror = error => {
      console.error('WebSocket error:', error)
    }
  }

  public sendCraftingRequest(recipeId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'crafting_request',
          data: {
            recipeId,
          },
          timestamp: Date.now(),
        })
      )
      console.log(`Sent crafting request for recipe: ${recipeId}`)
    } else {
      console.warn('WebSocket not connected. Cannot send crafting request.')
    }
  }

  private initializeRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setClearColor(0x87ceeb, 1) // Sky blue

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this))
  }

  private initializeScene(): void {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb) // Sky blue background
    this.scene.fog = new THREE.Fog(0x87ceeb, 25, 100)

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

    // Store references to lights for RenderSystem
    this.ambientLight = ambientLight
    this.directionalLight = directionalLight
  }

  private initializeCamera(): void {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera.position.set(0, 5, 10)
    this.camera.lookAt(0, 0, 0)
  }

  // ...existing code...

  // Initial UI update
  // (should be called at the end of the constructor)
  // this.updateInventoryUI(this.player.getComponent<InventoryComponent>('inventory')!.items)

  // Start game loop
  // this.start()

  private initializeSystems(): void {
    // Add core systems
    this.ecs.addSystem(new InputSystem(this.camera, this))
    this.ecs.addSystem(new PhysicsSystem())
    this.ecs.addSystem(new WorldSystem(this.scene, 12345)) // Fixed seed for consistent world
    this.ecs.addSystem(new BlockSystem(this.camera, this.scene))
    this.renderSystem = new RenderSystem(
      this.scene,
      this.renderer,
      this.camera,
      this.ambientLight,
      this.directionalLight
    )
    this.ecs.addSystem(this.renderSystem)
  }

  private createPlayer(): Entity {
    const player = new Entity('player')

    // Add components - start player above the procedurally generated terrain
    player.addComponent(
      new TransformComponent(
        new THREE.Vector3(0, 80, 0), // Start position high above terrain (will fall down)
        new THREE.Vector3(0, 0, 0), // Rotation
        new THREE.Vector3(1, 1, 1) // Scale
      )
    )

    player.addComponent(new VelocityComponent())
    player.addComponent(new CollisionComponent(new THREE.Vector3(0.8, 1.8, 0.8)))
    player.addComponent(new PlayerComponent())

    // Create inventory with some starting items
    const inventory = new InventoryComponent()
    // Use ITEM_REGISTRY and ItemStack for correct inventory initialization
    import('@/types/itemRegistry').then(({ ITEM_REGISTRY }) => {
      inventory.addItem({ item: ITEM_REGISTRY['dirt'], quantity: 64 })
      inventory.addItem({ item: ITEM_REGISTRY['stone'], quantity: 32 })
      inventory.addItem({ item: ITEM_REGISTRY['wood'], quantity: 16 })
      inventory.addItem({ item: ITEM_REGISTRY['planks'], quantity: 16 })
    })
    player.addComponent(inventory)

    player.addComponent(new HealthComponent(100))

    // Attach the player model to the local player entity
    const playerModel = this.createPlayerModel()
    playerModel.position.copy(player.getComponent<TransformComponent>('transform')!.position)
    this.scene.add(playerModel)
    // MeshComponent expects a THREE.Mesh, not a THREE.Group. Use a placeholder mesh for the local player.
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1),
      new THREE.MeshLambertMaterial({ color: 0x00ff00 })
    )
    mesh.position.copy(player.getComponent<TransformComponent>('transform')!.position)
    player.addComponent(new MeshComponent(mesh))

    this.ecs.addEntity(player)
    console.log('👤 Player created with starting inventory')
    return player
  }

  private createPlayerModel(): THREE.Group {
    const playerGroup = new THREE.Group()

    // Head
    const headGeometry = new THREE.BoxGeometry(1, 1, 1)
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 }) // Brown
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = 1.5 // Above body
    playerGroup.add(head)

    // Body
    const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 0.5)
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x008000 }) // Green
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.5
    playerGroup.add(body)

    // Arms
    const armGeometry = new THREE.BoxGeometry(0.5, 1.5, 0.5)
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 }) // Brown

    const leftArm = new THREE.Mesh(armGeometry, armMaterial)
    leftArm.position.set(-0.75, 0.5, 0)
    playerGroup.add(leftArm)

    const rightArm = new THREE.Mesh(armGeometry, armMaterial)
    rightArm.position.set(0.75, 0.5, 0)
    playerGroup.add(rightArm)

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.6, 1.5, 0.6)
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff }) // Blue

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial)
    leftLeg.position.set(-0.3, -0.75, 0)
    playerGroup.add(leftLeg)

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial)
    rightLeg.position.set(0.3, -0.75, 0)
    playerGroup.add(rightLeg)

    return playerGroup
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

    // Update player animations
    // this.updatePlayerAnimations(deltaTime) // Disabled: animation logic not compatible with current MeshComponent

    // Update debug info
    this.updateDebugInfo()

    // Continue loop
    requestAnimationFrame(this.gameLoop.bind(this))
  }

  // private updatePlayerAnimations(deltaTime: number): void {
  //   // Animation logic removed: playerMesh is not defined and MeshComponent is not a Group
  // }

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
    if (this.ws) {
      this.ws.close()
    }
  }

  // Public getters for debugging
  public getECS(): ECS {
    return this.ecs
  }
  public getPlayer(): Entity {
    return this.player
  }
  public getScene(): THREE.Scene {
    return this.scene
  }
}
