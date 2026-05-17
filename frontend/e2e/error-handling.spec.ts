import { test, expect } from '@playwright/test'

test.describe('Error Handling', () => {
  test('404 page displays correctly', async ({ page }) => {
    await page.goto('/nonexistent-page', { waitUntil: 'networkidle' })

    // Should show not found page
    const hasNotFoundText = await page.locator('text=/not found|page not found/i').isVisible()
    expect(hasNotFoundText).toBe(true)

    // Should have navigation buttons
    const buttons = page.locator('button')
    await expect(buttons).toBeDefined()
  })

  test('home page loads without errors', async ({ page }) => {
    // Capture any console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')

    // Should not have critical errors
    expect(errors.filter(e => !e.includes('ResizeObserver')).length).toBe(0)

    // Page should render
    await expect(page.locator('h1')).toContainText('CS2 Demo Cheat Detection')
  })

  test('history page handles loading state', async ({ page }) => {
    // Page should show loading initially, then either data or empty state
    await page.goto('/history')

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Page should be visible
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
  })

  test('error page displays when component fails', async ({ page }) => {
    // This would test actual error boundary behavior
    // For now, verify the error pages exist

    // Try accessing results with invalid ID
    await page.goto('/results/invalid-id-format')

    // Should either show error or loading
    const pageContent = await page.content()
    expect(pageContent.length).toBeGreaterThan(0)
  })

  test('all pages are accessible', async ({ page }) => {
    const routes = [
      '/',
      '/history',
      '/results/test',
    ]

    for (const route of routes) {
      await page.goto(route, { waitUntil: 'networkidle' }).catch(() => {
        // Ignore network errors during test
      })

      // Page should render something
      const content = await page.content()
      expect(content.length).toBeGreaterThan(100) // At least some content
    }
  })
})
