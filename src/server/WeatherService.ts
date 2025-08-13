import type { Weather } from '../types/server'

interface WeatherUpdateResult {
  changed: boolean
  weather: Weather
}

export class WeatherService {
  private weather: Weather = {
    type: 'clear',
    intensity: 0.0,
    duration: 300000, // 5 minutes
    nextWeatherChange: Date.now() + 300000,
  }

  constructor() {
    this.initializeWeather()
  }

  private initializeWeather(): void {
    // Set initial weather
    this.weather = {
      type: 'clear',
      intensity: 0.0,
      duration: 300000, // 5 minutes
      nextWeatherChange: Date.now() + 300000,
    }
  }

  public updateWeather(): WeatherUpdateResult {
    if (Date.now() > this.weather.nextWeatherChange) {
      this.changeWeather()
      return {
        changed: true,
        weather: this.weather,
      }
    }

    return {
      changed: false,
      weather: this.weather,
    }
  }

  private changeWeather(): void {
    const weatherTypes: Array<Weather['type']> = ['clear', 'rain', 'snow', 'storm']
    this.weather.type = weatherTypes[Math.floor(Math.random() * weatherTypes.length)]
    this.weather.intensity = Math.random()
    this.weather.duration = 60000 + Math.random() * 300000 // 1-6 minutes
    this.weather.nextWeatherChange = Date.now() + this.weather.duration

    console.log(`🌤️ Weather changed to: ${this.weather.type}`)
  }

  public updateWeatherEffects(): void {
    // TODO: Implement weather effects on world
    // This could include:
    // - Rain affecting crop growth
    // - Snow accumulation
    // - Storm damage to structures
    // - Lightning strikes
    // - Visibility effects
  }

  public getCurrentWeather(): Weather {
    return { ...this.weather }
  }

  public setWeather(type: Weather['type'], intensity: number, duration: number): void {
    this.weather.type = type
    this.weather.intensity = Math.max(0, Math.min(1, intensity)) // Clamp between 0 and 1
    this.weather.duration = duration
    this.weather.nextWeatherChange = Date.now() + duration

    console.log(`🌤️ Weather manually set to: ${type} with intensity ${intensity}`)
  }

  public isRaining(): boolean {
    return this.weather.type === 'rain' || this.weather.type === 'storm'
  }

  public isSnowing(): boolean {
    return this.weather.type === 'snow'
  }

  public isStorming(): boolean {
    return this.weather.type === 'storm'
  }

  public getIntensity(): number {
    return this.weather.intensity
  }

  public getTimeUntilNextChange(): number {
    return Math.max(0, this.weather.nextWeatherChange - Date.now())
  }
}
