import { Vector3 } from 'three'
import { System } from '@/core/System'
import { Entity } from '@/types'
import { TransformComponent, VelocityComponent, CollisionComponent } from '@/components'

export class PhysicsSystem extends System {
  readonly name = 'physics'
  protected requiredComponents = ['transform', 'velocity']

  private gravity = -20
  private terminalVelocity = -50

  update(deltaTime: number, entities: Entity[]): void {
    const physicsEntities = this.getEntitiesWithComponents(entities)

    for (const entity of physicsEntities) {
      const transform = entity.getComponent<TransformComponent>('transform')!
      const velocity = entity.getComponent<VelocityComponent>('velocity')!
      const collision = entity.getComponent<CollisionComponent>('collision')

      // Apply gravity
      velocity.acceleration.y = this.gravity

      // Update velocity with acceleration
      velocity.velocity.add(velocity.acceleration.clone().multiplyScalar(deltaTime))

      // Apply terminal velocity
      velocity.velocity.y = Math.max(velocity.velocity.y, this.terminalVelocity)

      // Calculate new position
      const newPosition = transform.position.clone()
      newPosition.add(velocity.velocity.clone().multiplyScalar(deltaTime))

      // Handle collisions if collision component exists
      if (collision) {
        const finalPosition = this.handleCollisions(newPosition, collision, transform.position)
        
        // Check if we hit the ground (stopped falling)
        if (newPosition.y !== finalPosition.y && velocity.velocity.y < 0) {
          velocity.velocity.y = 0
          // Set grounded flag if entity has player component
          const player = entity.getComponent('player')
          if (player) {
            (player as any).isGrounded = true
          }
        }
        
        transform.position.copy(finalPosition)
      } else {
        transform.position.copy(newPosition)
      }

      // Reset acceleration for next frame
      velocity.acceleration.set(0, 0, 0)
    }
  }

  private handleCollisions(newPosition: Vector3, collision: CollisionComponent, _currentPosition: Vector3): Vector3 {
    // Simple AABB collision detection with world blocks
    // This is a simplified version - real implementation would check against block data
    
    const finalPosition = newPosition.clone()
    const bounds = collision.bounds
    
    // Check ground collision (simplified - assumes ground at y=0)
    if (finalPosition.y - bounds.y/2 < 0) {
      finalPosition.y = bounds.y/2
    }
    
    return finalPosition
  }
}