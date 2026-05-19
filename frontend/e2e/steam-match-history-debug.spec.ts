import { test, expect } from '@playwright/test'

// This debug test captures the real /api/steam/match-history network request
// and prints request headers + response status/body to aid diagnosis.

test('debug: capture steam match-history request/response', async ({ page, context }) => {
  const authToken = 'debug-mock-token-xyz'
  let capture: { reqUrl?: string; reqHeaders?: any; status?: number; bodyText?: string } = {}

  // Intercept session to ensure client has an accessToken
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: '76561198999999999', name: 'DebugUser' },
        accessToken: authToken,
        expires: new Date(Date.now() + 3600 * 1000).toISOString(),
      }),
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

  page.on('request', (request) => {
    if (request.url().includes('/api/steam/match-history')) {
      capture.reqUrl = request.url()
      capture.reqHeaders = request.headers()
      console.log('[debug] MATCH HISTORY REQUEST', request.url(), request.method(), request.headers())
    }
  })

  page.on('response', async (response) => {
    if (response.url().includes('/api/steam/match-history')) {
      capture.status = response.status()
      try {
        capture.bodyText = await response.text()
      } catch (e) {
        capture.bodyText = `<unable to read body: ${String(e)}>`
      }
      console.log('[debug] MATCH HISTORY RESPONSE', response.status(), capture.bodyText)
    }
  })

  const matchHistoryResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/steam/match-history'),
    { timeout: 10000 }
  )

  // Navigate to dashboard which triggers the match-history query
  await page.goto('/dashboard')

  const matchHistoryResponse = await matchHistoryResponsePromise.catch(() => undefined)
  if (matchHistoryResponse) {
    capture.status = matchHistoryResponse.status()
    try {
      capture.bodyText = await matchHistoryResponse.text()
    } catch (e) {
      capture.bodyText = `<unable to read body: ${String(e)}>`
    }
  }

  console.log('[debug] captured', capture)

  // Basic assertions to surface failure in the CI/test output
  expect(capture.reqUrl).toBeTruthy()
  expect(capture.reqHeaders).toBeTruthy()
  expect(capture.status).toBeDefined()

  // If backend responded non-200, fail to highlight the problem
  if (capture.status && capture.status >= 400) {
    throw new Error(`Match-history endpoint returned ${capture.status}: ${capture.bodyText}`)
  }
})
