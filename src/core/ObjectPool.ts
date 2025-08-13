/**
 * Generic object pool for game development
 * Reduces garbage collection pressure by reusing objects
 */
export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn?: (obj: T) => void
  private maxSize: number

  constructor(createFn: () => T, resetFn?: (obj: T) => void, initialSize = 10, maxSize = 1000) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn())
    }
  }

  /**
   * Get an object from the pool
   */
  acquire(): T {
    const obj = this.pool.pop()
    if (obj) {
      return obj
    }
    // Pool is empty, create new object
    return this.createFn()
  }

  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    if (this.pool.length >= this.maxSize) {
      // Pool is full, let object be garbage collected
      return
    }

    // Reset object state if reset function provided
    if (this.resetFn) {
      this.resetFn(obj)
    }

    this.pool.push(obj)
  }

  /**
   * Get current pool statistics
   */
  getStats(): { available: number; maxSize: number } {
    return {
      available: this.pool.length,
      maxSize: this.maxSize,
    }
  }

  /**
   * Clear the entire pool
   */
  clear(): void {
    this.pool.length = 0
  }
}

/**
 * Pool manager for different object types
 */
export class PoolManager {
  private pools = new Map<string, ObjectPool<any>>()

  /**
   * Register a new object pool
   */
  registerPool<T>(
    name: string,
    createFn: () => T,
    resetFn?: (obj: T) => void,
    initialSize = 10,
    maxSize = 1000
  ): void {
    this.pools.set(name, new ObjectPool<T>(createFn, resetFn, initialSize, maxSize))
  }

  /**
   * Get an object from a specific pool
   */
  acquire<T>(poolName: string): T {
    const pool = this.pools.get(poolName) as ObjectPool<T>
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`)
    }
    return pool.acquire()
  }

  /**
   * Return an object to a specific pool
   */
  release<T>(poolName: string, obj: T): void {
    const pool = this.pools.get(poolName) as ObjectPool<T>
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`)
    }
    pool.release(obj)
  }

  /**
   * Get statistics for all pools
   */
  getAllStats(): Record<string, { available: number; maxSize: number }> {
    const stats: Record<string, { available: number; maxSize: number }> = {}
    for (const [name, pool] of this.pools) {
      stats[name] = pool.getStats()
    }
    return stats
  }
}

// Global pool manager instance
export const poolManager = new PoolManager()
