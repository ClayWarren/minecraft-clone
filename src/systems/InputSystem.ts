import * as THREE from 'three'
import { Vector3 } from 'three'
import { System } from '@/core/System'
import { Entity, PlayerInput } from '@/types'
import { TransformComponent, VelocityComponent, MeshComponent, PlayerComponent } from '@/components'
import { Game } from '@/Game' // Import Game class

export class InputSystem extends System {
  readonly name = 'input'
  protected requiredComponents = ['transform', 'velocity', 'player']

  private input: PlayerInput = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    sneak: false,
    mouseX: 0,
    mouseY: 0,
    leftClick: false,
    rightClick: false,
  }

  private camera: THREE.Camera
  private game: Game // Reference to the Game instance
  private sprintMultiplier = 1.5
  private mouseSensitivity = 0.002

  constructor(camera: THREE.Camera, game: Game) {
    super()
    this.camera = camera
    this.game = game
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', this.onKeyDown.bind(this))
    document.addEventListener('keyup', this.onKeyUp.bind(this))

    // Mouse events
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
    document.addEventListener('mousedown', this.onMouseDown.bind(this))
    document.addEventListener('mouseup', this.onMouseUp.bind(this))

    // Pointer lock events
    document.addEventListener('click', this.requestPointerLock.bind(this))
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
        this.input.forward = true
        break
      case 'KeyS':
        this.input.backward = true
        break
      case 'KeyA':
        this.input.left = true
        break
      case 'KeyD':
        this.input.right = true
        break
      case 'Space':
        this.input.jump = true
        break
      case 'ShiftLeft':
        this.input.sneak = true
        break
      case 'ControlLeft':
        this.input.sprint = true
        break
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
        this.input.forward = false
        break
      case 'KeyS':
        this.input.backward = false
        break
      case 'KeyA':
        this.input.left = false
        break
      case 'KeyD':
        this.input.right = false
        break
      case 'Space':
        this.input.jump = false
        break
      case 'ShiftLeft':
        this.input.sneak = false
        break
      case 'ControlLeft':
        this.input.sprint = false
        break
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (document.pointerLockElement) {
      this.input.mouseX = event.movementX
      this.input.mouseY = event.movementY
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (!document.pointerLockElement) return

    if (event.button === 0) {
      // Left click
      this.input.leftClick = true
      // Check for mob attack
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera)
      const intersects = raycaster.intersectObjects(this.game.getScene().children, true)

      for (const intersect of intersects) {
        // Check if the intersected object belongs to a mob entity
        const mobEntity = this.game
          .getECS()
          .getAllEntities()
          .find(entity => {
            const meshComp = entity.getComponent<MeshComponent>('mesh')
            return meshComp && meshComp.mesh === intersect.object && entity.hasComponent('mob')
          })

        if (mobEntity) {
          console.log('Attacking mob:', mobEntity.id)
          this.sendAttackMessage(mobEntity.id, 5) // Deal 5 damage for now
          return // Stop processing, attack handled
        }
      }
    }
    if (event.button === 2) this.input.rightClick = true
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) this.input.leftClick = false
    if (event.button === 2) this.input.rightClick = false
  }

  private requestPointerLock(): void {
    document.body.requestPointerLock()
  }

  private sendAttackMessage(targetId: string, damage: number): void {
    const ws = this.game.getWebSocket() // Access WebSocket from Game instance
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'attack',
          data: {
            targetId,
            damage,
            attackerId: this.game.getPlayer().id, // Player's own ID
          },
          timestamp: Date.now(),
        })
      )
      console.log(`Sent attack message to ${targetId} for ${damage} damage.`)
    } else {
      console.warn('WebSocket not connected. Cannot send attack message.')
    }
  }

  update(deltaTime: number, entities: Entity[]): void {
    const playerEntities = this.getEntitiesWithComponents(entities)

    for (const player of playerEntities) {
      this.updatePlayerMovement(player, deltaTime)
      this.updatePlayerLook(player, deltaTime)
    }

    // Use deltaTime to prevent unused variable warning
    void deltaTime

    // Reset mouse movement for next frame
    this.input.mouseX = 0
    this.input.mouseY = 0
  }

  private updatePlayerMovement(player: Entity, _deltaTime: number): void {
    const transform = player.getComponent<TransformComponent>('transform')
    const velocity = player.getComponent<VelocityComponent>('velocity')
    const playerComp = player.getComponent<PlayerComponent>('player')

    if (!transform || !velocity || !playerComp) return

    // Movement speed (sprint multiplier applied if sprinting)
    const moveSpeed = playerComp.movementSpeed * (this.input.sprint ? this.sprintMultiplier : 1)

    // Apply movement based on input
    const moveDirection = new Vector3()
    const forward = new Vector3(0, 0, -1).applyQuaternion(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, transform.rotation.y, 0, 'YXZ'))
    )

    const right = new Vector3(1, 0, 0).applyQuaternion(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, transform.rotation.y, 0, 'YXZ'))
    )

    if (this.input.forward) moveDirection.add(forward)
    if (this.input.backward) moveDirection.sub(forward)
    if (this.input.left) moveDirection.sub(right)
    if (this.input.right) moveDirection.add(right)

    // Normalize movement vector and apply speed
    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize()
      velocity.velocity.x = moveDirection.x * moveSpeed
      velocity.velocity.z = moveDirection.z * moveSpeed
    } else {
      // Apply friction when not moving
      velocity.velocity.x *= 0.8
      velocity.velocity.z *= 0.8
    }

    // Jumping
    if (this.input.jump && playerComp.isGrounded) {
      velocity.velocity.y = playerComp.jumpHeight
      playerComp.isGrounded = false
    }
  }

  private updatePlayerLook(player: Entity, _deltaTime: number): void {
    if (!document.pointerLockElement) return

    const transform = player.getComponent<TransformComponent>('transform')!

    // Update camera rotation based on mouse movement
    transform.rotation.y -= this.input.mouseX * this.mouseSensitivity
    transform.rotation.x -= this.input.mouseY * this.mouseSensitivity

    // Clamp vertical rotation
    transform.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, transform.rotation.x))

    // Apply rotation to camera
    this.camera.rotation.x = transform.rotation.x
    this.camera.rotation.y = transform.rotation.y
  }

  cleanup(): void {
    document.removeEventListener('keydown', this.onKeyDown.bind(this))
    document.removeEventListener('keyup', this.onKeyUp.bind(this))
    document.removeEventListener('mousemove', this.onMouseMove.bind(this))
    document.removeEventListener('mousedown', this.onMouseDown.bind(this))
    document.removeEventListener('mouseup', this.onMouseUp.bind(this))
    document.removeEventListener('click', this.requestPointerLock.bind(this))
  }
}
