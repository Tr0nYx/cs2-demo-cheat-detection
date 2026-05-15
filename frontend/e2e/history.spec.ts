import { test, expect } from '@playwright/test'

test.describe('History Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/history')
  })

  test('displays history page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Analysis History')

    // Check for analyses heading
    await expect(page.locator('text=Analyses')).toBeVisible()
  })

  test('shows back to upload button', async ({ page }) => {
    const backButton = page.locator('button:has-text("Back to Upload")')
    await expect(backButton).toBeVisible()
  })

  test('handles empty history gracefully', async ({ page }) => {
    // Page should load even if no demos exist
    const pageContent = await page.content()
    expect(pageContent.length).toBeGreaterThan(0)

    // Either shows empty state or a table
    const hasEmptyState = await page.locator('text=/no analyses|No analyses/i').isVisible().catch(() => false)
    const hasTable = await page.locator('table').isVisible().catch(() => false)

    expect(hasEmptyState || hasTable).toBe(true)
  })

  test('responsive design - mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Page should still be visible and readable
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
  })

  test('responsive design - desktop view', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })

    // Page should display properly on desktop
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
  })
})
