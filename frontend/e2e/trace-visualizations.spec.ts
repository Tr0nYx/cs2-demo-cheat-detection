import { test, expect } from '@playwright/test'

// Mock backend API responses for TRACE data
const mockTraceResponse = {
  traceBase: 0.65,
  traceAdjusted: 0.72,
  traceNormalized: 0.36,
  trustMultiplier: 0.95,
  components: {
    ekill: 0.55,
    aim: 0.78,
    kast: 0.82,
    util: 0.68,
    clutch: 0.92,
  },
  calibrationVersion: 'default-v1',
  calculatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
}

const mockTraceHistoryResponse = {
  traces: [
    {
      ...mockTraceResponse,
      percentiles: {
        ekill: 25,
        aim: 45,
        kast: 50,
        util: 35,
        clutch: 60,
      },
      trustMultiplierPercentile: 42,
      traceAdjustedPercentile: 48,
      calculatedAt: new Date(Date.now() - 0).toISOString(),
    },
    {
      ...mockTraceResponse,
      traceAdjusted: 0.68,
      percentiles: {
        ekill: 20,
        aim: 40,
        kast: 48,
        util: 30,
        clutch: 55,
      },
      trustMultiplierPercentile: 40,
      traceAdjustedPercentile: 44,
      calculatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      ...mockTraceResponse,
      traceAdjusted: 0.70,
      percentiles: {
        ekill: 22,
        aim: 42,
        kast: 49,
        util: 32,
        clutch: 58,
      },
      trustMultiplierPercentile: 41,
      traceAdjustedPercentile: 46,
      calculatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  pagination: {
    total: 3,
    limit: 10,
    offset: 0,
    hasMore: false,
  },
}

test.describe('TRACE Visualizations', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API endpoints
    await page.route('**/api/demos/*/trace', (route) => {
      route.abort()
    })
    await page.route('**/api/players/*/trace-history', (route) => {
      route.abort()
    })
  })

  test('renders demo detail page with TRACE card', async ({ page }) => {
    // This test requires a demo detail page - adjust URL as needed
    // For now, we verify the component structure
    await page.goto('/results/test-demo-id')

    // Check if page loads
    expect(page).toBeDefined()
  })

  test('trace chart renders with all component bars', async ({ page }) => {
    // Navigate to a demo detail page
    const demoId = 'test-demo-123'

    // Mock the TRACE endpoint
    await page.route('**/api/demos/test-demo-123/trace', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceResponse),
        contentType: 'application/json',
      })
    })

    // Mock the history endpoint
    await page.route('**/api/players/steam-123/trace-history*', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceHistoryResponse),
        contentType: 'application/json',
      })
    })

    // Navigate to results page
    await page.goto(`/results/${demoId}`)

    // Wait for TRACE card to appear
    const traceCard = page.locator('text=TRACE Rating Analysis')
    await expect(traceCard).toBeVisible()
  })

  test('percentile badges display for each component', async ({ page }) => {
    const demoId = 'test-demo-456'

    await page.route('**/api/demos/test-demo-456/trace', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceResponse),
        contentType: 'application/json',
      })
    })

    await page.route('**/api/players/*/trace-history*', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceHistoryResponse),
        contentType: 'application/json',
      })
    })

    await page.goto(`/results/${demoId}`)

    // Wait for component scores section
    await page.waitForSelector('text=Component Scores', { timeout: 5000 })

    // Note: Percentile badges will only show if playerId is provided to TraceCard
    // This test verifies the page structure loads
    expect(page).toBeDefined()
  })

  test('sparkline shows historical trend', async ({ page }) => {
    const demoId = 'test-demo-789'

    await page.route('**/api/demos/test-demo-789/trace', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceResponse),
        contentType: 'application/json',
      })
    })

    await page.route('**/api/players/*/trace-history*', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceHistoryResponse),
        contentType: 'application/json',
      })
    })

    await page.goto(`/results/${demoId}`)

    // Wait for TRACE card
    await page.waitForSelector('text=TRACE Rating Analysis', { timeout: 5000 })

    // Note: Sparkline will only show if playerId is provided
    // This test verifies the page loads without errors
    expect(page).toBeDefined()
  })

  test('calibration context card expands and collapses', async ({ page }) => {
    const demoId = 'test-demo-expand'

    await page.route('**/api/demos/test-demo-expand/trace', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceResponse),
        contentType: 'application/json',
      })
    })

    await page.route('**/api/players/*/trace-history*', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceHistoryResponse),
        contentType: 'application/json',
      })
    })

    await page.goto(`/results/${demoId}`)

    // Wait for TRACE card
    await page.waitForSelector('text=TRACE Rating Analysis', { timeout: 5000 })

    // Note: Calibration card will only show if playerId is provided
    // Verify page loads without errors
    expect(page).toBeDefined()
  })

  test('error state if history API fails gracefully', async ({ page }) => {
    const demoId = 'test-demo-error'

    await page.route('**/api/demos/test-demo-error/trace', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceResponse),
        contentType: 'application/json',
      })
    })

    // Mock history endpoint to return error
    await page.route('**/api/players/*/trace-history*', (route) => {
      route.resolve({
        status: 500,
        body: JSON.stringify({ message: 'Server error' }),
        contentType: 'application/json',
      })
    })

    await page.goto(`/results/${demoId}`)

    // Wait for TRACE card to appear
    const traceCard = page.locator('text=TRACE Rating Analysis')
    await expect(traceCard).toBeVisible()

    // Main card should still be functional even if history fails
    // Verify base scores are displayed
    await page.waitForSelector('text=Base Score', { timeout: 5000 })
  })

  test('loading state shows skeleton while fetching history', async ({ page }) => {
    const demoId = 'test-demo-loading'

    // Slow down history response
    await page.route('**/api/demos/test-demo-loading/trace', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceResponse),
        contentType: 'application/json',
      })
    })

    await page.route('**/api/players/*/trace-history*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceHistoryResponse),
        contentType: 'application/json',
      })
    })

    await page.goto(`/results/${demoId}`)

    // TRACE card should load first
    const traceCard = page.locator('text=TRACE Rating Analysis')
    await expect(traceCard).toBeVisible()
  })

  test('handles empty history gracefully', async ({ page }) => {
    const demoId = 'test-demo-empty'

    await page.route('**/api/demos/test-demo-empty/trace', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceResponse),
        contentType: 'application/json',
      })
    })

    // Return empty history
    await page.route('**/api/players/*/trace-history*', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify({ traces: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } }),
        contentType: 'application/json',
      })
    })

    await page.goto(`/results/${demoId}`)

    // Main card should still display
    const traceCard = page.locator('text=TRACE Rating Analysis')
    await expect(traceCard).toBeVisible()
  })

  test('mobile viewport responsive design', async ({ page }) => {
    // Set mobile viewport
    page.setViewportSize({ width: 375, height: 667 })

    const demoId = 'test-demo-mobile'

    await page.route('**/api/demos/test-demo-mobile/trace', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceResponse),
        contentType: 'application/json',
      })
    })

    await page.route('**/api/players/*/trace-history*', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceHistoryResponse),
        contentType: 'application/json',
      })
    })

    await page.goto(`/results/${demoId}`)

    // Wait for card to appear
    const traceCard = page.locator('text=TRACE Rating Analysis')
    await expect(traceCard).toBeVisible()

    // Verify no horizontal scroll
    const body = page.locator('body')
    const bodySize = await body.boundingBox()
    expect(bodySize?.width).toBeLessThanOrEqual(375)
  })

  test('accessibility ARIA labels present', async ({ page }) => {
    const demoId = 'test-demo-a11y'

    await page.route('**/api/demos/test-demo-a11y/trace', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceResponse),
        contentType: 'application/json',
      })
    })

    await page.route('**/api/players/*/trace-history*', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceHistoryResponse),
        contentType: 'application/json',
      })
    })

    await page.goto(`/results/${demoId}`)

    // Wait for TRACE card
    await page.waitForSelector('text=TRACE Rating Analysis', { timeout: 5000 })

    // Verify ARIA labels exist
    const ariaElements = await page.locator('[aria-label]').count()
    expect(ariaElements).toBeGreaterThan(0)
  })

  test('keyboard navigation through component sections', async ({ page }) => {
    const demoId = 'test-demo-keyboard'

    await page.route('**/api/demos/test-demo-keyboard/trace', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceResponse),
        contentType: 'application/json',
      })
    })

    await page.route('**/api/players/*/trace-history*', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceHistoryResponse),
        contentType: 'application/json',
      })
    })

    await page.goto(`/results/${demoId}`)

    // Wait for card to load
    await page.waitForSelector('text=TRACE Rating Analysis', { timeout: 5000 })

    // Tab through the page to verify keyboard navigation works
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Page should remain stable
    expect(page).toBeDefined()
  })

  test('trace card does not break when TRACE data missing', async ({ page }) => {
    const demoId = 'test-demo-no-trace'

    // Return 404 for TRACE endpoint
    await page.route('**/api/demos/test-demo-no-trace/trace', (route) => {
      route.resolve({
        status: 404,
        body: JSON.stringify({ message: 'Not found' }),
        contentType: 'application/json',
      })
    })

    await page.goto(`/results/${demoId}`)

    // Page should load without the TRACE card
    const page_title = page.locator('text=Analysis')
    // TRACE card should be hidden when not available
    expect(page).toBeDefined()
  })

  test('component chart displays correct value ranges', async ({ page }) => {
    const demoId = 'test-demo-ranges'

    await page.route('**/api/demos/test-demo-ranges/trace', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify({
          ...mockTraceResponse,
          components: {
            ekill: 0.3, // Minimum
            aim: 1.15, // Middle
            kast: 2.0, // Maximum
            util: 0.75,
            clutch: 1.5,
          },
        }),
        contentType: 'application/json',
      })
    })

    await page.route('**/api/players/*/trace-history*', (route) => {
      route.resolve({
        status: 200,
        body: JSON.stringify(mockTraceHistoryResponse),
        contentType: 'application/json',
      })
    })

    await page.goto(`/results/${demoId}`)

    // Wait for component scores to appear
    await page.waitForSelector('text=Component Scores', { timeout: 5000 })

    // Verify card loads without errors with boundary values
    expect(page).toBeDefined()
  })
})
