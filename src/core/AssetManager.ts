import * as THREE from 'three'

/**
 * Professional asset management system for game development
 * Handles loading, caching, and lifetime management of game assets
 */
export enum AssetType {
  TEXTURE = 'texture',
  MODEL = 'model',
  AUDIO = 'audio',
  SHADER = 'shader',
  JSON = 'json',
}

export interface AssetDescriptor {
  id: string
  type: AssetType
  url: string
  preload?: boolean
  persistent?: boolean // Keep in memory even when not actively used
}

export interface LoadProgress {
  loaded: number
  total: number
  percentage: number
  currentAsset?: string
}

export class AssetManager {
  private assets = new Map<string, AssetEntry>()
  private loaders = new Map<AssetType, AssetLoader>()
  private loadQueue: AssetDescriptor[] = []
  private isLoading = false
  private loadProgress: LoadProgress = { loaded: 0, total: 0, percentage: 0 }

  // Callbacks
  private onProgressCallback?: (progress: LoadProgress) => void
  private onCompleteCallback?: () => void
  private onErrorCallback?: (error: Error, assetId: string) => void

  constructor() {
    this.setupDefaultLoaders()
  }

  /**
   * Register an asset for management
   */
  registerAsset(descriptor: AssetDescriptor): void {
    if (this.assets.has(descriptor.id)) {
      console.warn(`AssetManager: Asset '${descriptor.id}' already registered`)
      return
    }

    const entry: AssetEntry = {
      descriptor,
      asset: null,
      isLoaded: false,
      isLoading: false,
      loadPromise: null,
      lastUsed: Date.now(),
      referenceCount: 0,
    }

    this.assets.set(descriptor.id, entry)

    if (descriptor.preload) {
      this.loadQueue.push(descriptor)
    }
  }

  /**
   * Load multiple assets
   */
  registerAssets(descriptors: AssetDescriptor[]): void {
    descriptors.forEach(desc => this.registerAsset(desc))
  }

  /**
   * Load a specific asset
   */
  async loadAsset<T>(assetId: string): Promise<T> {
    const entry = this.assets.get(assetId)
    if (!entry) {
      throw new Error(`AssetManager: Asset '${assetId}' not registered`)
    }

    if (entry.isLoaded && entry.asset) {
      entry.lastUsed = Date.now()
      entry.referenceCount++
      return entry.asset as T
    }

    if (entry.isLoading && entry.loadPromise) {
      return entry.loadPromise as Promise<T>
    }

    entry.isLoading = true
    entry.loadPromise = this.performLoad(entry)

    try {
      const asset = await entry.loadPromise
      entry.asset = asset
      entry.isLoaded = true
      entry.isLoading = false
      entry.lastUsed = Date.now()
      entry.referenceCount++
      return asset as T
    } catch (error) {
      entry.isLoading = false
      entry.loadPromise = null
      throw error
    }
  }

  /**
   * Get an asset (load if necessary)
   */
  async getAsset<T>(assetId: string): Promise<T> {
    return this.loadAsset<T>(assetId)
  }

  /**
   * Get an asset synchronously (must be loaded first)
   */
  getAssetSync<T>(assetId: string): T | null {
    const entry = this.assets.get(assetId)
    if (entry && entry.isLoaded && entry.asset) {
      entry.lastUsed = Date.now()
      entry.referenceCount++
      return entry.asset as T
    }
    return null
  }

  /**
   * Load all queued assets
   */
  async loadQueuedAssets(): Promise<void> {
    if (this.isLoading || this.loadQueue.length === 0) {
      return
    }

    this.isLoading = true
    const totalAssets = this.loadQueue.length
    let loadedAssets = 0

    this.loadProgress = {
      loaded: 0,
      total: totalAssets,
      percentage: 0,
    }

    const loadPromises = this.loadQueue.map(async descriptor => {
      try {
        this.loadProgress.currentAsset = descriptor.id
        if (this.onProgressCallback) {
          this.onProgressCallback(this.loadProgress)
        }

        await this.loadAsset(descriptor.id)

        loadedAssets++
        this.loadProgress.loaded = loadedAssets
        this.loadProgress.percentage = (loadedAssets / totalAssets) * 100

        if (this.onProgressCallback) {
          this.onProgressCallback(this.loadProgress)
        }
      } catch (error) {
        if (this.onErrorCallback) {
          this.onErrorCallback(error as Error, descriptor.id)
        }
        throw error
      }
    })

    try {
      await Promise.all(loadPromises)
      this.loadQueue.length = 0
      this.isLoading = false

      if (this.onCompleteCallback) {
        this.onCompleteCallback()
      }
    } catch (error) {
      this.isLoading = false
      throw error
    }
  }

  /**
   * Release an asset reference
   */
  releaseAsset(assetId: string): void {
    const entry = this.assets.get(assetId)
    if (entry) {
      entry.referenceCount = Math.max(0, entry.referenceCount - 1)
    }
  }

  /**
   * Unload unused assets to free memory
   */
  cleanupUnusedAssets(): void {
    const now = Date.now()
    const UNUSED_THRESHOLD = 5 * 60 * 1000 // 5 minutes

    for (const [assetId, entry] of this.assets) {
      if (
        entry.isLoaded &&
        entry.referenceCount === 0 &&
        !entry.descriptor.persistent &&
        now - entry.lastUsed > UNUSED_THRESHOLD
      ) {
        this.unloadAsset(assetId)
      }
    }
  }

  /**
   * Unload a specific asset
   */
  unloadAsset(assetId: string): void {
    const entry = this.assets.get(assetId)
    if (entry && entry.asset) {
      // Dispose Three.js objects
      if (entry.asset instanceof THREE.Texture) {
        entry.asset.dispose()
      } else if (entry.asset instanceof THREE.Material) {
        entry.asset.dispose()
      } else if (entry.asset instanceof THREE.BufferGeometry) {
        entry.asset.dispose()
      }

      entry.asset = null
      entry.isLoaded = false
      entry.referenceCount = 0
    }
  }

  /**
   * Get asset loading statistics
   */
  getStats(): AssetStats {
    let totalAssets = 0
    let loadedAssets = 0
    let memoryUsage = 0

    for (const entry of this.assets.values()) {
      totalAssets++
      if (entry.isLoaded) {
        loadedAssets++
        // Estimate memory usage (basic calculation)
        if (entry.asset instanceof THREE.Texture && entry.asset.image) {
          const image = entry.asset.image
          memoryUsage += (image.width || 0) * (image.height || 0) * 4 // RGBA
        }
      }
    }

    return {
      totalAssets,
      loadedAssets,
      memoryUsage: memoryUsage / (1024 * 1024), // Convert to MB
      isLoading: this.isLoading,
      loadProgress: this.loadProgress,
    }
  }

  /**
   * Set loading callbacks
   */
  setCallbacks(callbacks: {
    onProgress?: (progress: LoadProgress) => void
    onComplete?: () => void
    onError?: (error: Error, assetId: string) => void
  }): void {
    this.onProgressCallback = callbacks.onProgress
    this.onCompleteCallback = callbacks.onComplete
    this.onErrorCallback = callbacks.onError
  }

  private async performLoad(entry: AssetEntry): Promise<unknown> {
    const loader = this.loaders.get(entry.descriptor.type)
    if (!loader) {
      throw new Error(`AssetManager: No loader for type '${entry.descriptor.type}'`)
    }

    return loader.load(entry.descriptor.url)
  }

  private setupDefaultLoaders(): void {
    // Texture loader
    this.loaders.set(AssetType.TEXTURE, {
      load: (url: string) => {
        return new Promise((resolve, reject) => {
          const loader = new THREE.TextureLoader()
          loader.load(
            url,
            texture => resolve(texture),
            undefined,
            error => reject(error)
          )
        })
      },
    })

    // JSON loader
    this.loaders.set(AssetType.JSON, {
      load: async (url: string) => {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to load JSON: ${response.statusText}`)
        }
        return response.json()
      },
    })

    // Add more loaders as needed (models, audio, etc.)
  }
}

interface AssetEntry {
  descriptor: AssetDescriptor
  asset: unknown | null
  isLoaded: boolean
  isLoading: boolean
  loadPromise: Promise<unknown> | null
  lastUsed: number
  referenceCount: number
}

interface AssetLoader {
  load(url: string): Promise<unknown>
}

export interface AssetStats {
  totalAssets: number
  loadedAssets: number
  memoryUsage: number // MB
  isLoading: boolean
  loadProgress: LoadProgress
}

// Global asset manager instance
export const assetManager = new AssetManager()