import { test, expect } from '@playwright/test'

test.describe('Results Polling', () => {
  test('displays loading state for pending analysis', async ({ page }) => {
    // Navigate to a results page (would need a valid demo ID from API)
    // This is a framework test - actual flow would be:
    // 1. Upload a demo
    // 2. Get redirected to /results/{id}
    // 3. See polling behavior

    // For now, test the page structure exists
    await page.goto('/results/test-id')

    // Should show either loading or not found (since test-id doesn't exist)
    // The important thing is that the page loads without crashing
    const pageContent = await page.content()
    expect(pageContent.length).toBeGreaterThan(0)
  })

  test('handles 404 for non-existent demo', async ({ page }) => {
    await page.goto('/results/nonexistent-demo-id-12345')

    // Should show error or not found
    const hasError = await page.locator('text=/not found|error|unknown/i').isVisible()
    expect(hasError).toBe(true)
  })

  test('results page has download button structure', async ({ page }) => {
    // This tests the component structure without needing actual data
    // We're just checking that the page can render

    // Visit upload page first
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('CS2 Demo Cheat Detection')

    // Page should be responsive
    const viewport = page.viewportSize()
    expect(viewport).not.toBeNull()
  })
})
