import { Component, Entity as IEntity } from '@/types'

export class Entity implements IEntity {
  public readonly id: string
  public components: Map<string, Component> = new Map()

  constructor(id?: string) {
    this.id = id || this.generateId()
  }

  private generateId(): string {
    return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  addComponent(component: Component): void {
    this.components.set(component.type, component)
  }

  removeComponent(type: string): void {
    this.components.delete(type)
  }

  getComponent<T extends Component>(type: string): T | undefined {
    return this.components.get(type) as T | undefined
  }

  hasComponent(type: string): boolean {
    return this.components.has(type)
  }

  hasComponents(...types: string[]): boolean {
    return types.every(type => this.hasComponent(type))
  }
}
