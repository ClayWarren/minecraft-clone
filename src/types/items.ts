export interface Item {
  id: string
  name: string
  stackable: boolean
  maxStackSize: number
}

export interface ItemStack {
  item: Item
  quantity: number
}
