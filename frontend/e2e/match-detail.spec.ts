import { expect, test } from '@playwright/test'

const demoId = '22222222-2222-7222-8222-222222222222'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({}) })
  })

  await page.route(`**/api/demos/${demoId}`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        demo_id: demoId,
        status: 'done',
        map: 'de_mirage',
        metadata: {
          uploaded_at: '2026-05-19T10:00:00Z',
          processed_at: '2026-05-19T10:10:00Z',
          original_filename: 'match-detail.dem',
          source_platform: 'sharecode',
        },
        results: [{
          player: { steam_id: '76561198000000001', display_name: 'Research Player' },
          scores: { overall: 24, aimbot: 10, triggerbot: 3, wallhack: 8, recoil: 12, bhop: 0, session_consistency: 4 },
          label: 'clean',
          feature_data: {},
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
        map: 'de_mirage',
        original_filename: 'match-detail.dem',
        featureVectors: null,
        baselineSuspicion: null,
        metadata: {
          map: 'de_mirage',
          outcome: 'win',
          uploaded_at: '2026-05-19T10:00:00Z',
          processed_at: '2026-05-19T10:10:00Z',
          original_filename: 'match-detail.dem',
          source_platform: 'sharecode',
        },
        results: {
          players: [{
            steamId: '76561198000000001',
            name: 'Research Player',
            overallScore: 24,
            overallVerdict: 'clean',
            features: [{ name: 'aimbot', score: 10, interpretation: 'Low review signal' }],
          }],
        },
      }),
    })
  })

  await page.route(`**/api/demos/${demoId}/rounds`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        rounds: [
          { round_number: 1, start_tick: 100, end_tick: 300, winner: 'CT', end_reason: 'elimination', duration_ms: 95000, kills: 4, first_kill_tick: 140, bomb_planted: false },
          { round_number: 2, start_tick: 320, end_tick: 540, winner: 'T', end_reason: 'bomb_exploded', duration_ms: 101000, kills: 6, first_kill_tick: 360, bomb_planted: true },
        ],
      }),
    })
  })

  await page.route(`**/api/demos/${demoId}/events**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        kills: [{
          round_number: 1,
          tick: 140,
          attacker: { steam_id: '76561198000000001', name: 'Research Player', position: { x: -2476, y: 3239, z: null } },
          victim: { steam_id: '76561198000000002', name: 'Opponent', position: { x: -2400, y: 3200, z: null } },
          weapon: 'ak47',
          headshot: true,
          review_signal: { suspicion_score: 0.4, flag_reasons: ['fast_reaction'] },
        }],
        grenades: [{
          round_number: 2,
          tick: 400,
          thrower: { steam_id: '76561198000000001', name: 'Research Player' },
          type: 'smoke',
          start: { x: -2476, y: 3239, z: 0 },
          end: { x: -2300, y: 3100, z: 0 },
          trajectory: [],
        }],
        damage: [],
      }),
    })
  })

  await page.route(`**/api/demos/${demoId}/ticks**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        from_tick: 100,
        to_tick: 300,
        step: 4,
        ticks: [{
          tick: 100,
          players: [
            { steam_id: '76561198000000001', name: 'Research Player', team: 'CT', x: -2476, y: 3239, yaw: 0, alive: true },
            { steam_id: '76561198000000002', name: 'Opponent', team: 'T', x: -2400, y: 3200, yaw: 180, alive: true },
          ],
          grenades: [],
        }],
      }),
    })
  })
})

test('desktop match report shows first viewport context and viewer section', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto(`/matches/${demoId}`)

  await expect(page.getByText('Match detail')).toBeVisible()
  await expect(page.getByText(/research signals from post-game demo analysis/i)).toBeVisible()
  await expect(page.getByText('de_mirage match report')).toBeVisible()
  await expect(page.getByText('Research Player').last()).toBeVisible()
  await expect(page.getByRole('navigation', { name: /match report sections/i })).toBeVisible()

  await page.getByRole('link', { name: /Viewer/i }).click()
  await expect(page.getByText('Viewer and heatmaps')).toBeVisible()
  await expect(page.getByTestId('demo-viewer')).toBeVisible()
})

test('mobile match report keeps summary, participants, and sections readable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto(`/matches/${demoId}`)

  await expect(page.getByText('Match detail')).toBeVisible()
  await expect(page.getByText('Score unavailable', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Overview/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Rounds/i })).toBeVisible()
  await expect(page.getByText('Research Player').last()).toBeVisible()

  await page.getByRole('link', { name: /Viewer/i }).click()
  const viewerBox = page.getByText('Viewer and heatmaps')
  await expect(viewerBox).toBeVisible()
})
