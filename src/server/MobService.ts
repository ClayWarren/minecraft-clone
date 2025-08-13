import { DEFAULT_WORLD_CONFIG } from './constants'
import type { Player, Mob, ServerPlayer, Chunk } from '../types/server'

interface MobDrop {
  item: string
  quantity: number
  chance: number
}

interface AttackResult {
  mobDied: boolean
  mobUpdated: boolean
  inventoryUpdated: boolean
  mob?: Mob
}

export class MobService {
  private mobs: Map<string, Mob> = new Map()
  private mobDrops: Record<string, MobDrop[]> = {
    zombie: [
      { item: 'rotten_flesh', quantity: 1, chance: 0.8 },
      { item: 'iron_ingot', quantity: 1, chance: 0.1 },
    ],
    sheep: [
      { item: 'mutton', quantity: 1, chance: 0.9 },
      { item: 'wool', quantity: 1, chance: 0.7 },
    ],
  }

  public spawnMobs(players: Player[], chunks: Map<string, Chunk>): void {
    // Only spawn mobs if there are players online
    if (players.length === 0) return

    // Simple mob spawning logic
    const maxMobs = 50 // Max number of mobs in the world
    if (this.mobs.size >= maxMobs) return

    // Iterate over loaded chunks (where players are)
    chunks.forEach((chunk, chunkKey) => {
      if (!chunk) return

      // Randomly decide to spawn a mob in this chunk
      if (Math.random() < 0.01) {
        // 1% chance per chunk per second
        const timeOfDay = this.getTimeOfDay() // This would need to be passed in or calculated
        const mobType = timeOfDay > 13000 || timeOfDay < 2000 ? 'zombie' : 'sheep' // Simple day/night mob type

        // Find a suitable spawn position within the chunk
        const chunkX = parseInt(chunkKey.split(',')[0])
        const chunkZ = parseInt(chunkKey.split(',')[1])

        const worldX =
          chunkX * DEFAULT_WORLD_CONFIG.chunkSize +
          Math.floor(Math.random() * DEFAULT_WORLD_CONFIG.chunkSize)
        const worldZ =
          chunkZ * DEFAULT_WORLD_CONFIG.chunkSize +
          Math.floor(Math.random() * DEFAULT_WORLD_CONFIG.chunkSize)
        const worldY = this.getGroundHeight(worldX, worldZ, chunks) + 1 // Spawn 1 block above ground

        // Check if spawn position is valid (e.g., not inside a block)
        const blockAtSpawn = this.getBlockAt(worldX, worldY, worldZ, chunks)
        if (blockAtSpawn === 'air') {
          this.spawnMob(mobType, worldX, worldY, worldZ)
        }
      }
    })
  }

  public updateMobsAI(worldService: {
    getBlockAt?: (x: number, y: number, z: number) => string
  }): void {
    this.mobs.forEach(mob => {
      // Simple random walk for all mobs for now
      const speed = 0.05 // Blocks per second
      const currentPosition = mob.position

      // Generate a random direction if no target or reached target
      if (!mob.velocity || (Math.abs(mob.velocity.x) < 0.01 && Math.abs(mob.velocity.z) < 0.01)) {
        const angle = Math.random() * Math.PI * 2
        mob.velocity = {
          x: Math.cos(angle) * speed,
          y: 0,
          z: Math.sin(angle) * speed,
        }
      }

      // Apply velocity
      const newX = currentPosition.x + mob.velocity.x
      let newY = currentPosition.y + mob.velocity.y
      const newZ = currentPosition.z + mob.velocity.z

      // Simple collision detection with ground
      const groundY = this.getGroundHeight(newX, newZ, worldService.getAllChunks())
      if (newY <= groundY) {
        newY = groundY + 0.01 // Stay slightly above ground
        mob.velocity.y = 0
      }

      // Update mob position
      mob.position = { x: newX, y: newY, z: newZ }
    })
  }

  public handleAttack(attacker: ServerPlayer, targetId: string, damage: number): AttackResult {
    const targetMob = this.mobs.get(targetId)

    if (!targetMob) {
      console.log(`Attack on non-existent mob: ${targetId}`)
      return { mobDied: false, mobUpdated: false, inventoryUpdated: false }
    }

    targetMob.health -= damage
    console.log(`Mob ${targetId} took ${damage} damage. Health: ${targetMob.health}`)

    if (targetMob.health <= 0) {
      // Mob died
      this.mobs.delete(targetId)
      console.log(`Mob ${targetId} died.`)

      // Implement mob drops
      const drops = this.mobDrops[targetMob.type]
      let inventoryUpdated = false

      if (drops && attacker) {
        drops.forEach(drop => {
          if (Math.random() < drop.chance) {
            // Add mob drop to inventory
            let found = false
            for (const stack of attacker.inventory) {
              if (stack && stack.item.id === drop.item) {
                stack.quantity += drop.quantity
                found = true
                inventoryUpdated = true
                break
              }
            }
            if (!found) {
              const emptyIdx = attacker.inventory.findIndex(s => s === null)
              if (emptyIdx !== -1) {
                attacker.inventory[emptyIdx] = {
                  item: { id: drop.item, name: drop.item, stackable: true, maxStackSize: 64 },
                  quantity: drop.quantity,
                }
                inventoryUpdated = true
              }
            }
            console.log(
              `Player ${attacker.id} received ${drop.quantity} ${drop.item}. Inventory updated.`
            )
          }
        })
      }

      return { mobDied: true, mobUpdated: false, inventoryUpdated }
    } else {
      // Mob took damage, broadcast update
      return { mobDied: false, mobUpdated: true, inventoryUpdated: false, mob: targetMob }
    }
  }

  public getAllMobs(): Map<string, Mob> {
    return this.mobs
  }

  private spawnMob(type: string, x: number, y: number, z: number): void {
    const mobId = this.generateMobId()
    const mob: Mob = {
      id: mobId,
      type,
      position: { x, y, z },
      health: 10,
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    }
    this.mobs.set(mobId, mob)
    console.log(`Spawned ${type} at ${x},${y},${z}`)
  }

  private generateMobId(): string {
    return 'mob-' + Math.random().toString(36).substr(2, 9)
  }

  private getTimeOfDay(): number {
    // This is a placeholder - in a real implementation, this would be passed from the server
    return 6000 // Default to noon
  }

  private getGroundHeight(x: number, z: number, chunks: Map<string, Chunk>): number {
    // Find the highest block at this position using chunk/block logic
    for (let y = DEFAULT_WORLD_CONFIG.worldHeight - 1; y >= 0; y--) {
      const blockKey = `${Math.floor(x)},${y},${Math.floor(z)}`
      const chunkX = Math.floor(Math.floor(x) / DEFAULT_WORLD_CONFIG.chunkSize)
      const chunkZ = Math.floor(Math.floor(z) / DEFAULT_WORLD_CONFIG.chunkSize)
      const chunk = chunks.get(`${chunkX},${chunkZ}`)
      if (chunk && chunk.blocks.has(blockKey)) {
        return y
      }
    }
    return 0
  }

  private getBlockAt(x: number, y: number, z: number, chunks: Map<string, Chunk>): string {
    const chunkX = Math.floor(x / DEFAULT_WORLD_CONFIG.chunkSize)
    const chunkZ = Math.floor(z / DEFAULT_WORLD_CONFIG.chunkSize)
    const chunk = chunks.get(`${chunkX},${chunkZ}`)

    if (!chunk) return 'air' // If chunk not loaded, assume air

    const blockKey = `${x},${y},${z}`
    return chunk.blocks.get(blockKey) || 'air'
  }
}
