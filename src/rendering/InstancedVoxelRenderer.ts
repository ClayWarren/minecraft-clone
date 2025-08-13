import * as THREE from 'three'

/**
 * High-performance instanced renderer for voxel blocks
 * Critical optimization for Minecraft-style games with many identical blocks
 */
export class InstancedVoxelRenderer {
  private instancedMeshes = new Map<string, InstancedBlockMesh>()
  private scene: THREE.Scene
  private materials = new Map<string, THREE.Material>()
  private geometries = new Map<string, THREE.BufferGeometry>()

  // Performance settings
  private readonly MAX_INSTANCES_PER_MESH = 10000
  private readonly FRUSTUM_CULLING_ENABLED = true

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.setupDefaultGeometries()
  }

  /**
   * Register a block type for instanced rendering
   */
  registerBlockType(
    blockId: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material
  ): void {
    this.geometries.set(blockId, geometry)
    this.materials.set(blockId, material)
  }

  /**
   * Add a block instance to be rendered
   */
  addBlock(
    blockId: string,
    position: THREE.Vector3,
    rotation: THREE.Euler = new THREE.Euler(),
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1)
  ): number {
    let instancedMesh = this.instancedMeshes.get(blockId)

    if (!instancedMesh) {
      instancedMesh = this.createInstancedMesh(blockId)
      if (!instancedMesh) {
        console.error(`InstancedVoxelRenderer: Could not create mesh for block type '${blockId}'`)
        return -1
      }
      this.instancedMeshes.set(blockId, instancedMesh)
    }

    return instancedMesh.addInstance(position, rotation, scale)
  }

  /**
   * Remove a block instance
   */
  removeBlock(blockId: string, instanceId: number): void {
    const instancedMesh = this.instancedMeshes.get(blockId)
    if (instancedMesh) {
      instancedMesh.removeInstance(instanceId)
    }
  }

  /**
   * Update a block instance
   */
  updateBlock(
    blockId: string,
    instanceId: number,
    position?: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3
  ): void {
    const instancedMesh = this.instancedMeshes.get(blockId)
    if (instancedMesh) {
      instancedMesh.updateInstance(instanceId, position, rotation, scale)
    }
  }

  /**
   * Batch update multiple blocks for performance
   */
  batchUpdateBlocks(updates: BlockUpdate[]): void {
    const meshUpdates = new Map<string, BlockUpdate[]>()

    // Group updates by block type
    for (const update of updates) {
      if (!meshUpdates.has(update.blockId)) {
        meshUpdates.set(update.blockId, [])
      }
      meshUpdates.get(update.blockId)!.push(update)
    }

    // Apply updates per mesh
    for (const [blockId, blockUpdates] of meshUpdates) {
      const instancedMesh = this.instancedMeshes.get(blockId)
      if (instancedMesh) {
        instancedMesh.batchUpdate(blockUpdates)
      }
    }
  }

  /**
   * Clear all instances of a block type
   */
  clearBlockType(blockId: string): void {
    const instancedMesh = this.instancedMeshes.get(blockId)
    if (instancedMesh) {
      instancedMesh.clear()
    }
  }

  /**
   * Clear all blocks
   */
  clearAll(): void {
    for (const instancedMesh of this.instancedMeshes.values()) {
      instancedMesh.clear()
    }
  }

  /**
   * Get rendering statistics
   */
  getStats(): InstancedRenderingStats {
    let totalInstances = 0
    let totalMeshes = 0
    let memoryUsage = 0

    for (const [blockId, instancedMesh] of this.instancedMeshes) {
      totalMeshes++
      const instances = instancedMesh.getInstanceCount()
      totalInstances += instances

      // Estimate memory usage
      const geometry = this.geometries.get(blockId)
      if (geometry) {
        const vertexCount = geometry.attributes.position?.count || 0
        memoryUsage += vertexCount * 4 * 3 * instances // position (3 floats * 4 bytes)
        memoryUsage += vertexCount * 4 * 3 * instances // normal (3 floats * 4 bytes)
        memoryUsage += vertexCount * 4 * 2 * instances // uv (2 floats * 4 bytes)
      }
    }

    return {
      totalMeshes,
      totalInstances,
      memoryUsage: memoryUsage / (1024 * 1024), // Convert to MB
      maxInstancesPerMesh: this.MAX_INSTANCES_PER_MESH,
    }
  }

  /**
   * Optimize all meshes (remove unused instances, compact arrays)
   */
  optimize(): void {
    for (const instancedMesh of this.instancedMeshes.values()) {
      instancedMesh.optimize()
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    for (const instancedMesh of this.instancedMeshes.values()) {
      instancedMesh.dispose()
    }
    this.instancedMeshes.clear()

    for (const geometry of this.geometries.values()) {
      geometry.dispose()
    }
    this.geometries.clear()

    for (const material of this.materials.values()) {
      material.dispose()
    }
    this.materials.clear()
  }

  private createInstancedMesh(blockId: string): InstancedBlockMesh | null {
    const geometry = this.geometries.get(blockId)
    const material = this.materials.get(blockId)

    if (!geometry || !material) {
      return null
    }

    const instancedMesh = new InstancedBlockMesh(
      geometry,
      material,
      this.MAX_INSTANCES_PER_MESH,
      this.scene
    )

    return instancedMesh
  }

  private setupDefaultGeometries(): void {
    // Standard cube geometry for blocks
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)
    this.geometries.set('cube', cubeGeometry)

    // Basic material
    const basicMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 })
    this.materials.set('default', basicMaterial)
  }
}

/**
 * Manages a single instanced mesh for a specific block type
 */
class InstancedBlockMesh {
  private mesh: THREE.InstancedMesh
  private scene: THREE.Scene
  private instances: InstanceData[] = []
  private freeSlots: number[] = []
  private needsUpdate = false

  // Temporary objects for calculations
  private tempMatrix = new THREE.Matrix4()
  private tempPosition = new THREE.Vector3()
  private tempQuaternion = new THREE.Quaternion()
  private tempScale = new THREE.Vector3()

  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    maxInstances: number,
    scene: THREE.Scene
  ) {
    this.mesh = new THREE.InstancedMesh(geometry, material, maxInstances)
    this.mesh.frustumCulled = true
    this.scene = scene
    this.scene.add(this.mesh)

    // Initialize all instances as unused
    for (let i = 0; i < maxInstances; i++) {
      this.freeSlots.push(i)
      this.instances.push({
        used: false,
        position: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        scale: new THREE.Vector3(1, 1, 1),
      })
    }
  }

  addInstance(
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3
  ): number {
    if (this.freeSlots.length === 0) {
      console.warn('InstancedBlockMesh: No free slots available')
      return -1
    }

    const slotId = this.freeSlots.pop()!
    const instance = this.instances[slotId]

    instance.used = true
    instance.position.copy(position)
    instance.rotation.copy(rotation)
    instance.scale.copy(scale)

    this.updateMatrixAt(slotId)
    this.needsUpdate = true

    return slotId
  }

  removeInstance(instanceId: number): void {
    if (instanceId < 0 || instanceId >= this.instances.length) return

    const instance = this.instances[instanceId]
    if (!instance.used) return

    instance.used = false
    this.freeSlots.push(instanceId)

    // Hide the instance by setting scale to 0
    this.tempMatrix.makeScale(0, 0, 0)
    this.mesh.setMatrixAt(instanceId, this.tempMatrix)
    this.needsUpdate = true
  }

  updateInstance(
    instanceId: number,
    position?: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3
  ): void {
    if (instanceId < 0 || instanceId >= this.instances.length) return

    const instance = this.instances[instanceId]
    if (!instance.used) return

    if (position) instance.position.copy(position)
    if (rotation) instance.rotation.copy(rotation)
    if (scale) instance.scale.copy(scale)

    this.updateMatrixAt(instanceId)
    this.needsUpdate = true
  }

  batchUpdate(updates: BlockUpdate[]): void {
    for (const update of updates) {
      if (update.instanceId >= 0 && update.instanceId < this.instances.length) {
        this.updateInstance(update.instanceId, update.position, update.rotation, update.scale)
      }
    }
  }

  clear(): void {
    for (let i = 0; i < this.instances.length; i++) {
      if (this.instances[i].used) {
        this.removeInstance(i)
      }
    }
  }

  optimize(): void {
    if (this.needsUpdate) {
      this.mesh.instanceMatrix.needsUpdate = true
      this.needsUpdate = false
    }
  }

  getInstanceCount(): number {
    return this.instances.filter(instance => instance.used).length
  }

  dispose(): void {
    this.scene.remove(this.mesh)
    this.mesh.dispose()
  }

  private updateMatrixAt(instanceId: number): void {
    const instance = this.instances[instanceId]

    this.tempQuaternion.setFromEuler(instance.rotation)
    this.tempMatrix.compose(instance.position, this.tempQuaternion, instance.scale)
    this.mesh.setMatrixAt(instanceId, this.tempMatrix)
  }
}

interface InstanceData {
  used: boolean
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
}

export interface BlockUpdate {
  blockId: string
  instanceId: number
  position?: THREE.Vector3
  rotation?: THREE.Euler
  scale?: THREE.Vector3
}

export interface InstancedRenderingStats {
  totalMeshes: number
  totalInstances: number
  memoryUsage: number // MB
  maxInstancesPerMesh: number
}