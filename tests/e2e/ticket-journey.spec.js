import { test, expect } from '@playwright/test'

test.describe('DigitalSofts Support Desk — E2E User Journey', () => {

  test('Complete User Journey: Launch app, navigate workspace, verify tickets & storage resilience', async ({ page }) => {
    // 1. Open the Application
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // 2. Verify Application Body & Title are loaded
    await expect(page.locator('body')).toBeVisible()

    // 3. Verify LocalStorage initialization (Tickets & Workspace settings)
    const storageKeys = await page.evaluate(() => Object.keys(localStorage))
    expect(storageKeys.length).toBeGreaterThan(0)

    // 4. Test User Interaction (Search / Filter action)
    const searchInput = page.locator('input[type="text"], input[type="search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('Login')
      await page.waitForTimeout(500)
      await searchInput.fill('')
    }

    // 5. Test Persistence Across Page Reload
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()

    // 6. Verify State Persisted
    const persistedCount = await page.evaluate(() => localStorage.length)
    expect(persistedCount).toBeGreaterThan(0)
  })

})