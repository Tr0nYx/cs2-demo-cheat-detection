import { expect, test } from '@playwright/test'

test.describe('Phase 14: Landing Page + Steam Login + Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Steam OpenID endpoint
    await page.route('**/api/auth/steam-verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-jwt-token-12345',
          refresh_token: 'mock-refresh-token-67890',
          user_id: 'test-user-123',
          steam_id: '76561198999999999',
          username: 'TestPlayer',
          avatar_url: 'https://avatars.akamai.steamstatic.com/test.jpg',
          email: 'test@example.com',
          expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
        }),
      })
    })

    // Mock user profile endpoint
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-123',
          steam_id: '76561198999999999',
          username: 'TestPlayer',
          avatar_url: 'https://avatars.akamai.steamstatic.com/test.jpg',
          email: 'test@example.com',
          created_at: '2026-05-17T10:00:00Z',
          last_login_at: '2026-05-17T14:30:00Z',
        }),
      })
    })

    // Mock NextAuth session endpoint dynamically based on cookies
    await page.route('**/api/auth/session', async (route) => {
      const cookies = await page.context().cookies()
      const hasSession = cookies.some((c) => c.name.includes('session-token'))
      console.log(`[E2E Session Mock] Cookies count: ${cookies.length}, Has session cookie: ${hasSession}, Cookies: ${JSON.stringify(cookies)}`)

      if (hasSession) {
        console.log(`[E2E Session Mock] Returning authenticated user session`)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              name: 'TestPlayer',
              email: 'test@example.com',
              image: 'https://avatars.akamai.steamstatic.com/test.jpg',
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }),
        })
      } else {
        console.log(`[E2E Session Mock] Returning empty session`)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({}),
        })
      }
    })

    // Mock NextAuth CSRF endpoint
    await page.route('**/api/auth/csrf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'mock-csrf-token' }),
      })
    })

    // Mock NextAuth signout endpoint
    await page.route('**/api/auth/signout*', async (route) => {
      await page.context().clearCookies()
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ url: 'http://localhost:3000/' }),
        })
      } else {
        await route.fulfill({
          status: 302,
          headers: {
            Location: 'http://localhost:3000/',
          },
        })
      }
    })

    // Mock demos endpoint
    await page.route('**/api/demos*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          demos: [
            {
              id: 'demo-1',
              original_filename: 'match_2026_05_17_dust2.dem',
              map: 'de_dust2',
              status: 'done',
              created_at: '2026-05-17T12:00:00Z',
              results: {
                overall_score: 0.65,
                overall_verdict: 'suspicious',
              },
            },
            {
              id: 'demo-2',
              original_filename: 'match_2026_05_16_inferno.dem',
              map: 'de_inferno',
              status: 'done',
              created_at: '2026-05-16T14:30:00Z',
              results: {
                overall_score: 0.32,
                overall_verdict: 'clean',
              },
            },
          ],
          pagination: {
            total: 22,
            page: 1,
            limit: 20,
            hasMore: true,
          },
        }),
      })
    })

    // Mock public metrics endpoint
    await page.route('**/api/metrics/public', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_demos_analyzed: 1234,
          avg_suspicion_score: 0.42,
          total_players_analyzed: 567,
          total_matches: 890,
          updated_at: '2026-05-17T14:00:00Z',
        }),
      })
    })
  })

  test('landing page displays hero, features, and public metrics', async ({ page }) => {
    await page.goto('/')

    // Check hero section
    await expect(page.getByRole('heading', { name: /CS2 Demo Cheat Detection/i })).toBeVisible()
    await expect(page.getByText(/Analyze Counter-Strike 2 demo/i)).toBeVisible()

    // Check features section
    await expect(page.getByText(/Powerful Features/i)).toBeVisible()
    await expect(page.getByText(/Upload & Analyze/i)).toBeVisible()

    // Check public metrics
    await expect(page.getByText(/1,234/)).toBeVisible() // total demos
    await expect(page.getByText(/42/)).toBeVisible() // avg suspicion (renders as 42.0%)

    // Check Steam login button
    await expect(page.getByRole('button', { name: /Sign in through Steam/i })).toBeVisible()
  })

  test('landing page navbar shows login button for unauthenticated users', async ({ page }) => {
    await page.goto('/')

    // Navbar should show login button
    const loginButton = page.getByRole('button', { name: /Sign in through Steam/i })
    await expect(loginButton).toBeVisible()

    // Should NOT show user dropdown
    await expect(page.getByTestId('user-dropdown')).not.toBeVisible()
  })

  test('authenticated user can access dashboard', async ({ page, context }) => {
    // Set authenticated session (simulate post-login state)
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

    // Navigate to dashboard
    await page.goto('/dashboard')

    // Should show user profile
    await expect(page.getByText('TestPlayer').first()).toBeVisible()
    await expect(page.getByAltText('TestPlayer').first()).toBeVisible()

    // Should show demo history
    await expect(page.getByText('Demo history')).toBeVisible()
    await expect(page.getByText('match_2026_05_17_dust2.dem').first()).toBeVisible()
    await expect(page.getByText('de_dust2').first()).toBeVisible()
    await expect(page.getByText('Analyzed').first()).toBeVisible()
  })

  test('dashboard demo history table displays with pagination', async ({ page, context }) => {
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

    // Check demo table
    await expect(page.getByText('match_2026_05_17_dust2.dem').first()).toBeVisible()
    await expect(page.getByText('de_inferno').first()).toBeVisible()

    // Check sorting options
    await expect(page.getByRole('button', { name: /Upload Date/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Review signal/i })).toBeVisible()

    // Check pagination info
    await expect(page.getByText(/Page 1 of 2/i)).toBeVisible()
    await expect(page.getByText(/22 total/i)).toBeVisible()
  })

  test('clicking demo row navigates to results page', async ({ page, context }) => {
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

    // Click on first demo
    await page.getByText('match_2026_05_17_dust2.dem').first().click()

    // Should navigate to results page
    await expect(page).toHaveURL(/.*\/results\/demo-1/)
  })

  test('dashboard navbar shows user dropdown for authenticated users', async ({ page, context }) => {
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

    // Should show user avatar in dropdown
    await expect(page.getByTestId('user-dropdown')).toBeVisible()

    // Click to open dropdown
    await page.getByTestId('user-dropdown').click()

    // Should show logout button
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible()
  })

  test('quick upload card is visible on dashboard', async ({ page, context }) => {
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

    // Should show quick upload card
    await expect(page.getByText(/Upload demo file/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Upload Demo/i })).toBeVisible()
  })

  test('unauthenticated users cannot access dashboard', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard')

    // Should be redirected to landing page
    expect(page.url()).toContain('http://localhost:3000/')

    // Should show login button
    await expect(page.getByRole('button', { name: /Sign in through Steam/i })).toBeVisible()
  })

  test('logout clears session and returns to landing page', async ({ page, context }) => {
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

    // Click user dropdown
    await page.getByTestId('user-dropdown').hover()
    await page.getByTestId('user-dropdown').click()

    // Click logout
    await page.getByRole('button', { name: /Logout/i }).click()

    // Should be redirected to landing page
    await expect(page).toHaveURL('http://localhost:3000/')

    // Session cookie should be cleared
    const cookies = await context.cookies()
    const sessionCookie = cookies.find((c) => c.name === 'next-auth.session-token')
    expect(sessionCookie).toBeUndefined()
  })

  test('public metrics are displayed on landing page', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(500) // allow client-side hydration

    // Should fetch and display metrics
    await expect(page.getByText(/Demos Analyzed/i)).toBeVisible()
    await expect(page.getByText(/1,234/)).toBeVisible()

    // Should show other metrics
    await expect(page.getByText(/Average Suspicion Score/i)).toBeVisible()
    await expect(page.getByText(/42/)).toBeVisible()
  })
})
