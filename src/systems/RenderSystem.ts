import * as THREE from 'three'
import { System } from '@/core/System'
import { Entity } from '@/types'
import { TransformComponent, MeshComponent } from '@/components'

export class RenderSystem extends System {
  readonly name = 'render'
  protected requiredComponents = ['transform', 'mesh']

  private scene: THREE.Scene
  private renderer: THREE.WebGLRenderer
  private camera: THREE.PerspectiveCamera

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
    super()
    this.scene = scene
    this.renderer = renderer
    this.camera = camera
  }

  update(_deltaTime: number, entities: Entity[]): void {
    const renderableEntities = this.getEntitiesWithComponents(entities)

    for (const entity of renderableEntities) {
      const transform = entity.getComponent<TransformComponent>('transform')!
      const mesh = entity.getComponent<MeshComponent>('mesh')!

      // Update mesh transform from component
      mesh.mesh.position.copy(transform.position)
      mesh.mesh.rotation.setFromVector3(transform.rotation)
      mesh.mesh.scale.copy(transform.scale)

      // Update visibility
      mesh.mesh.visible = mesh.visible

      // Ensure mesh is in scene
      if (!this.scene.children.includes(mesh.mesh)) {
        this.scene.add(mesh.mesh)
      }
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera)
  }

  cleanup(): void {
    // Remove all meshes from scene
    const meshesToRemove: THREE.Object3D[] = []
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshesToRemove.push(object)
      }
    })

    for (const mesh of meshesToRemove) {
      this.scene.remove(mesh)
    }
  }
}