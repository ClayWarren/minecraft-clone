/**
 * Professional game loop with fixed timestep physics
 * Ensures consistent physics simulation regardless of frame rate
 */
export class GameLoop {
  private isRunning = false
  private lastTime = 0
  private accumulator = 0
  private currentTime = 0
  private frameTime = 0

  // Fixed timestep for physics (60 FPS)
  private readonly FIXED_TIMESTEP = 1 / 60 // 16.67ms
  private readonly MAX_FRAME_TIME = 0.25 // Prevent spiral of death

  // Performance tracking
  private frameCount = 0
  private fpsTimer = 0
  private currentFPS = 0
  private averageFrameTime = 0

  // Callbacks
  private fixedUpdateCallback?: (deltaTime: number) => void
  private updateCallback?: (deltaTime: number, alpha: number) => void
  private renderCallback?: (alpha: number) => void

  constructor() {
    this.tick = this.tick.bind(this)
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.lastTime = performance.now()
    this.accumulator = 0
    requestAnimationFrame(this.tick)
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.isRunning = false
  }

  /**
   * Set the fixed update callback (physics)
   */
  setFixedUpdateCallback(callback: (deltaTime: number) => void): void {
    this.fixedUpdateCallback = callback
  }

  /**
   * Set the variable update callback (game logic)
   */
  setUpdateCallback(callback: (deltaTime: number, alpha: number) => void): void {
    this.updateCallback = callback
  }

  /**
   * Set the render callback
   */
  setRenderCallback(callback: (alpha: number) => void): void {
    this.renderCallback = callback
  }

  /**
   * Main game loop tick
   */
  private tick(timestamp: number): void {
    if (!this.isRunning) return

    this.currentTime = timestamp
    const frameTime = Math.min((this.currentTime - this.lastTime) / 1000, this.MAX_FRAME_TIME)
    this.lastTime = this.currentTime

    this.accumulator += frameTime

    // Fixed timestep physics updates
    while (this.accumulator >= this.FIXED_TIMESTEP) {
      if (this.fixedUpdateCallback) {
        this.fixedUpdateCallback(this.FIXED_TIMESTEP)
      }
      this.accumulator -= this.FIXED_TIMESTEP
    }

    // Interpolation factor for smooth rendering
    const alpha = this.accumulator / this.FIXED_TIMESTEP

    // Variable timestep updates (input, AI, etc.)
    if (this.updateCallback) {
      this.updateCallback(frameTime, alpha)
    }

    // Rendering with interpolation
    if (this.renderCallback) {
      this.renderCallback(alpha)
    }

    // Performance tracking
    this.updatePerformanceStats(frameTime)

    // Continue loop
    requestAnimationFrame(this.tick)
  }

  /**
   * Update performance statistics
   */
  private updatePerformanceStats(frameTime: number): void {
    this.frameCount++
    this.fpsTimer += frameTime
    this.frameTime = frameTime

    // Update FPS every second
    if (this.fpsTimer >= 1.0) {
      this.currentFPS = this.frameCount / this.fpsTimer
      this.averageFrameTime = (this.fpsTimer / this.frameCount) * 1000 // Convert to ms
      this.frameCount = 0
      this.fpsTimer = 0
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceStats(): {
    fps: number
    frameTime: number
    averageFrameTime: number
    accumulator: number
  } {
    return {
      fps: Math.round(this.currentFPS),
      frameTime: Math.round(this.frameTime * 1000 * 100) / 100, // ms with 2 decimal places
      averageFrameTime: Math.round(this.averageFrameTime * 100) / 100,
      accumulator: Math.round(this.accumulator * 1000 * 100) / 100,
    }
  }

  /**
   * Get current interpolation alpha
   */
  getAlpha(): number {
    return this.accumulator / this.FIXED_TIMESTEP
  }

  /**
   * Check if the loop is running
   */
  getIsRunning(): boolean {
    return this.isRunning
  }
}
