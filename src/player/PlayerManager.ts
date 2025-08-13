
import { Player } from '../types/server'
import { ItemStack } from '../types/items'

export class PlayerManager {
  private players: Map<string, Player> = new Map()

  createPlayer(id: string, username: string): Player {
    // Example starting inventory
    const inventory: (ItemStack | null)[] = [
      { item: { id: 'dirt', name: 'Dirt', stackable: true, maxStackSize: 64 }, quantity: 64 },
      { item: { id: 'stone', name: 'Stone', stackable: true, maxStackSize: 64 }, quantity: 64 },
      { item: { id: 'wood', name: 'Wood', stackable: true, maxStackSize: 64 }, quantity: 32 },
      { item: { id: 'bedrock', name: 'Bedrock', stackable: true, maxStackSize: 999 }, quantity: 999 },
      null, null, null, null, null
    ]
    const player: Player = {
      id,
      username,
      position: { x: 0, y: 80, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 20,
      inventory,
      isFlying: false,
      isGrounded: false
    }
    this.addPlayer(player)
    return player
  }

  addPlayer(player: Player) {
    this.players.set(player.id, player)
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id)
  }

  removePlayer(id: string) {
    this.players.delete(id)
  }

  getAllPlayers(): Player[] {
    return Array.from(this.players.values())
  }
}
