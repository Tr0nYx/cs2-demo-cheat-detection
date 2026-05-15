import { test, expect } from '@playwright/test'

test.describe('Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays upload page with form', async ({ page }) => {
    // Check title
    await expect(page.locator('h1')).toContainText('CS2 Demo Cheat Detection')

    // Check form exists
    await expect(page.locator('text=Drag and drop')).toBeVisible()
    await expect(page.locator('button:has-text("Upload Demo")')).toBeVisible()
  })

  test('validates file type', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]')

    // Try to upload a non-.dem file (we'll just test with a text file in real scenario)
    // This test would need a fixture file - for now just check the interface
    await expect(fileInput).toBeVisible()
    await expect(fileInput).toHaveAttribute('accept', '.dem')
  })

  test('accepts optional Steam Match ID', async ({ page }) => {
    const steamInput = page.locator('input[placeholder*="Steam Match"]')
    await expect(steamInput).toBeVisible()
    await steamInput.fill('csgo-XXXXXX-XXXXXX')
    await expect(steamInput).toHaveValue('csgo-XXXXXX-XXXXXX')
  })

  test('shows error for empty form submission', async ({ page }) => {
    const submitButton = page.locator('button:has-text("Upload Demo")')
    // Button should be disabled if no file selected
    await expect(submitButton).toBeDisabled()
  })

  test('footer contains GitHub link', async ({ page }) => {
    const githubLink = page.locator('a[href*="github.com"]')
    await expect(githubLink).toBeVisible()
  })
})
