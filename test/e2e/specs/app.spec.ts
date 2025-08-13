import { test, expect } from '@playwright/test'

test.describe('Minecraft Clone - Basic E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the game before each test
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should load the game with essential elements', async ({ page }) => {
    // Verify the game canvas is present and visible
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    // Verify the game UI elements are present
    await expect(page.locator('body')).toContainText('Minecraft')

    // Verify the game is interactive (check for FPS counter or similar)
    const fpsCounter = page.locator('.fps-counter, [data-testid="fps"]').first()
    if (await fpsCounter.isVisible()) {
      const fps = await fpsCounter.textContent()
      expect(parseInt(fps || '0')).toBeGreaterThan(0)
    }
  })

  test('should handle basic player controls', async ({ page }) => {
    // Focus the game canvas
    const canvas = page.locator('canvas').first()
    await canvas.click()

    // Test keyboard controls (WASD)
    await page.keyboard.down('w')
    await page.waitForTimeout(100)
    await page.keyboard.up('w')

    // Test mouse movement
    await page.mouse.move(100, 100)
    await page.mouse.down()
    await page.waitForTimeout(100)
    await page.mouse.up()

    // If there's a debug panel, verify interaction
    const debugPanel = page.locator('.debug-panel, [data-testid="debug-panel"]').first()
    if (await debugPanel.isVisible()) {
      await expect(debugPanel).toContainText(/position/i)
    }
  })

  test('should maintain stable performance', async ({ page }) => {
    // Simple performance check
    const startTime = Date.now()
    await page.waitForTimeout(2000) // Wait for 2 seconds of game time
    const endTime = Date.now()

    // Basic check to ensure the game is running
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()

    // If there's a performance indicator, check it
    const perfIndicator = page.locator('.fps-counter, [data-testid="fps"]').first()
    if (await perfIndicator.isVisible()) {
      const fps = await perfIndicator.textContent()
      expect(parseInt(fps || '0')).toBeGreaterThan(20) // Ensure reasonable FPS
    }
  })
})
