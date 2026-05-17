import { expect, test } from '@playwright/test'

const demoId = '11111111-1111-7111-8111-111111111111'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/demos/**/rounds', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        rounds: [
          { round_number: 1, start_tick: 100, end_tick: 200, winner: 'CT', end_reason: 'elimination', duration_ms: 10000, kills: 1, first_kill_tick: 140, bomb_planted: false },
          { round_number: 2, start_tick: 220, end_tick: 340, winner: 'T', end_reason: 'bomb_exploded', duration_ms: 12000, kills: 1, first_kill_tick: 260, bomb_planted: true },
        ],
      }),
    })
  })

  await page.route('**/api/demos/**/events**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        kills: [
          {
            round_number: 1,
            tick: 140,
            attacker: { steam_id: 'p1', name: 'CT One', position: { x: -2476, y: 3239, z: null } },
            victim: { steam_id: 'p2', name: 'T One', position: { x: -2400, y: 3200, z: null } },
            weapon: 'ak47',
            headshot: true,
            review_signal: { suspicion_score: 0.7, flag_reasons: ['snap_review'] },
          },
        ],
        grenades: [],
        damage: [],
      }),
    })
  })

  await page.route('**/api/demos/**/ticks**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        from_tick: 100,
        to_tick: 200,
        step: 4,
        ticks: [
          {
            tick: 100,
            players: [
              { steam_id: 'p1', name: 'CT One', team: 'CT', x: -2476, y: 3239, yaw: 0, alive: true },
              { steam_id: 'p2', name: 'T One', team: 'T', x: -2400, y: 3200, yaw: 180, alive: true },
            ],
            grenades: [{ type: 'smoke', x: -2450, y: 3210 }],
          },
        ],
      }),
    })
  })

  await page.route('**/api/demos/**/trace', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
  })

  await page.route(`**/api/demos/${demoId}`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: demoId,
        status: 'done',
        metadata: { map: 'de_dust2' },
        results: { players: [] },
      }),
    })
  })
})

test('desktop viewer renders map timeline and nonblank canvas', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`/results/${demoId}`)

  await expect(page.getByTestId('demo-viewer')).toBeVisible()
  await expect(page.getByTestId('demo-map-canvas')).toBeVisible()
  await expect(page.getByTestId('demo-timeline')).toBeVisible()

  const nonBlank = await page.getByTestId('demo-map-canvas').evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    const data = ctx.getImageData(20, 20, 1, 1).data
    return data[0] !== 0 || data[1] !== 0 || data[2] !== 0
  })
  expect(nonBlank).toBeTruthy()
})

test('tablet viewport keeps controls usable', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 })
  await page.goto(`/results/${demoId}`)

  await expect(page.getByText('Viewer')).toBeVisible()
  await expect(page.getByText('Heatmap')).toBeVisible()
  await expect(page.getByLabel('Round selector')).toBeVisible()
})

test('playback controls change current tick annotation', async ({ page }) => {
  await page.goto(`/results/${demoId}`)
  await page.getByLabel('Play playback').click()
  await expect(page.getByText(/tick/)).toBeVisible()
})
