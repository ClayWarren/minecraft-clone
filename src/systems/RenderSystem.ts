import * as THREE from 'three'
import { System } from '@/core/System'
import { Entity } from '@/types'
import { TransformComponent, MeshComponent } from '@/components'

type Weather = {
  type: 'clear' | 'rain' | 'snow' | 'storm'
  intensity?: number
}

export class RenderSystem extends System {
  readonly name = 'render'
  protected requiredComponents = ['transform', 'mesh']

  private scene: THREE.Scene
  private renderer: THREE.WebGLRenderer
  private camera: THREE.PerspectiveCamera
  // Lights are passed in but not directly used in this class
  private rainParticles: THREE.Points | null = null
  private snowParticles: THREE.Points | null = null

  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    _ambientLight: THREE.AmbientLight, // Marked as unused with _ prefix
    _directionalLight: THREE.DirectionalLight // Marked as unused with _ prefix
  ) {
    super()
    this.scene = scene
    this.renderer = renderer
    this.camera = camera
    // Lights are passed to the scene in the constructor

    this.initWeatherParticles()
  }

  private initWeatherParticles(): void {
    // Rain particles
    const rainGeometry = new THREE.BufferGeometry()
    const rainCount = 10000
    const rainPositions = new Float32Array(rainCount * 3)
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPositions[i] = Math.random() * 200 - 100
      rainPositions[i + 1] = Math.random() * 200
      rainPositions[i + 2] = Math.random() * 200 - 100
    }
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3))
    const rainMaterial = new THREE.PointsMaterial({
      color: 0xadd8e6,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
    })
    this.rainParticles = new THREE.Points(rainGeometry, rainMaterial)
    this.rainParticles.visible = false
    this.scene.add(this.rainParticles)

    // Snow particles
    const snowGeometry = new THREE.BufferGeometry()
    const snowCount = 5000
    const snowPositions = new Float32Array(snowCount * 3)
    for (let i = 0; i < snowCount * 3; i += 3) {
      snowPositions[i] = Math.random() * 200 - 100
      snowPositions[i + 1] = Math.random() * 200
      snowPositions[i + 2] = Math.random() * 200 - 100
    }
    snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3))
    const snowMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0.8,
    })
    this.snowParticles = new THREE.Points(snowGeometry, snowMaterial)
    this.snowParticles.visible = false
    this.scene.add(this.snowParticles)
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

    // Update weather particles
    if (this.rainParticles && this.rainParticles.visible) {
      const positions = this.rainParticles.geometry.attributes.position.array as Float32Array
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 0.5 // Fall speed
        if (positions[i] < 0) positions[i] = 200 // Reset to top
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true
    }

    if (this.snowParticles && this.snowParticles.visible) {
      const positions = this.snowParticles.geometry.attributes.position.array as Float32Array
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 0.2 // Fall speed
        if (positions[i] < 0) positions[i] = 200 // Reset to top
      }
      this.snowParticles.geometry.attributes.position.needsUpdate = true
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera)
  }

  public updateWeather(weather: Weather): void {
    if (this.rainParticles) this.rainParticles.visible = false
    if (this.snowParticles) this.snowParticles.visible = false

    switch (weather.type) {
      case 'rain':
        if (this.rainParticles) this.rainParticles.visible = true
        break
      case 'snow':
        if (this.snowParticles) this.snowParticles.visible = true
        break
      case 'storm':
        // For storm, show both rain and potentially add lightning/darker sky
        if (this.rainParticles) this.rainParticles.visible = true
        // TODO: Add lightning effect
        break
      case 'clear':
      default:
        // All particles are already hidden
        break
    }
    console.log(`Client: Weather updated to ${weather.type}`)
  }
}
