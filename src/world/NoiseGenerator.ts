// Simplex noise implementation for terrain generation
export class NoiseGenerator {
  private perm: number[] = []
  private grad3: number[][] = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ]

  constructor(seed: number = 12345) {
    this.setSeed(seed)
  }

  private setSeed(seed: number): void {
    // Create permutation table based on seed
    const p = new Array(256)
    for (let i = 0; i < 256; i++) {
      p[i] = i
    }

    // Shuffle using seed
    const random = this.seededRandom(seed)
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[p[i], p[j]] = [p[j], p[i]]
    }

    // Duplicate for wrapping
    this.perm = new Array(512)
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255]
    }
  }

  private seededRandom(seed: number): () => number {
    let x = Math.sin(seed) * 10000
    return () => {
      x = Math.sin(x) * 10000
      return x - Math.floor(x)
    }
  }

  private dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y
  }

  // 2D Simplex noise
  noise2D(xin: number, yin: number): number {
    let n0, n1, n2 // Noise contributions from the three corners
    
    // Skew the input space to determine which simplex cell we're in
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0)
    const s = (xin + yin) * F2 // Hairy factor for 2D
    const i = Math.floor(xin + s)
    const j = Math.floor(yin + s)
    
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0
    const t = (i + j) * G2
    const X0 = i - t // Unskew the cell origin back to (x,y) space
    const Y0 = j - t
    const x0 = xin - X0 // The x,y distances from the cell origin
    const y0 = yin - Y0
    
    // For the 2D case, the simplex shape is an equilateral triangle.
    // Determine which simplex we are in.
    let i1, j1 // Offsets for second (middle) corner of simplex in (i,j) coords
    if (x0 > y0) {
      i1 = 1; j1 = 0 // lower triangle, XY order: (0,0)->(1,0)->(1,1)
    } else {
      i1 = 0; j1 = 1 // upper triangle, YX order: (0,0)->(0,1)->(1,1)
    }
    
    // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
    // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
    // c = (3-sqrt(3))/6
    const x1 = x0 - i1 + G2 // Offsets for middle corner in (x,y) unskewed coords
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1.0 + 2.0 * G2 // Offsets for last corner in (x,y) unskewed coords
    const y2 = y0 - 1.0 + 2.0 * G2
    
    // Work out the hashed gradient indices of the three simplex corners
    const ii = i & 255
    const jj = j & 255
    const gi0 = this.perm[ii + this.perm[jj]] % 12
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12
    
    // Calculate the contribution from the three corners
    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 < 0) {
      n0 = 0.0
    } else {
      t0 *= t0
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0)
    }
    
    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 < 0) {
      n1 = 0.0
    } else {
      t1 *= t1
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1)
    }
    
    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 < 0) {
      n2 = 0.0
    } else {
      t2 *= t2
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2)
    }
    
    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1,1].
    return 70.0 * (n0 + n1 + n2)
  }

  // Fractal Brownian Motion - combines multiple octaves of noise
  fbm(x: number, y: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0): number {
    let value = 0
    let amplitude = 1
    let frequency = 1
    let maxValue = 0

    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude
      maxValue += amplitude
      amplitude *= persistence
      frequency *= lacunarity
    }

    return value / maxValue
  }

  // Ridged noise - creates mountain-like ridges
  ridgedNoise(x: number, y: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0): number {
    let value = 0
    let amplitude = 1
    let frequency = 1
    let maxValue = 0

    for (let i = 0; i < octaves; i++) {
      const n = Math.abs(this.noise2D(x * frequency, y * frequency))
      value += (1 - n) * amplitude
      maxValue += amplitude
      amplitude *= persistence
      frequency *= lacunarity
    }

    return value / maxValue
  }

  // Terrain height generation
  getTerrainHeight(x: number, z: number, scale: number = 0.01): number {
    // Combine different noise patterns for realistic terrain
    const baseHeight = this.fbm(x * scale, z * scale, 4, 0.5, 2.0) * 30
    const hills = this.fbm(x * scale * 0.5, z * scale * 0.5, 3, 0.6, 2.0) * 15
    const mountains = this.ridgedNoise(x * scale * 0.1, z * scale * 0.1, 4, 0.8, 2.0) * 40
    
    return Math.floor(baseHeight + hills + mountains + 64) // 64 = sea level
  }

  // Biome determination
  getBiome(x: number, z: number, scale: number = 0.005): string {
    const temperature = this.fbm(x * scale, z * scale, 3, 0.5, 2.0)
    const humidity = this.fbm(x * scale + 1000, z * scale + 1000, 3, 0.5, 2.0)

    // Map temperature and humidity to biomes
    if (temperature < -0.5) {
      return 'tundra'
    } else if (temperature > 0.5) {
      if (humidity < -0.2) {
        return 'desert'
      } else {
        return 'plains'
      }
    } else {
      if (humidity > 0.3) {
        return 'forest'
      } else if (temperature < -0.2) {
        return 'mountains'
      } else {
        return 'plains'
      }
    }
  }

  // Cave generation
  isCave(x: number, y: number, z: number, scale: number = 0.02): boolean {
    const noise1 = this.fbm3D(x * scale, y * scale * 0.5, z * scale, 3, 0.5, 2.0)
    const noise2 = this.fbm3D(x * scale + 100, y * scale * 0.5 + 100, z * scale + 100, 3, 0.5, 2.0)
    
    // Create cave tunnels
    return Math.abs(noise1) < 0.1 && Math.abs(noise2) < 0.1 && y > 5 && y < 50
  }

  // 3D noise for caves
  noise3D(x: number, y: number, z: number): number {
    // Simplified 3D noise - sample 2D noise at different y levels
    const noise1 = this.noise2D(x, z)
    const noise2 = this.noise2D(x + y * 0.1, z + y * 0.1)
    return (noise1 + noise2) * 0.5
  }

  fbm3D(x: number, y: number, z: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0): number {
    let value = 0
    let amplitude = 1
    let frequency = 1
    let maxValue = 0

    for (let i = 0; i < octaves; i++) {
      value += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude
      maxValue += amplitude
      amplitude *= persistence
      frequency *= lacunarity
    }

    return value / maxValue
  }
}