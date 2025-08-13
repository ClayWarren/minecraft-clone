import { Item } from './items';

export const ITEM_REGISTRY: Record<string, Item> = {
  dirt: { id: 'dirt', name: 'Dirt', stackable: true, maxStackSize: 64 },
  stone: { id: 'stone', name: 'Stone', stackable: true, maxStackSize: 64 },
  wood: { id: 'wood', name: 'Wood', stackable: true, maxStackSize: 64 },
  planks: { id: 'planks', name: 'Planks', stackable: true, maxStackSize: 64 },
  // Add more items as needed
};
