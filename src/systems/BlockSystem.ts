import * as THREE from 'three'
import { System } from '@/core/System'
import { Entity, Game } from '@/types'
import { InventoryComponent } from '@/components'
import { WorldComponent } from '@/components/BlockComponent'
import { getBlockType, BlockPosition, TOOL_EFFECTIVENESS } from '@/types/blocks'

declare global {
  interface Window {
    game: Game
    updateHotbar?: (items: Map<string, number>) => void
  }
}

export class BlockSystem extends System {
  readonly name = 'block'

  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()
  private camera!: THREE.Camera
  private scene!: THREE.Scene
  private worldEntity!: Entity
  private playerEntity!: Entity

  private isMouseDown = false
  // private _miningStartTime = 0 // TODO: Use for mining timing
  private currentTargetBlock: BlockPosition | null = null
  private miningProgress = 0
  private selectedHotbarSlot = 0 // Default to first hotbar slot

  private textureLoader: THREE.TextureLoader
  private textures: Map<string, THREE.Texture> = new Map()
  private materials: Map<string, THREE.Material | THREE.Material[]> = new Map()
  private breakingTextures: THREE.Texture[] = []
  private breakingMaterial: THREE.MeshBasicMaterial | null = null
  private breakingMesh: THREE.Mesh | null = null

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    super()
    this.camera = camera
    this.scene = scene
    this.textureLoader = new THREE.TextureLoader()
    this.loadTextures()
    this.loadBreakingTextures()
    this.setupEventListeners()
  }

  private loadBreakingTextures(): void {
    for (let i = 0; i < 10; i++) {
      this.textureLoader.load(
        `/textures/breaking/breaking_${i}.png`,
        texture => {
          this.breakingTextures[i] = texture
        },
        undefined,
        err => {
          console.error(`Error loading breaking texture ${i}:`, err)
        }
      )
    }
    this.breakingMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5 })
    const geometry = new THREE.BoxGeometry(1.001, 1.001, 1.001) // Slightly larger to avoid z-fighting
    this.breakingMesh = new THREE.Mesh(geometry, this.breakingMaterial)
    this.breakingMesh.renderOrder = 1 // Render after blocks
    this.breakingMesh.visible = false
    this.scene.add(this.breakingMesh)
  }

  private loadTextures(): void {
    const blockTextureMap: Record<
      string,
      string | { all?: string; top?: string; bottom?: string; side?: string }
    > = {
      grass: {
        top: '/textures/blocks/grass_top.png',
        bottom: '/textures/blocks/dirt.png',
        side: '/textures/blocks/grass_side.png',
      },
      dirt: '/textures/blocks/dirt.png',
      stone: '/textures/blocks/stone.png',
      cobblestone: '/textures/blocks/cobblestone.png',
      wood: {
        top: '/textures/blocks/log_top.png',
        bottom: '/textures/blocks/log_top.png',
        side: '/textures/blocks/log_side.png',
      },
      planks: '/textures/blocks/planks.png',
      sand: '/textures/blocks/sand.png',
      water: '/textures/blocks/water.png',
      coal_ore: '/textures/blocks/coal_ore.png',
      iron_ore: '/textures/blocks/iron_ore.png',
      diamond_ore: '/textures/blocks/diamond_ore.png',
      bedrock: '/textures/blocks/bedrock.png',
      leaves: '/textures/blocks/leaves.png',
      glass: '/textures/blocks/glass.png',
      crafting_table: {
        top: '/textures/blocks/crafting_table_top.png',
        side: '/textures/blocks/crafting_table_side.png',
        bottom: '/textures/blocks/planks.png',
      },
    }

    for (const blockId in blockTextureMap) {
      const textureInfo = blockTextureMap[blockId]

      if (typeof textureInfo === 'string') {
        // Single texture for all faces
        this.textureLoader.load(
          textureInfo,
          texture => {
            this.textures.set(blockId, texture)
            this.materials.set(blockId, new THREE.MeshLambertMaterial({ map: texture }))
            console.log(`Loaded texture for ${blockId}`)
          },
          undefined,
          err => {
            console.error(`Error loading texture for ${blockId}:`, err)
            const blockData = getBlockType(blockId)
            if (blockData) {
              this.materials.set(blockId, new THREE.MeshLambertMaterial({ color: blockData.color }))
            }
          }
        )
      } else {
        // Multi-face textures
        const faceTextures: Record<string, string> = {
          all: textureInfo.all || '',
          top: textureInfo.top || textureInfo.all || '',
          bottom: textureInfo.bottom || textureInfo.all || '',
          side: textureInfo.side || textureInfo.all || '',
        }

        const loadedMaterials: THREE.MeshLambertMaterial[] = []
        const texturePromises: Promise<THREE.Texture>[] = []

        // Order: right, left, top, bottom, front, back
        const faceOrder = [
          faceTextures.side,
          faceTextures.side,
          faceTextures.top,
          faceTextures.bottom,
          faceTextures.side,
          faceTextures.side,
        ]

        faceOrder.forEach((texPath, index) => {
          if (texPath) {
            texturePromises.push(
              new Promise((resolve, reject) => {
                this.textureLoader.load(
                  texPath,
                  texture => {
                    loadedMaterials[index] = new THREE.MeshLambertMaterial({ map: texture })
                    resolve(texture)
                  },
                  undefined,
                  reject
                )
              })
            )
          } else {
            // Fallback to color if no texture path for a face
            const blockData = getBlockType(blockId)
            loadedMaterials[index] = new THREE.MeshLambertMaterial({
              color: blockData ? blockData.color : 0x808080,
            })
            texturePromises.push(Promise.resolve(new THREE.Texture())) // Resolve with dummy texture
          }
        })

        Promise.all(texturePromises)
          .then(() => {
            this.materials.set(blockId, loadedMaterials as THREE.Material[]) // Store array of materials
            console.log(`Loaded multi-face textures for ${blockId}`)
          })
          .catch(err => {
            console.error(`Error loading multi-face textures for ${blockId}:`, err)
            // Fallback to single color material if any texture fails to load
            const blockData = getBlockType(blockId)
            if (blockData) {
              this.materials.set(blockId, new THREE.MeshLambertMaterial({ color: blockData.color }))
            }
          })
      }
    }
  }

  public setSelectedItem(_item: string): void {
    // Deprecated: use setSelectedHotbarSlot instead
    this.selectedHotbarSlot = 0
    console.log('BlockSystem: setSelectedItem is deprecated, use setSelectedHotbarSlot')
  }

  public setSelectedHotbarSlot(slot: number): void {
    this.selectedHotbarSlot = slot
    console.log('BlockSystem: Selected hotbar slot set to', this.selectedHotbarSlot)
  }

  private setupEventListeners(): void {
    document.addEventListener('mousedown', this.onMouseDown.bind(this))
    document.addEventListener('mouseup', this.onMouseUp.bind(this))
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
    document.addEventListener('contextmenu', e => e.preventDefault())
  }

  private onMouseDown(event: MouseEvent): void {
    if (!document.pointerLockElement) return

    this.isMouseDown = true

    if (event.button === 0) {
      // Left click - mine block
      this.startMining()
    } else if (event.button === 2) {
      // Right click - place block
      this.placeBlock()
    }
  }

  private onMouseUp(event: MouseEvent): void {
    this.isMouseDown = false

    if (event.button === 0) {
      // Left click released
      this.stopMining()
    }
  }

  private onMouseMove(_event: MouseEvent): void {
    if (!document.pointerLockElement) return

    // Update mouse position for raycasting
    this.mouse.x = 0 // Always center since cursor is locked
    this.mouse.y = 0
  }

  update(deltaTime: number, entities: Entity[]): void {
    // Find world and player entities
    this.worldEntity = entities.find(e => e.hasComponent('world'))!
    this.playerEntity = entities.find(e => e.hasComponent('player'))!

    if (!this.worldEntity || !this.playerEntity) return

    // Update mining progress
    if (this.isMouseDown && this.currentTargetBlock) {
      this.updateMining(deltaTime)
    }

    // Update block highlighting
    this.updateBlockHighlight()
  }

  private startMining(): void {
    const targetBlock = this.getTargetBlock()
    if (!targetBlock) return

    const world = this.worldEntity.getComponent<WorldComponent>('world')!
    const blockType = world.getBlockAt(targetBlock)

    if (blockType === 'air') return

    const blockData = getBlockType(blockType)
    if (!blockData || blockData.hardness === -1) return // Unbreakable

    this.currentTargetBlock = targetBlock
    // this._miningStartTime = Date.now() // TODO: Use for mining timing
    this.miningProgress = 0

    console.log(
      `Started mining ${blockData.name} at ${targetBlock.x},${targetBlock.y},${targetBlock.z}`
    )
  }

  private stopMining(): void {
    this.currentTargetBlock = null
    this.miningProgress = 0
    console.log('Stopped mining')
  }

  private updateMining(deltaTime: number): void {
    if (!this.currentTargetBlock) return

    const world = this.worldEntity.getComponent<WorldComponent>('world')!
    const blockType = world.getBlockAt(this.currentTargetBlock)
    const blockData = getBlockType(blockType)

    if (!blockData) return

    // Calculate mining speed based on tool (selected hotbar slot)
    const inventory = this.playerEntity.getComponent<InventoryComponent>('inventory')!
    const hotbarStack = inventory.items[this.selectedHotbarSlot]
    const toolId = hotbarStack ? hotbarStack.item.id : 'hand'
    const miningSpeed = this.getMiningSpeed(blockType, toolId)

    // Update progress
    this.miningProgress += (deltaTime * miningSpeed) / blockData.hardness

    if (this.miningProgress >= 1.0) {
      // Block is broken!
      this.breakBlock(this.currentTargetBlock)
      this.stopMining()
    }
  }

  private breakBlock(position: BlockPosition): void {
    const world = this.worldEntity.getComponent<WorldComponent>('world')!
    const blockType = world.getBlockAt(position)
    const blockData = getBlockType(blockType)

    if (!blockData) return

    // Remove block from world
    world.setBlockAt(position, 'air')

    // Remove mesh from scene
    this.removeBlockMesh(position)

    // Add drops to inventory
    const inventory = this.playerEntity.getComponent<InventoryComponent>('inventory')!
    import('@/types/itemRegistry').then(({ ITEM_REGISTRY }) => {
      for (const drop of blockData.drops || []) {
        const item = ITEM_REGISTRY[drop]
        if (item) {
          inventory.addItem({ item, quantity: 1 })
        }
      }
    })

    // Send block update to server
    const ws = window.game.ws // Access WebSocket from global game instance
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'block_update',
          data: {
            position,
            blockType: null, // Indicate block removal
          },
          timestamp: Date.now(),
        })
      )
    }

    console.log(`Broke ${blockData.name}`)
  }

  private placeBlock(): void {
    const targetPosition = this.getPlacementPosition()
    if (!targetPosition) return

    const inventory = this.playerEntity.getComponent<InventoryComponent>('inventory')!

    // Get selected block type from hotbar
    const hotbarStack = inventory.items[this.selectedHotbarSlot]
    if (!hotbarStack) {
      console.log('No item in selected hotbar slot')
      return
    }
    const blockTypeToPlace = hotbarStack.item.id
    if (!inventory.hasItem(blockTypeToPlace)) {
      console.log(`No ${blockTypeToPlace} in inventory`)
      return
    }
    // Helper function to convert inventory items to a format the hotbar can use
    const getHotbarItems = (inventory: InventoryComponent): Map<string, number> => {
      const hotbarMap = new Map<string, number>()
      // Only get items from the hotbar slots (first hotbarSize slots)
      for (let i = 0; i < inventory.hotbarSize; i++) {
        const item = inventory.getItem(i)
        if (item) {
          hotbarMap.set(item.item.id, item.quantity)
        }
      }
      return hotbarMap
    }

    // Update hotbar UI after breaking/placing a block (inventory may have changed)
    if (typeof window !== 'undefined' && window.updateHotbar) {
      const hotbarItems = getHotbarItems(inventory)
      window.updateHotbar(hotbarItems)
    }

    const world = this.worldEntity.getComponent<WorldComponent>('world')!
    const currentBlock = world.getBlockAt(targetPosition)

    if (currentBlock !== 'air') {
      console.log('Cannot place block - position occupied')
      return
    }

    // Place block (client-side prediction)
    world.setBlockAt(targetPosition, blockTypeToPlace)
    // Remove one item from inventory
    // Find the first slot with the item and remove one
    for (let i = 0; i < inventory.items.length; i++) {
      const stack = inventory.items[i]
      if (stack && stack.item.id === blockTypeToPlace) {
        inventory.removeItem(i, 1)
        break
      }
    }

    // Create mesh for new block
    this.createBlockMesh(targetPosition, blockTypeToPlace)

    // Send block update to server
    const ws = window.game.ws // Access WebSocket from global game instance
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'block_update',
          data: {
            position: targetPosition,
            blockType: blockTypeToPlace,
          },
          timestamp: Date.now(),
        })
      )
    }

    console.log(
      `Placed ${blockTypeToPlace} at ${targetPosition.x},${targetPosition.y},${targetPosition.z}`
    )
  }

  private getTargetBlock(): BlockPosition | null {
    // Raycast from camera to find target block
    this.raycaster.setFromCamera(this.mouse, this.camera)

    const intersects = this.raycaster.intersectObjects(this.scene.children, true)

    for (const intersect of intersects) {
      const object = intersect.object
      if (object.userData.blockPosition) {
        return object.userData.blockPosition
      }
    }

    return null
  }

  private getPlacementPosition(): BlockPosition | null {
    // Similar to getTargetBlock but returns the position adjacent to the hit face
    this.raycaster.setFromCamera(this.mouse, this.camera)

    const intersects = this.raycaster.intersectObjects(this.scene.children, true)

    for (const intersect of intersects) {
      const object = intersect.object
      if (object.userData.blockPosition && intersect.face) {
        const blockPos = object.userData.blockPosition
        const normal = intersect.face.normal

        // Calculate adjacent position based on face normal
        return {
          x: blockPos.x + Math.round(normal.x),
          y: blockPos.y + Math.round(normal.y),
          z: blockPos.z + Math.round(normal.z),
        }
      }
    }

    return null
  }

  private createBlockMesh(position: BlockPosition, blockType: string): void {
    const blockData = getBlockType(blockType)
    if (!blockData) return

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = this.materials.get(blockType) // This can be a single material or an array

    // Ensure material is an array if it's a multi-face block
    const finalMaterial = material || new THREE.MeshLambertMaterial({ color: 0x00ff00 })

    const mesh = new THREE.Mesh(geometry, finalMaterial)

    mesh.position.set(position.x, position.y, position.z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.blockPosition = position
    mesh.userData.originalColor = blockData.color // Store original color for mining effect

    this.scene.add(mesh)
  }

  private removeBlockMesh(position: BlockPosition): void {
    // Find and remove the mesh at this position
    const meshToRemove = this.scene.children.find(child => {
      return (
        child.userData.blockPosition &&
        child.userData.blockPosition.x === position.x &&
        child.userData.blockPosition.y === position.y &&
        child.userData.blockPosition.z === position.z
      )
    })

    if (meshToRemove) {
      this.scene.remove(meshToRemove)

      // Dispose of geometry and material to free memory
      if (meshToRemove instanceof THREE.Mesh) {
        meshToRemove.geometry.dispose()
        if (Array.isArray(meshToRemove.material)) {
          meshToRemove.material.forEach(mat => mat.dispose())
        } else {
          meshToRemove.material.dispose()
        }
      }
    }
  }

  private getMiningSpeed(blockType: string, tool: string): number {
    const effectiveness = TOOL_EFFECTIVENESS[tool]
    if (effectiveness && effectiveness[blockType]) {
      return effectiveness[blockType]
    }
    return 1 // Default speed
  }

  private highlightMesh: THREE.LineSegments | null = null

  private updateBlockHighlight(): void {
    const targetBlock = this.getTargetBlock()

    // Remove previous highlight
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh)
      this.highlightMesh.geometry.dispose()
      if (Array.isArray(this.highlightMesh.material)) {
        this.highlightMesh.material.forEach(mat => mat.dispose())
      } else {
        this.highlightMesh.material.dispose()
      }
      this.highlightMesh = null
    }

    if (targetBlock) {
      // Find the actual mesh of the targeted block
      const blockMesh = this.scene.children.find(child => {
        return (
          child.userData.blockPosition &&
          child.userData.blockPosition.x === targetBlock.x &&
          child.userData.blockPosition.y === targetBlock.y &&
          child.userData.blockPosition.z === targetBlock.z
        )
      }) as THREE.Mesh

      if (blockMesh) {
        if (
          this.isMouseDown &&
          this.currentTargetBlock &&
          this.currentTargetBlock.x === targetBlock.x &&
          this.currentTargetBlock.y === targetBlock.y &&
          this.currentTargetBlock.z === targetBlock.z
        ) {
          // Mining in progress: show breaking animation
          if (this.breakingMesh && this.breakingMaterial) {
            const stage = Math.min(9, Math.floor(this.miningProgress * 10)) // 0-9 stages
            const breakingTexture = this.breakingTextures[stage]
            if (breakingTexture) {
              this.breakingMaterial.map = breakingTexture
              this.breakingMaterial.needsUpdate = true
              this.breakingMesh.position.copy(blockMesh.position)
              this.breakingMesh.visible = true
            }
          }

          // Reset color if it was changed by mining progress (from previous implementation)
          if (
            blockMesh.userData.originalColor &&
            (Array.isArray(blockMesh.material)
              ? (blockMesh.material[0] as THREE.MeshLambertMaterial).color.getHex()
              : (blockMesh.material as THREE.MeshLambertMaterial).color.getHex()) !==
              blockMesh.userData.originalColor
          ) {
            if (Array.isArray(blockMesh.material)) {
              ;(blockMesh.material[0] as THREE.MeshLambertMaterial).color.setHex(
                blockMesh.userData.originalColor
              )
            } else {
              ;(blockMesh.material as THREE.MeshLambertMaterial).color.setHex(
                blockMesh.userData.originalColor
              )
            }
          }
        } else {
          // Not mining: add outline highlight
          const geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01) // Slightly larger to avoid z-fighting
          const edges = new THREE.EdgesGeometry(geometry)
          this.highlightMesh = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
          )
          this.highlightMesh.position.copy(blockMesh.position)
          this.scene.add(this.highlightMesh)

          // Hide breaking mesh if visible
          if (this.breakingMesh) {
            this.breakingMesh.visible = false
          }

          // Reset color if it was changed by mining progress
          if (
            blockMesh.userData.originalColor &&
            (Array.isArray(blockMesh.material)
              ? (blockMesh.material[0] as THREE.MeshLambertMaterial).color.getHex()
              : (blockMesh.material as THREE.MeshLambertMaterial).color.getHex()) !==
              blockMesh.userData.originalColor
          ) {
            if (Array.isArray(blockMesh.material)) {
              ;(blockMesh.material[0] as THREE.MeshLambertMaterial).color.setHex(
                blockMesh.userData.originalColor
              )
            } else {
              ;(blockMesh.material as THREE.MeshLambertMaterial).color.setHex(
                blockMesh.userData.originalColor
              )
            }
          }
        }
      }
    } else {
      // No block targeted: hide highlight and breaking mesh
      if (this.breakingMesh) {
        this.breakingMesh.visible = false
      }
      // If no block is targeted but mining was in progress, reset the color of the last mined block
      const lastMinedBlockMesh = this.scene.children.find(child => {
        return (
          child.userData.blockPosition &&
          child.userData.blockPosition.x === this.currentTargetBlock!.x &&
          child.userData.blockPosition.y === this.currentTargetBlock!.y &&
          child.userData.blockPosition.z === this.currentTargetBlock!.z
        )
      }) as THREE.Mesh

      if (lastMinedBlockMesh && lastMinedBlockMesh.userData.originalColor) {
        if (Array.isArray(lastMinedBlockMesh.material)) {
          ;(lastMinedBlockMesh.material[0] as THREE.MeshLambertMaterial).color.setHex(
            lastMinedBlockMesh.userData.originalColor
          )
        } else {
          ;(lastMinedBlockMesh.material as THREE.MeshLambertMaterial).color.setHex(
            lastMinedBlockMesh.userData.originalColor
          )
        }
      }
    }
  }

  cleanup(): void {
    document.removeEventListener('mousedown', this.onMouseDown.bind(this))
    document.removeEventListener('mouseup', this.onMouseUp.bind(this))
    document.removeEventListener('mousemove', this.onMouseMove.bind(this))
  }
}
