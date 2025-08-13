/**
 * Professional game state management system
 * Handles transitions between different game states (menu, loading, playing, etc.)
 */
export enum GameState {
  INITIALIZING = 'initializing',
  MENU = 'menu',
  LOADING = 'loading',
  PLAYING = 'playing',
  PAUSED = 'paused',
  INVENTORY = 'inventory',
  CRAFTING = 'crafting',
  GAME_OVER = 'game_over',
  SETTINGS = 'settings',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
}

export interface StateHandler {
  /**
   * Called when entering this state
   */
  onEnter?(previousState: GameState, data?: unknown): void

  /**
   * Called every frame while in this state
   */
  onUpdate?(deltaTime: number): void

  /**
   * Called when exiting this state
   */
  onExit?(nextState: GameState): void

  /**
   * Handle input events in this state
   */
  onInput?(event: InputEvent): boolean // Return true if input was consumed

  /**
   * Called when the state should render
   */
  onRender?(alpha: number): void
}

export interface StateTransition {
  from: GameState
  to: GameState
  condition?: () => boolean
  onTransition?: (data?: unknown) => void
}

export class GameStateManager {
  private currentState: GameState = GameState.INITIALIZING
  private previousState: GameState = GameState.INITIALIZING
  private stateHandlers = new Map<GameState, StateHandler>()
  private transitions = new Map<string, StateTransition>()
  private stateData: unknown = null
  private isTransitioning = false

  // State timing
  private stateStartTime = 0
  private stateElapsedTime = 0

  /**
   * Register a state handler
   */
  registerState(state: GameState, handler: StateHandler): void {
    this.stateHandlers.set(state, handler)
  }

  /**
   * Register a state transition
   */
  registerTransition(transition: StateTransition): void {
    const key = `${transition.from}->${transition.to}`
    this.transitions.set(key, transition)
  }

  /**
   * Change to a new state
   */
  changeState(newState: GameState, data?: unknown): void {
    if (this.isTransitioning) {
      console.warn('GameStateManager: Already transitioning, ignoring state change')
      return
    }

    if (newState === this.currentState) {
      return // Already in this state
    }

    // Check if transition is allowed
    const transitionKey = `${this.currentState}->${newState}`
    const transition = this.transitions.get(transitionKey)

    if (transition && transition.condition && !transition.condition()) {
      console.warn(`GameStateManager: Transition condition failed for ${transitionKey}`)
      return
    }

    this.isTransitioning = true

    // Exit current state
    const currentHandler = this.stateHandlers.get(this.currentState)
    if (currentHandler?.onExit) {
      currentHandler.onExit(newState)
    }

    // Store previous state
    this.previousState = this.currentState
    this.currentState = newState
    this.stateData = data
    this.stateStartTime = performance.now()
    this.stateElapsedTime = 0

    // Execute transition callback
    if (transition?.onTransition) {
      transition.onTransition(data)
    }

    // Enter new state
    const newHandler = this.stateHandlers.get(newState)
    if (newHandler?.onEnter) {
      newHandler.onEnter(this.previousState, data)
    }

    this.isTransitioning = false

    console.log(`GameStateManager: Transitioned from ${this.previousState} to ${this.currentState}`)
  }

  /**
   * Update the current state
   */
  update(deltaTime: number): void {
    this.stateElapsedTime = performance.now() - this.stateStartTime

    const handler = this.stateHandlers.get(this.currentState)
    if (handler?.onUpdate) {
      handler.onUpdate(deltaTime)
    }
  }

  /**
   * Render the current state
   */
  render(alpha: number): void {
    const handler = this.stateHandlers.get(this.currentState)
    if (handler?.onRender) {
      handler.onRender(alpha)
    }
  }

  /**
   * Handle input for the current state
   */
  handleInput(event: InputEvent): boolean {
    const handler = this.stateHandlers.get(this.currentState)
    if (handler?.onInput) {
      return handler.onInput(event)
    }
    return false
  }

  /**
   * Get current state
   */
  getCurrentState(): GameState {
    return this.currentState
  }

  /**
   * Get previous state
   */
  getPreviousState(): GameState {
    return this.previousState
  }

  /**
   * Get state data
   */
  getStateData<T>(): T | null {
    return this.stateData as T | null
  }

  /**
   * Get time elapsed in current state (in milliseconds)
   */
  getStateElapsedTime(): number {
    return this.stateElapsedTime
  }

  /**
   * Check if currently transitioning
   */
  getIsTransitioning(): boolean {
    return this.isTransitioning
  }

  /**
   * Check if a specific transition is allowed
   */
  canTransition(to: GameState): boolean {
    const transitionKey = `${this.currentState}->${to}`
    const transition = this.transitions.get(transitionKey)

    if (!transition) {
      return false // No registered transition
    }

    if (transition.condition) {
      return transition.condition()
    }

    return true
  }

  /**
   * Get all possible transitions from current state
   */
  getAvailableTransitions(): GameState[] {
    const available: GameState[] = []

    for (const [key, transition] of this.transitions) {
      if (transition.from === this.currentState) {
        if (!transition.condition || transition.condition()) {
          available.push(transition.to)
        }
      }
    }

    return available
  }
}

/**
 * Common input event interface for game state handling
 */
export interface InputEvent {
  type: 'keydown' | 'keyup' | 'mousedown' | 'mouseup' | 'mousemove' | 'wheel'
  key?: string
  button?: number
  deltaX?: number
  deltaY?: number
  clientX?: number
  clientY?: number
  preventDefault(): void
  stopPropagation(): void
}

/**
 * Utility function to create common game state transitions
 */
export function createStandardTransitions(): StateTransition[] {
  return [
    // Menu transitions
    { from: GameState.INITIALIZING, to: GameState.MENU },
    { from: GameState.MENU, to: GameState.LOADING },
    { from: GameState.MENU, to: GameState.SETTINGS },
    { from: GameState.SETTINGS, to: GameState.MENU },

    // Game transitions
    { from: GameState.LOADING, to: GameState.PLAYING },
    { from: GameState.PLAYING, to: GameState.PAUSED },
    { from: GameState.PAUSED, to: GameState.PLAYING },
    { from: GameState.PLAYING, to: GameState.INVENTORY },
    { from: GameState.INVENTORY, to: GameState.PLAYING },
    { from: GameState.PLAYING, to: GameState.CRAFTING },
    { from: GameState.CRAFTING, to: GameState.PLAYING },

    // Exit transitions
    { from: GameState.PLAYING, to: GameState.MENU },
    { from: GameState.PAUSED, to: GameState.MENU },
    { from: GameState.GAME_OVER, to: GameState.MENU },

    // Multiplayer transitions
    { from: GameState.MENU, to: GameState.CONNECTING },
    { from: GameState.CONNECTING, to: GameState.LOADING },
    { from: GameState.CONNECTING, to: GameState.DISCONNECTED },
    { from: GameState.DISCONNECTED, to: GameState.MENU },
    { from: GameState.PLAYING, to: GameState.DISCONNECTED },
  ]
}