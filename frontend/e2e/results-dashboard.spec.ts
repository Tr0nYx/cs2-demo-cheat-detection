import { expect, test } from '@playwright/test'

const demoId = '33333333-3333-7333-8333-333333333333'

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([{
    name: 'next-auth.session-token',
    value: 'mock-session-token',
    domain: 'localhost',
    path: '/',
  }])

  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({}) })
  })

  await page.route(`**/api/demos/${demoId}`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        demo_id: demoId,
        status: 'done',
        map: 'de_nuke',
        metadata: {
          uploaded_at: '2026-05-19T10:00:00Z',
          original_filename: 'results-dashboard.dem',
        },
        results: [{
          player: { steam_id: '76561198000000001', display_name: 'Evidence Player' },
          scores: {
            overall: 82,
            aimbot: 82,
            triggerbot: 36,
            wallhack: 22,
            recoil: 18,
            bhop: 4,
            session_consistency: 20,
          },
          label: 'likely_cheating',
          model_version: 'phase-25-test',
          feature_data: {
            AimbotExtractor: {
              raw_measurements: {
                kills_detected: 12,
                mean_snap_ratio: 2.1,
                normalized_snap: 0.82,
                normalized_jerk: 0.76,
              },
              metadata: {
                method: 'aimbot_multifeature_sigmoid',
                confidence: 'high',
                evidence_strength: 'strong',
                independent_signals: ['snap_ratio', 'angular_jerk'],
              },
            },
          },
        }],
      }),
    })
  })

  await page.route(`**/api/demos/${demoId}/detail`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: demoId,
        status: 'done',
        map: 'de_nuke',
        featureVectors: null,
        baselineSuspicion: null,
        metadata: {
          map: 'de_nuke',
          uploaded_at: '2026-05-19T10:00:00Z',
          original_filename: 'results-dashboard.dem',
        },
      }),
    })
  })

  await page.route(`**/api/demos/${demoId}/trace`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        traceBase: 1.2,
        traceAdjusted: 1.1,
        traceNormalized: 0.55,
        trustMultiplier: 0.95,
        components: { ekill: 1.1, aim: 1.4, kast: 0.9, util: 1.0, clutch: 0.8 },
        calibrationVersion: 'test',
        calculatedAt: '2026-05-19T10:00:00Z',
        createdAt: '2026-05-19T10:00:00Z',
      }),
    })
  })

  await page.route(`**/api/players/76561198000000001/trace-history**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        traces: [],
        pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
      }),
    })
  })

  await page.route(`**/api/demos/${demoId}/rounds`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ rounds: [] }),
    })
  })

  await page.route(`**/api/demos/${demoId}/events**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ kills: [], grenades: [], damage: [] }),
    })
  })

  await page.route(`**/api/demos/${demoId}/ticks**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ready', from_tick: 0, to_tick: 0, step: 4, ticks: [] }),
    })
  })
})

test('desktop result dashboard page loads', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto(`/results/${demoId}`)

  // Page renders with Analysis Results heading
  await expect(page.getByRole('heading', { name: 'Analysis Results', level: 1 })).toBeVisible()
})

test('mobile result dashboard page loads', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto(`/results/${demoId}`)

  // Page renders with Analysis Results heading
  await expect(page.getByRole('heading', { name: 'Analysis Results', level: 1 })).toBeVisible()
})
