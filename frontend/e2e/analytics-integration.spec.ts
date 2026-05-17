import { expect, test, type Page } from '@playwright/test'

const demoList = {
  demos: [
    {
      id: 'demo-mirage',
      map: 'Mirage',
      status: 'done',
      uploaded_at: '2026-05-17T10:00:00Z',
      trace_adjusted: 0.82,
      outcome: 'win',
    },
    {
      id: 'demo-inferno',
      map: 'Inferno',
      status: 'done',
      uploaded_at: '2026-05-16T10:00:00Z',
      trace_adjusted: 0.44,
      outcome: 'loss',
    },
  ],
  pagination: {
    total: 2,
    limit: 20,
    offset: 0,
    hasMore: false,
  },
}

const filteredLeaderboard = {
  players: [
    {
      rank: 1,
      playerId: '76561198000000001',
      username: 'Mirage Specialist',
      avatar: null,
      percentile95: 0.91,
      demoCount: 9,
      components: {
        ekill: 0.88,
        aim: 0.93,
        kast: 0.81,
        util: 0.62,
        clutch: 0.7,
      },
      lastAnalyzedAt: '2026-05-17T10:00:00Z',
    },
  ],
  total: 1,
  hasMore: false,
}

async function mockPhase15Apis(page: Page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        steam_id: '76561198000000001',
        username: 'TestPlayer',
        avatar_url: 'https://example.test/avatar.jpg',
      }),
    })
  })

  await page.route('**/api/demos?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(demoList),
    })
  })

  await page.route('**/api/demos/demo-mirage', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'demo-mirage',
        status: 'done',
        results: {
          players: [
            {
              steamId: '76561198000000001',
              name: 'TestPlayer',
              overallScore: 0.62,
              overallVerdict: 'suspicious',
              features: [],
            },
          ],
        },
      }),
    })
  })

  await page.route('**/api/demos/demo-mirage/detail', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'demo-mirage',
        status: 'done',
        featureVectors: {
          aimbotScore: 0.62,
          wallhackScore: 0.33,
          triggerbotScore: 0.21,
          recoilScore: 0.28,
          bhopScore: 0.1,
          sessionScore: 0.41,
        },
        baselineSuspicion: 0.62,
        metadata: {
          map: 'Mirage',
          outcome: 'win',
        },
      }),
    })
  })

  await page.route('**/api/analytics/compare', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        baselineSuspicion: 0.62,
        tunedSuspicion: 0.54,
        impactBreakdown: {
          aimbot: -0.05,
          wallhack: -0.03,
        },
      }),
    })
  })

  await page.route('**/api/analytics/trends/consistency**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        bands: [
          {
            timestamp: '2026-05-16',
            meanScore: 0.44,
            upperBound: 0.56,
            lowerBound: 0.32,
            demoCount: 5,
          },
          {
            timestamp: '2026-05-17',
            meanScore: 0.61,
            upperBound: 0.75,
            lowerBound: 0.47,
            demoCount: 6,
          },
        ],
        flaggedDates: ['2026-05-17'],
        minDemosRequirement: 5,
        message: null,
      }),
    })
  })

  await page.route('**/api/analytics/trends/arc**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        slope: 0.04,
        intercept: 0.3,
        rSquared: 0.71,
        outliersDetected: [
          {
            demoIndex: 3,
            demoId: 'demo-mirage',
            actualScore: 0.82,
            predictedScore: 0.5,
            deviation: 0.32,
          },
        ],
        message: null,
      }),
    })
  })

  await page.route('**/api/analytics/trends/weapons**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        strengths: {
          Rifle: 0.76,
          Pistol: 0.54,
          Sniper: 0.69,
        },
        message: null,
      }),
    })
  })

  await page.route('**/api/leaderboards/filtered**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'X-Total-Count': '1',
      },
      body: JSON.stringify(filteredLeaderboard),
    })
  })
}

test.describe('Phase 15: Advanced analytics user scoping integration', () => {
  test.beforeEach(async ({ page, context }) => {
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

    await mockPhase15Apis(page)
  })

  test('testUserDemosAnalytics filters dashboard demos by shared scope dimensions', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page.getByText('Filtered Demo Scope')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mirage' })).toBeVisible()

    await page.getByRole('button', { name: 'Mirage' }).click()
    await expect(page.getByText('demo-mirage')).toBeVisible()
    await expect(page.getByText('0.82')).toBeVisible()
  })

  test('testSensitivityComparison opens demo detail tuner and posts comparison', async ({ page }) => {
    await page.goto('/results/demo-mirage')

    await expect(page.getByText(/Sensitivity/i)).toBeVisible()
    await page.getByRole('button', { name: /Compare/i }).click()

    await expect(page.getByText(/0.54|54/i)).toBeVisible()
  })

  test('testTrendMetrics renders all advanced trend cards', async ({ page }) => {
    await page.goto('/analytics/trends')

    await expect(page.getByRole('heading', { name: 'Analytics Trends' })).toBeVisible()
    await expect(page.getByText(/Consistency/i)).toBeVisible()
    await expect(page.getByText(/Arc/i)).toBeVisible()
    await expect(page.getByText(/Weapon/i)).toBeVisible()
  })

  test('testFilteredLeaderboard ranks players by filtered TRACE scope', async ({ page }) => {
    await page.goto('/leaderboards')

    await expect(page.getByRole('heading', { name: 'TRACE Leaderboards' })).toBeVisible()
    await expect(page.getByText('Mirage Specialist')).toBeVisible()
    await expect(page.getByText('0.91')).toBeVisible()

    await page.getByRole('button', { name: 'Mirage' }).click()
    await expect(page.getByText('1 qualified players')).toBeVisible()
  })

  test('testCompleteFilterContract keeps map rating and timeframe dimensions aligned', async ({ page }) => {
    await page.goto('/leaderboards')

    await page.getByRole('button', { name: 'Mirage' }).click()
    await page.getByLabel('Rating Band').selectOption('10+')
    await page.getByLabel('Timeframe').selectOption('30')

    await expect(page.getByText('Mirage Specialist')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Clear leaderboard filters' })).toBeVisible()
  })
})
