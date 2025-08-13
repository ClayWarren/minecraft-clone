import { Component } from '@/types'

export class MobComponent implements Component {
  readonly type = 'mob'
  public mobType: string
  public health: number

  constructor(mobType: string, health: number) {
    this.mobType = mobType
    this.health = health
  }
}