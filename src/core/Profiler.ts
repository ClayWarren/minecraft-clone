/**
 * Game performance profiler for monitoring system performance
 * Critical for game development optimization
 */
export class Profiler {
  private measurements = new Map<string, ProfileData>()
  private isEnabled = true
  private maxSamples = 60 // Keep last 60 samples for averaging

  /**
   * Start timing a labeled section
   */
  begin(label: string): void {
    if (!this.isEnabled) return

    const data = this.getOrCreateData(label)
    data.startTime = performance.now()
  }

  /**
   * End timing a labeled section
   */
  end(label: string): void {
    if (!this.isEnabled) return

    const endTime = performance.now()
    const data = this.measurements.get(label)

    if (!data || data.startTime === 0) {
      console.warn(`Profiler: No matching begin() for label "${label}"`)
      return
    }

    const duration = endTime - data.startTime
    data.addSample(duration)
    data.startTime = 0
  }

  /**
   * Time a function execution
   */
  time<T>(label: string, fn: () => T): T {
    this.begin(label)
    try {
      return fn()
    } finally {
      this.end(label)
    }
  }

  /**
   * Time an async function execution
   */
  async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.begin(label)
    try {
      return await fn()
    } finally {
      this.end(label)
    }
  }

  /**
   * Get performance data for a specific label
   */
  getData(label: string): ProfileStats | null {
    const data = this.measurements.get(label)
    return data ? data.getStats() : null
  }

  /**
   * Get all performance data
   */
  getAllData(): Record<string, ProfileStats> {
    const result: Record<string, ProfileStats> = {}
    for (const [label, data] of this.measurements) {
      result[label] = data.getStats()
    }
    return result
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear()
  }

  /**
   * Enable/disable profiling
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (!enabled) {
      this.clear()
    }
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    const data = this.getAllData()
    const lines: string[] = []

    lines.push('=== PERFORMANCE REPORT ===')
    lines.push(
      'Label'.padEnd(20) +
        'Avg (ms)'.padEnd(10) +
        'Min (ms)'.padEnd(10) +
        'Max (ms)'.padEnd(10) +
        'Samples'.padEnd(10)
    )
    lines.push('-'.repeat(60))

    for (const [label, stats] of Object.entries(data)) {
      lines.push(
        label.slice(0, 19).padEnd(20) +
          stats.average.toFixed(2).padEnd(10) +
          stats.min.toFixed(2).padEnd(10) +
          stats.max.toFixed(2).padEnd(10) +
          stats.sampleCount.toString().padEnd(10)
      )
    }

    return lines.join('\n')
  }

  private getOrCreateData(label: string): ProfileData {
    let data = this.measurements.get(label)
    if (!data) {
      data = new ProfileData(this.maxSamples)
      this.measurements.set(label, data)
    }
    return data
  }
}

class ProfileData {
  public startTime = 0
  private samples: number[] = []
  private maxSamples: number

  constructor(maxSamples: number) {
    this.maxSamples = maxSamples
  }

  addSample(duration: number): void {
    this.samples.push(duration)
    if (this.samples.length > this.maxSamples) {
      this.samples.shift()
    }
  }

  getStats(): ProfileStats {
    if (this.samples.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        latest: 0,
        sampleCount: 0,
      }
    }

    const min = Math.min(...this.samples)
    const max = Math.max(...this.samples)
    const average = this.samples.reduce((sum, val) => sum + val, 0) / this.samples.length
    const latest = this.samples[this.samples.length - 1]

    return {
      average,
      min,
      max,
      latest,
      sampleCount: this.samples.length,
    }
  }
}

export interface ProfileStats {
  average: number
  min: number
  max: number
  latest: number
  sampleCount: number
}

/**
 * Memory profiler for tracking memory usage
 */
export class MemoryProfiler {
  private measurementHistory: MemoryMeasurement[] = []
  private maxHistory = 60

  /**
   * Take a memory measurement
   */
  measure(): MemoryMeasurement {
    const measurement: MemoryMeasurement = {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
    }

    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number } })
        .memory
      measurement.heapUsed = memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
      measurement.heapTotal = memory.totalJSHeapSize / 1024 / 1024
    }

    this.measurementHistory.push(measurement)
    if (this.measurementHistory.length > this.maxHistory) {
      this.measurementHistory.shift()
    }

    return measurement
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    if (this.measurementHistory.length === 0) {
      return {
        current: { timestamp: 0, heapUsed: 0, heapTotal: 0, external: 0 },
        average: 0,
        peak: 0,
        measurementCount: 0,
      }
    }

    const current = this.measurementHistory[this.measurementHistory.length - 1]
    const heapSizes = this.measurementHistory.map(m => m.heapUsed)
    const average = heapSizes.reduce((sum, val) => sum + val, 0) / heapSizes.length
    const peak = Math.max(...heapSizes)

    return {
      current,
      average,
      peak,
      measurementCount: this.measurementHistory.length,
    }
  }
}

export interface MemoryMeasurement {
  timestamp: number
  heapUsed: number // MB
  heapTotal: number // MB
  external: number // MB
}

export interface MemoryStats {
  current: MemoryMeasurement
  average: number
  peak: number
  measurementCount: number
}

// Global profiler instances
export const profiler = new Profiler()
export const memoryProfiler = new MemoryProfiler()