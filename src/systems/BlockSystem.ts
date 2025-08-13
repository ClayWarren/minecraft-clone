import * as THREE from 'three'
import { System } from '@/core/System'
import { Entity } from '@/types'
import { InventoryComponent } from '@/components'
import { WorldComponent } from '@/components/BlockComponent'
import { getBlockType, BlockPosition, TOOL_EFFECTIVENESS } from '@/types/blocks'

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
  
  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    super()
    this.camera = camera
    this.scene = scene
    this.setupEventListeners()
  }
  
  private setupEventListeners(): void {
    document.addEventListener('mousedown', this.onMouseDown.bind(this))
    document.addEventListener('mouseup', this.onMouseUp.bind(this))
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
    document.addEventListener('contextmenu', (e) => e.preventDefault())
  }
  
  private onMouseDown(event: MouseEvent): void {
    if (!document.pointerLockElement) return
    
    this.isMouseDown = true
    
    if (event.button === 0) { // Left click - mine block
      this.startMining()
    } else if (event.button === 2) { // Right click - place block
      this.placeBlock()
    }
  }
  
  private onMouseUp(event: MouseEvent): void {
    this.isMouseDown = false
    
    if (event.button === 0) { // Left click released
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
    
    console.log(`Started mining ${blockData.name} at ${targetBlock.x},${targetBlock.y},${targetBlock.z}`)
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
    
    // Calculate mining speed based on tool
    // const inventory = this.playerEntity.getComponent<InventoryComponent>('inventory')!
    const miningSpeed = this.getMiningSpeed(blockType, 'hand') // TODO: Get actual tool from inventory
    
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
    for (const drop of blockData.drops) {
      inventory.addItem(drop, 1)
    }
    
    console.log(`Broke ${blockData.name}, got ${blockData.drops.join(', ')}`)
  }
  
  private placeBlock(): void {
    const targetPosition = this.getPlacementPosition()
    if (!targetPosition) return
    
    const inventory = this.playerEntity.getComponent<InventoryComponent>('inventory')!
    
    // Get selected block type from inventory (for now, use dirt)
    const blockTypeToPlace = 'dirt' // TODO: Get from selected hotbar slot
    
    if (!inventory.hasItem(blockTypeToPlace)) {
      console.log(`No ${blockTypeToPlace} in inventory`)
      return
    }
    
    const world = this.worldEntity.getComponent<WorldComponent>('world')!
    const currentBlock = world.getBlockAt(targetPosition)
    
    if (currentBlock !== 'air') {
      console.log('Cannot place block - position occupied')
      return
    }
    
    // Place block
    world.setBlockAt(targetPosition, blockTypeToPlace)
    inventory.removeItem(blockTypeToPlace, 1)
    
    // Create mesh for new block
    this.createBlockMesh(targetPosition, blockTypeToPlace)
    
    console.log(`Placed ${blockTypeToPlace} at ${targetPosition.x},${targetPosition.y},${targetPosition.z}`)
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
          z: blockPos.z + Math.round(normal.z)
        }
      }
    }
    
    return null
  }
  
  private createBlockMesh(position: BlockPosition, blockType: string): void {
    const blockData = getBlockType(blockType)
    if (!blockData) return
    
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshLambertMaterial({ color: blockData.color })
    const mesh = new THREE.Mesh(geometry, material)
    
    mesh.position.set(position.x, position.y, position.z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.blockPosition = position
    
    this.scene.add(mesh)
  }
  
  private removeBlockMesh(position: BlockPosition): void {
    // Find and remove the mesh at this position
    const meshToRemove = this.scene.children.find(child => {
      return child.userData.blockPosition && 
             child.userData.blockPosition.x === position.x &&
             child.userData.blockPosition.y === position.y &&
             child.userData.blockPosition.z === position.z
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
  
  private updateBlockHighlight(): void {
    // TODO: Add block highlighting for target block
    // This would show which block the player is looking at
  }
  
  cleanup(): void {
    document.removeEventListener('mousedown', this.onMouseDown.bind(this))
    document.removeEventListener('mouseup', this.onMouseUp.bind(this))
    document.removeEventListener('mousemove', this.onMouseMove.bind(this))
  }
}