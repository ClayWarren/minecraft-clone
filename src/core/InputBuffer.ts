/**
 * Input buffering system for responsive game controls
 * Critical for competitive games and smooth player experience
 */
export enum InputActionType {
  // Movement
  MOVE_FORWARD = 'move_forward',
  MOVE_BACKWARD = 'move_backward',
  MOVE_LEFT = 'move_left',
  MOVE_RIGHT = 'move_right',
  JUMP = 'jump',
  SNEAK = 'sneak',
  SPRINT = 'sprint',

  // Interaction
  PRIMARY_ACTION = 'primary_action', // Left click / mine
  SECONDARY_ACTION = 'secondary_action', // Right click / place
  TERTIARY_ACTION = 'tertiary_action', // Middle click / pick block

  // UI
  OPEN_INVENTORY = 'open_inventory',
  OPEN_CRAFTING = 'open_crafting',
  HOTBAR_1 = 'hotbar_1',
  HOTBAR_2 = 'hotbar_2',
  HOTBAR_3 = 'hotbar_3',
  HOTBAR_4 = 'hotbar_4',
  HOTBAR_5 = 'hotbar_5',
  HOTBAR_6 = 'hotbar_6',
  HOTBAR_7 = 'hotbar_7',
  HOTBAR_8 = 'hotbar_8',
  HOTBAR_9 = 'hotbar_9',
  SCROLL_UP = 'scroll_up',
  SCROLL_DOWN = 'scroll_down',

  // System
  PAUSE = 'pause',
  EXIT = 'exit',
}

export interface InputAction {
  type: InputActionType
  timestamp: number
  consumed: boolean
  data?: InputActionData
}

export interface InputActionData {
  // Mouse data
  mouseX?: number
  mouseY?: number
  mouseDeltaX?: number
  mouseDeltaY?: number
  button?: number

  // Keyboard data
  key?: string
  repeat?: boolean

  // Scroll data
  deltaY?: number

  // Custom data
  [key: string]: unknown
}

export class InputBuffer {
  private buffer: InputAction[] = []
  private readonly BUFFER_TIME = 150 // ms - how long to keep inputs
  private readonly MAX_BUFFER_SIZE = 100

  // Input mapping
  private keyToAction = new Map<string, InputActionType>()
  private mouseToAction = new Map<number, InputActionType>()

  constructor() {
    this.setupDefaultKeyMappings()
  }

  /**
   * Add an input action to the buffer
   */
  addInput(type: InputActionType, data?: InputActionData): void {
    const action: InputAction = {
      type,
      timestamp: performance.now(),
      consumed: false,
      data,
    }

    this.buffer.push(action)

    // Prevent buffer from growing too large
    if (this.buffer.length > this.MAX_BUFFER_SIZE) {
      this.buffer.shift()
    }

    // Clean expired inputs
    this.cleanExpiredInputs()
  }

  /**
   * Consume the most recent input of a specific type
   */
  consumeInput(actionType: InputActionType): InputAction | null {
    // Find the most recent unconsumed input of this type
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      const action = this.buffer[i]
      if (action.type === actionType && !action.consumed) {
        action.consumed = true
        return action
      }
    }
    return null
  }

  /**
   * Peek at the most recent input without consuming it
   */
  peekInput(actionType: InputActionType): InputAction | null {
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      const action = this.buffer[i]
      if (action.type === actionType && !action.consumed) {
        return action
      }
    }
    return null
  }

  /**
   * Get all unconsumed inputs of a specific type
   */
  getAllInputs(actionType: InputActionType): InputAction[] {
    return this.buffer.filter(action => action.type === actionType && !action.consumed)
  }

  /**
   * Check if an input type was triggered recently
   */
  wasTriggered(actionType: InputActionType, withinMs: number = this.BUFFER_TIME): boolean {
    const now = performance.now()
    return this.buffer.some(
      action =>
        action.type === actionType &&
        !action.consumed &&
        now - action.timestamp <= withinMs
    )
  }

  /**
   * Clear all inputs
   */
  clear(): void {
    this.buffer.length = 0
  }

  /**
   * Clear expired inputs
   */
  cleanExpiredInputs(): void {
    const now = performance.now()
    this.buffer = this.buffer.filter(action => now - action.timestamp <= this.BUFFER_TIME)
  }

  /**
   * Handle keyboard input
   */
  handleKeyboardInput(event: KeyboardEvent): void {
    const actionType = this.keyToAction.get(event.code.toLowerCase())
    if (actionType) {
      this.addInput(actionType, {
        key: event.code,
        repeat: event.repeat,
      })
    }
  }

  /**
   * Handle mouse input
   */
  handleMouseInput(event: MouseEvent): void {
    let actionType: InputActionType | undefined

    switch (event.type) {
      case 'mousedown':
        actionType = this.mouseToAction.get(event.button)
        break
      case 'wheel':
        const wheelEvent = event as WheelEvent
        actionType = wheelEvent.deltaY < 0 ? InputActionType.SCROLL_UP : InputActionType.SCROLL_DOWN
        break
    }

    if (actionType) {
      this.addInput(actionType, {
        mouseX: event.clientX,
        mouseY: event.clientY,
        button: event.button,
        deltaY: (event as WheelEvent).deltaY,
      })
    }
  }

  /**
   * Map a key to an action
   */
  mapKey(key: string, action: InputActionType): void {
    this.keyToAction.set(key.toLowerCase(), action)
  }

  /**
   * Map a mouse button to an action
   */
  mapMouseButton(button: number, action: InputActionType): void {
    this.mouseToAction.set(button, action)
  }

  /**
   * Get current buffer statistics
   */
  getStats(): {
    bufferSize: number
    unconsumedInputs: number
    oldestInputAge: number
  } {
    const now = performance.now()
    const unconsumed = this.buffer.filter(action => !action.consumed).length
    const oldestAge = this.buffer.length > 0 ? now - this.buffer[0].timestamp : 0

    return {
      bufferSize: this.buffer.length,
      unconsumedInputs: unconsumed,
      oldestInputAge: oldestAge,
    }
  }

  private setupDefaultKeyMappings(): void {
    // Movement
    this.mapKey('keyw', InputActionType.MOVE_FORWARD)
    this.mapKey('keys', InputActionType.MOVE_BACKWARD)
    this.mapKey('keya', InputActionType.MOVE_LEFT)
    this.mapKey('keyd', InputActionType.MOVE_RIGHT)
    this.mapKey('space', InputActionType.JUMP)
    this.mapKey('shiftleft', InputActionType.SNEAK)
    this.mapKey('controlleft', InputActionType.SPRINT)

    // UI
    this.mapKey('keye', InputActionType.OPEN_INVENTORY)
    this.mapKey('keyc', InputActionType.OPEN_CRAFTING)
    this.mapKey('escape', InputActionType.PAUSE)

    // Hotbar
    this.mapKey('digit1', InputActionType.HOTBAR_1)
    this.mapKey('digit2', InputActionType.HOTBAR_2)
    this.mapKey('digit3', InputActionType.HOTBAR_3)
    this.mapKey('digit4', InputActionType.HOTBAR_4)
    this.mapKey('digit5', InputActionType.HOTBAR_5)
    this.mapKey('digit6', InputActionType.HOTBAR_6)
    this.mapKey('digit7', InputActionType.HOTBAR_7)
    this.mapKey('digit8', InputActionType.HOTBAR_8)
    this.mapKey('digit9', InputActionType.HOTBAR_9)

    // Mouse
    this.mapMouseButton(0, InputActionType.PRIMARY_ACTION) // Left click
    this.mapMouseButton(2, InputActionType.SECONDARY_ACTION) // Right click
    this.mapMouseButton(1, InputActionType.TERTIARY_ACTION) // Middle click
  }
}

/**
 * Input combo system for complex input sequences
 */
export class InputComboSystem {
  private combos = new Map<string, InputCombo>()
  private activeSequences = new Map<string, SequenceState>()

  /**
   * Register an input combo
   */
  registerCombo(combo: InputCombo): void {
    this.combos.set(combo.id, combo)
  }

  /**
   * Check for combo matches against input buffer
   */
  checkCombos(inputBuffer: InputBuffer): InputCombo[] {
    const triggeredCombos: InputCombo[] = []

    for (const combo of this.combos.values()) {
      if (this.isComboTriggered(combo, inputBuffer)) {
        triggeredCombos.push(combo)
      }
    }

    return triggeredCombos
  }

  private isComboTriggered(combo: InputCombo, inputBuffer: InputBuffer): boolean {
    const now = performance.now()

    // Check if all inputs in sequence are present within time window
    let lastTimestamp = 0
    for (const inputType of combo.sequence) {
      const input = inputBuffer.peekInput(inputType)
      if (!input || input.timestamp < lastTimestamp) {
        return false
      }

      if (now - input.timestamp > combo.maxDuration) {
        return false
      }

      lastTimestamp = input.timestamp
    }

    // All inputs found in correct order and timing
    return true
  }
}

export interface InputCombo {
  id: string
  sequence: InputActionType[]
  maxDuration: number // Maximum time between inputs
  onTrigger: () => void
}

interface SequenceState {
  currentIndex: number
  startTime: number
}

// Global input buffer instance
export const inputBuffer = new InputBuffer()
export const inputComboSystem = new InputComboSystem()