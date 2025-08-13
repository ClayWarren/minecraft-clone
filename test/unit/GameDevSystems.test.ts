import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ObjectPool, PoolManager } from '../../src/core/ObjectPool'
import { GameLoop } from '../../src/core/GameLoop'
import { Profiler, MemoryProfiler } from '../../src/core/Profiler'
import { GameStateManager, GameState } from '../../src/core/GameStateManager'

// Define a test object type for the object pool
interface TestObject {
  value: number
  reset: () => void
}
import { InputBuffer, InputActionType } from '../../src/core/InputBuffer'

describe('Game Development Best Practices', () => {
  describe('ObjectPool', () => {
    let pool: ObjectPool<TestObject>

    beforeEach(() => {
      const createTestObject = (): TestObject => ({
        value: 0,
        reset() {
          this.value = 0
        },
      })

      pool = new ObjectPool<TestObject>(
        createTestObject,
        obj => obj.reset(),
        5, // initial size
        10 // max size
      )
    })

    it('should pre-populate pool with initial objects', () => {
      const stats = pool.getStats()
      expect(stats.available).toBe(5)
      expect(stats.maxSize).toBe(10)
    })

    it('should acquire and release objects correctly', () => {
      const obj1 = pool.acquire()
      const obj2 = pool.acquire()

      expect(pool.getStats().available).toBe(3)

      obj1.value = 42
      obj2.value = 100

      pool.release(obj1)
      pool.release(obj2)

      expect(pool.getStats().available).toBe(5)

      // Objects should be reset when released
      const obj3 = pool.acquire()
      expect(obj3.value).toBe(0)
    })

    it('should create new objects when pool is empty', () => {
      // Acquire all objects
      const objects: TestObject[] = []
      for (let i = 0; i < 6; i++) {
        objects.push(pool.acquire())
      }

      expect(pool.getStats().available).toBe(0)

      // Should still be able to acquire a new object
      const newObj = pool.acquire()
      expect(newObj).toBeDefined()
    })

    it('should respect max pool size', () => {
      // Fill pool to max capacity
      const objects: TestObject[] = []
      for (let i = 0; i < 10; i++) {
        objects.push(pool.acquire())
      }

      // Release all objects
      objects.forEach(obj => pool.release(obj))

      // Should not exceed max size
      expect(pool.getStats().available).toBe(10)

      // Releasing one more should not increase pool size
      const extraObj = pool.acquire()
      pool.release(extraObj)
      expect(pool.getStats().available).toBe(10)
    })

    it('should clear pool correctly', () => {
      pool.acquire()
      pool.clear()
      expect(pool.getStats().available).toBe(0)
    })
  })

  describe('PoolManager', () => {
    let poolManager: PoolManager

    beforeEach(() => {
      poolManager = new PoolManager()
    })

    it('should register and manage multiple pools', () => {
      poolManager.registerPool(
        'vector',
        () => ({ x: 0, y: 0, z: 0 }),
        obj => {
          obj.x = obj.y = obj.z = 0
        }
      )
      poolManager.registerPool('string', () => '', undefined, 2, 5)

      const vector = poolManager.acquire<{ x: number; y: number; z: number }>('vector')
      const str = poolManager.acquire<string>('string')

      expect(vector).toEqual({ x: 0, y: 0, z: 0 })
      expect(typeof str).toBe('string')

      poolManager.release('vector', vector)
      poolManager.release('string', str)

      const stats = poolManager.getAllStats()
      expect(stats.vector).toBeDefined()
      expect(stats.string).toBeDefined()
    })

    it('should throw error for unknown pool', () => {
      expect(() => poolManager.acquire('unknown')).toThrow("Pool 'unknown' not found")
      expect(() => poolManager.release('unknown', {})).toThrow("Pool 'unknown' not found")
    })
  })

  describe('GameLoop', () => {
    let gameLoop: GameLoop
    let fixedUpdateSpy: any
    let updateSpy: any
    let renderSpy: any

    beforeEach(() => {
      gameLoop = new GameLoop()
      fixedUpdateSpy = vi.fn()
      updateSpy = vi.fn()
      renderSpy = vi.fn()

      gameLoop.setFixedUpdateCallback(fixedUpdateSpy)
      gameLoop.setUpdateCallback(updateSpy)
      gameLoop.setRenderCallback(renderSpy)

      // Mock requestAnimationFrame
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        setTimeout(callback, 16) // ~60 FPS
        return 1
      })

      // Mock performance.now
      let time = 0
      vi.spyOn(performance, 'now').mockImplementation(() => (time += 16))
    })

    afterEach(() => {
      gameLoop.stop()
      vi.restoreAllMocks()
    })

    it('should start and stop correctly', () => {
      expect(gameLoop.getIsRunning()).toBe(false)

      gameLoop.start()
      expect(gameLoop.getIsRunning()).toBe(true)

      gameLoop.stop()
      expect(gameLoop.getIsRunning()).toBe(false)
    })

    it('should call callbacks when started', () => {
      // Create fresh spies for this test
      const testFixedUpdateSpy = vi.fn()
      const testUpdateSpy = vi.fn()
      const testRenderSpy = vi.fn()

      gameLoop.setFixedUpdateCallback(testFixedUpdateSpy)
      gameLoop.setUpdateCallback(testUpdateSpy)
      gameLoop.setRenderCallback(testRenderSpy)

      gameLoop.start()
      expect(gameLoop.getIsRunning()).toBe(true)

      // Directly call tick method to test callbacks
      const gameLoopAny = gameLoop as any

      // Simulate time passing to trigger fixed timestep
      // Start with lastTime = 0, then move to 20ms (> 16.67ms fixed timestep)
      gameLoopAny.lastTime = 0
      gameLoopAny.tick(20)

      // Should have called the callbacks
      expect(testFixedUpdateSpy).toHaveBeenCalled()
      expect(testUpdateSpy).toHaveBeenCalled()
      expect(testRenderSpy).toHaveBeenCalled()
    })

    it('should provide performance stats', () => {
      const stats = gameLoop.getPerformanceStats()
      expect(stats).toHaveProperty('fps')
      expect(stats).toHaveProperty('frameTime')
      expect(stats).toHaveProperty('averageFrameTime')
      expect(stats).toHaveProperty('accumulator')
    })
  })

  describe('Profiler', () => {
    let profiler: Profiler

    beforeEach(() => {
      profiler = new Profiler()
    })

    it('should measure execution time correctly', () => {
      profiler.begin('test')
      // Simulate some work
      const start = performance.now()
      // Simulate work for ~10ms
      while (performance.now() - start < 10) {
        /* busy wait */
      }
      profiler.end('test')

      const data = profiler.getData('test')
      expect(data).toBeDefined()
      expect(data!.latest).toBeGreaterThan(5) // Should be at least 5ms
      expect(data!.sampleCount).toBe(1)
    })

    it('should time function execution', () => {
      const result = profiler.time('math', () => {
        return 2 + 2
      })

      expect(result).toBe(4)

      const data = profiler.getData('math')
      expect(data).toBeDefined()
      expect(data!.sampleCount).toBe(1)
    })

    it('should time async function execution', async () => {
      const result = await profiler.timeAsync('async', async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'done'
      })

      expect(result).toBe('done')

      const data = profiler.getData('async')
      expect(data).toBeDefined()
      expect(data!.latest).toBeGreaterThan(5)
    })

    it('should calculate statistics correctly', () => {
      // Add multiple samples
      for (let i = 0; i < 5; i++) {
        profiler.begin('stats')
        const start = performance.now()
        // Simulate work with variable timing
        while (performance.now() - start < 5 + i) {
          /* busy wait */
        }
        profiler.end('stats')
      }

      const data = profiler.getData('stats')
      expect(data).toBeDefined()
      expect(data!.sampleCount).toBe(5)
      expect(data!.min).toBeLessThan(data!.max)
      expect(data!.average).toBeGreaterThan(data!.min)
      expect(data!.average).toBeLessThan(data!.max)
    })

    it('should generate performance report', () => {
      profiler.time('test1', () => {})
      profiler.time('test2', () => {})

      const report = profiler.generateReport()
      expect(report).toContain('PERFORMANCE REPORT')
      expect(report).toContain('test1')
      expect(report).toContain('test2')
    })

    it('should enable/disable profiling', () => {
      profiler.setEnabled(false)
      profiler.begin('disabled')
      profiler.end('disabled')

      expect(profiler.getData('disabled')).toBeNull()

      profiler.setEnabled(true)
      profiler.begin('enabled')
      profiler.end('enabled')

      expect(profiler.getData('enabled')).toBeDefined()
    })
  })

  describe('MemoryProfiler', () => {
    let memoryProfiler: MemoryProfiler

    beforeEach(() => {
      memoryProfiler = new MemoryProfiler()
    })

    it('should measure memory usage', () => {
      const measurement = memoryProfiler.measure()

      expect(measurement).toHaveProperty('timestamp')
      expect(measurement).toHaveProperty('heapUsed')
      expect(measurement).toHaveProperty('heapTotal')
      expect(measurement.timestamp).toBeGreaterThan(0)
    })

    it('should calculate memory statistics', () => {
      // Take multiple measurements
      for (let i = 0; i < 3; i++) {
        memoryProfiler.measure()
      }

      const stats = memoryProfiler.getStats()
      expect(stats.measurementCount).toBe(3)
      expect(stats.current).toBeDefined()
      expect(stats.average).toBeGreaterThanOrEqual(0)
      expect(stats.peak).toBeGreaterThanOrEqual(stats.average)
    })
  })

  describe('GameStateManager', () => {
    let stateManager: GameStateManager
    let enterSpy: any
    let exitSpy: any

    beforeEach(() => {
      stateManager = new GameStateManager()
      enterSpy = vi.fn()
      exitSpy = vi.fn()

      stateManager.registerState(GameState.MENU, {
        onEnter: enterSpy,
        onExit: exitSpy,
      })

      stateManager.registerState(GameState.PLAYING, {
        onEnter: enterSpy,
        onExit: exitSpy,
      })

      stateManager.registerTransition({
        from: GameState.INITIALIZING,
        to: GameState.MENU,
      })

      stateManager.registerTransition({
        from: GameState.MENU,
        to: GameState.PLAYING,
      })
    })

    it('should start in initializing state', () => {
      expect(stateManager.getCurrentState()).toBe(GameState.INITIALIZING)
    })

    it('should change states correctly', () => {
      stateManager.changeState(GameState.MENU)
      expect(stateManager.getCurrentState()).toBe(GameState.MENU)
      expect(stateManager.getPreviousState()).toBe(GameState.INITIALIZING)
      expect(enterSpy).toHaveBeenCalledWith(GameState.INITIALIZING, undefined)
    })

    it('should call exit handlers when leaving state', () => {
      stateManager.changeState(GameState.MENU)
      exitSpy.mockClear()

      stateManager.changeState(GameState.PLAYING)
      expect(exitSpy).toHaveBeenCalledWith(GameState.PLAYING)
    })

    it('should track state timing', () => {
      stateManager.changeState(GameState.MENU)
      expect(stateManager.getStateElapsedTime()).toBeGreaterThanOrEqual(0)
    })

    it('should pass state data correctly', () => {
      const data = { level: 1, score: 100 }
      stateManager.changeState(GameState.PLAYING, data)

      expect(stateManager.getStateData()).toEqual(data)
      expect(enterSpy).toHaveBeenCalledWith(GameState.INITIALIZING, data)
    })

    it('should check transition conditions', () => {
      stateManager.registerTransition({
        from: GameState.MENU,
        to: GameState.PLAYING,
        condition: () => false, // Block transition
      })

      stateManager.changeState(GameState.MENU)
      stateManager.changeState(GameState.PLAYING) // Should be blocked

      expect(stateManager.getCurrentState()).toBe(GameState.MENU)
    })
  })

  describe('InputBuffer', () => {
    let inputBuffer: InputBuffer

    beforeEach(() => {
      inputBuffer = new InputBuffer()
    })

    afterEach(() => {
      inputBuffer.clear()
    })

    it('should buffer input actions', () => {
      inputBuffer.addInput(InputActionType.JUMP)
      inputBuffer.addInput(InputActionType.MOVE_FORWARD)

      const stats = inputBuffer.getStats()
      expect(stats.bufferSize).toBe(2)
      expect(stats.unconsumedInputs).toBe(2)
    })

    it('should consume inputs correctly', () => {
      inputBuffer.addInput(InputActionType.JUMP)
      inputBuffer.addInput(InputActionType.MOVE_FORWARD)

      const jumpInput = inputBuffer.consumeInput(InputActionType.JUMP)
      expect(jumpInput).toBeDefined()
      expect(jumpInput!.type).toBe(InputActionType.JUMP)
      expect(jumpInput!.consumed).toBe(true)

      // Should not be able to consume the same input again
      const jumpInput2 = inputBuffer.consumeInput(InputActionType.JUMP)
      expect(jumpInput2).toBeNull()
    })

    it('should peek at inputs without consuming', () => {
      inputBuffer.addInput(InputActionType.JUMP)

      const peekedInput = inputBuffer.peekInput(InputActionType.JUMP)
      expect(peekedInput).toBeDefined()
      expect(peekedInput!.consumed).toBe(false)

      // Should still be able to consume after peeking
      const consumedInput = inputBuffer.consumeInput(InputActionType.JUMP)
      expect(consumedInput).toBeDefined()
    })

    it('should check if input was triggered recently', () => {
      inputBuffer.addInput(InputActionType.JUMP)
      expect(inputBuffer.wasTriggered(InputActionType.JUMP, 100)).toBe(true)
      expect(inputBuffer.wasTriggered(InputActionType.MOVE_FORWARD, 100)).toBe(false)
    })

    it('should clean expired inputs', () => {
      // Mock performance.now to simulate time passing
      const originalNow = performance.now
      let time = 0
      vi.spyOn(performance, 'now').mockImplementation(() => time)

      inputBuffer.addInput(InputActionType.JUMP)
      time += 200 // Exceed buffer time

      inputBuffer.cleanExpiredInputs()
      expect(inputBuffer.getStats().bufferSize).toBe(0)

      vi.mocked(performance.now).mockRestore()
    })

    it('should handle keyboard input mapping', () => {
      // Mock KeyboardEvent in test environment
      const keyboardEvent = {
        code: 'Space',
        repeat: false,
      } as KeyboardEvent

      inputBuffer.handleKeyboardInput(keyboardEvent)

      const jumpInput = inputBuffer.peekInput(InputActionType.JUMP)
      expect(jumpInput).toBeDefined()
      expect(jumpInput!.data?.key).toBe('Space')
    })

    it('should handle mouse input mapping', () => {
      // Mock MouseEvent in test environment
      const mouseEvent = {
        type: 'mousedown',
        button: 0, // Left click
        clientX: 100,
        clientY: 200,
      } as MouseEvent

      inputBuffer.handleMouseInput(mouseEvent)

      const primaryInput = inputBuffer.peekInput(InputActionType.PRIMARY_ACTION)
      expect(primaryInput).toBeDefined()
      expect(primaryInput!.data?.button).toBe(0)
      expect(primaryInput!.data?.mouseX).toBe(100)
      expect(primaryInput!.data?.mouseY).toBe(200)
    })
  })
})
