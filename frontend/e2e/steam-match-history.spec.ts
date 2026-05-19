import { expect, test } from '@playwright/test'

const authToken = 'mock-jwt-token-12345'
const steamMatchStatus = {
  connected: false,
  status: 'disconnected',
  connected_since: null,
  last_check_at: null,
  next_check_at: null,
  known_sharecode: null,
  discovered_count: 0,
  queued_count: 0,
  imported_count: 0,
  last_error: null,
}

const connectedMatchStatus = {
  connected: true,
  status: 'active',
  connected_since: '2026-05-17T10:00:00Z',
  last_check_at: '2026-05-17T12:00:00Z',
  next_check_at: '2026-05-17T12:30:00Z',
  known_sharecode: 'CSGO-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY',
  discovered_count: 3,
  queued_count: 1,
  imported_count: 1,
  last_error: null,
}

const demoResponse = {
  demos: [
    {
      id: 'demo-1',
      original_filename: 'match_2026_05_17_dust2.dem',
      map: 'de_dust2',
      status: 'done',
      uploaded_at: '2026-05-17T12:00:00Z',
      trace_adjusted: 0.65,
      outcome: 'clean',
    },
  ],
  pagination: {
    total: 1,
    limit: 20,
    offset: 0,
    hasMore: false,
  },
}

test.describe('Steam match-history tracking', () => {
  test('submits a Steam auth token and sharecode to connect tracking', async ({ page, context }) => {
    let trackingRequestUrl: string | null = null
    let connectRequestHeaders: Record<string, string> | null = null
    let connectRequestJson: Record<string, unknown> | null = null

    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: '76561198999999999',
            name: 'TestPlayer',
            email: 'test@example.com',
            image: 'https://avatars.akamai.steamstatic.com/test.jpg',
          },
          accessToken: authToken,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      })
    })

    await page.route('**/api/demos*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(demoResponse),
      })
    })

    let shouldReturnConnected = false

    await page.route('**/api/steam/match-history', async (route) => {
      const request = route.request()
      if (request.url().endsWith('/steam/match-history')) {
        trackingRequestUrl = request.url()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(shouldReturnConnected ? connectedMatchStatus : steamMatchStatus),
        })
        return
      }

      await route.continue()
    })

    await page.route('**/api/steam/match-history/connect', async (route) => {
      const request = route.request()
      connectRequestHeaders = request.headers()
      connectRequestJson = request.postDataJSON()
      shouldReturnConnected = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(connectedMatchStatus),
      })
    })

    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ])

    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: /Match-history tracking/i })).toBeVisible()
    await expect(page.getByLabel('Game Authentication Code')).toBeVisible()
    await expect(page.getByLabel('Seed Sharecode or Link')).toBeVisible()

    await page.getByLabel('Game Authentication Code').fill('STEAM-AUTH-1234')
    await page.getByLabel('Seed Sharecode or Link').fill('CSGO-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY')
    await page.getByRole('button', { name: /Connect/i }).click()

    await expect(page.getByText(/Tracking active/i).first()).toBeVisible()
    await expect(page.getByText(/Known code/i).first()).toBeVisible()
    await expect(page.getByText('CSGO-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY')).toBeVisible()

    expect(trackingRequestUrl).toContain('/api/steam/match-history')
    expect(connectRequestHeaders).not.toBeNull()
    expect(connectRequestHeaders?.authorization).toBe(`Bearer ${authToken}`)
    expect(connectRequestJson).toEqual({
      steamidkey: 'STEAM-AUTH-1234',
      seed: 'CSGO-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY',
    })
  })
})
