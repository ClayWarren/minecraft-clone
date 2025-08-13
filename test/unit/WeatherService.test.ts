import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WeatherService } from '../../src/server/WeatherService'
import type { Weather } from '../../src/types/server'

describe('WeatherService', () => {
  let weatherService: WeatherService

  beforeEach(() => {
    weatherService = new WeatherService()
  })

  describe('initialization', () => {
    it('should initialize with clear weather', () => {
      const weather = weatherService.getCurrentWeather()
      
      expect(weather.type).toBe('clear')
      expect(weather.intensity).toBe(0.0)
      expect(weather.duration).toBe(300000) // 5 minutes
      expect(weather.nextWeatherChange).toBeGreaterThan(Date.now())
    })

    it('should have different weather instances', () => {
      const weatherService2 = new WeatherService()
      
      const weather1 = weatherService.getCurrentWeather()
      const weather2 = weatherService2.getCurrentWeather()
      
      // Should be different instances
      expect(weather1).not.toBe(weather2)
    })
  })

  describe('updateWeather', () => {
    it('should not change weather before next change time', () => {
      const initialWeather = weatherService.getCurrentWeather()
      
      const result = weatherService.updateWeather()
      
      expect(result.changed).toBe(false)
      expect(result.weather).toEqual(initialWeather)
    })

    it('should change weather after next change time', () => {
      // Mock the internal weather object directly
      const weather = weatherService.getCurrentWeather()
      ;(weatherService as any).weather.nextWeatherChange = Date.now() - 1000 // 1 second ago
      
      const result = weatherService.updateWeather()
      
      expect(result.changed).toBe(true)
      expect(result.weather).not.toEqual(weather)
    })

    it('should generate valid weather types', () => {
      // Set next weather change to the past
      const weather = weatherService.getCurrentWeather()
      weather.nextWeatherChange = Date.now() - 1000
      
      const result = weatherService.updateWeather()
      
      const validTypes = ['clear', 'rain', 'snow', 'storm']
      expect(validTypes).toContain(result.weather.type)
    })

    it('should set intensity between 0 and 1', () => {
      // Set next weather change to the past
      const weather = weatherService.getCurrentWeather()
      weather.nextWeatherChange = Date.now() - 1000
      
      const result = weatherService.updateWeather()
      
      expect(result.weather.intensity).toBeGreaterThanOrEqual(0)
      expect(result.weather.intensity).toBeLessThanOrEqual(1)
    })

    it('should set reasonable duration', () => {
      // Set next weather change to the past
      const weather = weatherService.getCurrentWeather()
      weather.nextWeatherChange = Date.now() - 1000
      
      const result = weatherService.updateWeather()
      
      // Duration should be between 1-6 minutes (60000-360000 ms)
      expect(result.weather.duration).toBeGreaterThanOrEqual(60000)
      expect(result.weather.duration).toBeLessThanOrEqual(360000)
    })

    it('should update next weather change time', () => {
      const initialWeather = weatherService.getCurrentWeather()
      initialWeather.nextWeatherChange = Date.now() - 1000
      
      const result = weatherService.updateWeather()
      
      expect(result.weather.nextWeatherChange).toBeGreaterThan(Date.now())
    })
  })

  describe('weather state queries', () => {
    it('should correctly identify rain weather', () => {
      weatherService.setWeather('rain', 0.5, 300000)
      
      expect(weatherService.isRaining()).toBe(true)
      expect(weatherService.isSnowing()).toBe(false)
      expect(weatherService.isStorming()).toBe(false)
    })

    it('should correctly identify snow weather', () => {
      weatherService.setWeather('snow', 0.7, 300000)
      
      expect(weatherService.isRaining()).toBe(false)
      expect(weatherService.isSnowing()).toBe(true)
      expect(weatherService.isStorming()).toBe(false)
    })

    it('should correctly identify storm weather', () => {
      weatherService.setWeather('storm', 0.9, 300000)
      
      expect(weatherService.isRaining()).toBe(true) // Storm is also rain
      expect(weatherService.isSnowing()).toBe(false)
      expect(weatherService.isStorming()).toBe(true)
    })

    it('should correctly identify clear weather', () => {
      weatherService.setWeather('clear', 0.0, 300000)
      
      expect(weatherService.isRaining()).toBe(false)
      expect(weatherService.isSnowing()).toBe(false)
      expect(weatherService.isStorming()).toBe(false)
    })
  })

  describe('setWeather', () => {
    it('should set weather type correctly', () => {
      weatherService.setWeather('rain', 0.5, 300000)
      
      const weather = weatherService.getCurrentWeather()
      expect(weather.type).toBe('rain')
    })

    it('should clamp intensity to 0-1 range', () => {
      weatherService.setWeather('rain', 1.5, 300000) // Above 1
      
      const weather = weatherService.getCurrentWeather()
      expect(weather.intensity).toBe(1)
      
      weatherService.setWeather('rain', -0.5, 300000) // Below 0
      
      const weather2 = weatherService.getCurrentWeather()
      expect(weather2.intensity).toBe(0)
    })

    it('should set duration correctly', () => {
      weatherService.setWeather('rain', 0.5, 600000) // 10 minutes
      
      const weather = weatherService.getCurrentWeather()
      expect(weather.duration).toBe(600000)
    })

    it('should update next weather change time', () => {
      const startTime = Date.now()
      weatherService.setWeather('rain', 0.5, 300000)
      
      const weather = weatherService.getCurrentWeather()
      expect(weather.nextWeatherChange).toBeGreaterThan(startTime)
      expect(weather.nextWeatherChange).toBeLessThanOrEqual(startTime + 300000)
    })
  })

  describe('getIntensity', () => {
    it('should return current weather intensity', () => {
      weatherService.setWeather('rain', 0.7, 300000)
      
      expect(weatherService.getIntensity()).toBe(0.7)
    })
  })

  describe('getTimeUntilNextChange', () => {
    it('should return positive time when next change is in the future', () => {
      ;(weatherService as any).weather.nextWeatherChange = Date.now() + 60000 // 1 minute from now
      
      const timeUntil = weatherService.getTimeUntilNextChange()
      
      expect(timeUntil).toBeGreaterThan(0)
      expect(timeUntil).toBeLessThanOrEqual(60000)
    })

    it('should return 0 when next change is in the past', () => {
      ;(weatherService as any).weather.nextWeatherChange = Date.now() - 1000 // 1 second ago
      
      const timeUntil = weatherService.getTimeUntilNextChange()
      
      expect(timeUntil).toBe(0)
    })
  })

  describe('getCurrentWeather', () => {
    it('should return a copy of current weather', () => {
      const weather1 = weatherService.getCurrentWeather()
      const weather2 = weatherService.getCurrentWeather()
      
      // Should be different objects (copies)
      expect(weather1).not.toBe(weather2)
      // But should have same values
      expect(weather1).toEqual(weather2)
    })

    it('should not be affected by external modifications', () => {
      const weather = weatherService.getCurrentWeather()
      weather.type = 'rain' // Try to modify the returned object
      
      const currentWeather = weatherService.getCurrentWeather()
      expect(currentWeather.type).toBe('clear') // Should still be clear
    })
  })

  describe('updateWeatherEffects', () => {
    it('should not throw errors when called', () => {
      expect(() => {
        weatherService.updateWeatherEffects()
      }).not.toThrow()
    })

    it('should be callable multiple times', () => {
      expect(() => {
        weatherService.updateWeatherEffects()
        weatherService.updateWeatherEffects()
        weatherService.updateWeatherEffects()
      }).not.toThrow()
    })
  })

  describe('weather persistence', () => {
    it('should maintain weather state between calls', () => {
      weatherService.setWeather('rain', 0.8, 300000)
      
      const weather1 = weatherService.getCurrentWeather()
      const weather2 = weatherService.getCurrentWeather()
      
      expect(weather1.type).toBe('rain')
      expect(weather1.intensity).toBe(0.8)
      expect(weather2.type).toBe('rain')
      expect(weather2.intensity).toBe(0.8)
    })

    it('should update weather state when changed', () => {
      weatherService.setWeather('rain', 0.5, 300000)
      expect(weatherService.getCurrentWeather().type).toBe('rain')
      
      weatherService.setWeather('snow', 0.3, 300000)
      expect(weatherService.getCurrentWeather().type).toBe('snow')
    })
  })

  describe('edge cases', () => {
    it('should handle zero duration', () => {
      const beforeSet = Date.now()
      weatherService.setWeather('rain', 0.5, 0)
      
      const weather = weatherService.getCurrentWeather()
      expect(weather.duration).toBe(0)
      expect(weather.nextWeatherChange).toBeGreaterThanOrEqual(beforeSet)
    })

    it('should handle very long duration', () => {
      weatherService.setWeather('rain', 0.5, 86400000) // 24 hours
      
      const weather = weatherService.getCurrentWeather()
      expect(weather.duration).toBe(86400000)
    })

    it('should handle intensity at boundaries', () => {
      weatherService.setWeather('rain', 0, 300000)
      expect(weatherService.getCurrentWeather().intensity).toBe(0)
      
      weatherService.setWeather('rain', 1, 300000)
      expect(weatherService.getCurrentWeather().intensity).toBe(1)
    })
  })
})
