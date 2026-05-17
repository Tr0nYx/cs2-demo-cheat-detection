import { expect, test } from '@playwright/test'

const demoId = '11111111-1111-7111-8111-111111111111'

test.beforeEach(async ({ page }) => {
  await page.route(`**/api/demos/${demoId}`, async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: demoId, status: 'done', metadata: { map: 'de_dust2' }, results: { overall_score: 0.4, players: [] } }) })
  })
  await page.route('**/api/demos/**/trace', async (route) => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/demos/**/rounds', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ rounds: [{ round_number: 1, start_tick: 100, end_tick: 240, winner: 'CT', end_reason: null, duration_ms: 1000, kills: 1, first_kill_tick: 150, bomb_planted: false }] }) })
  })
  await page.route('**/api/demos/**/events**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        kills: [{
          round_number: 1,
          tick: 150,
          attacker: { steam_id: 'p1', name: 'CT One', position: { x: -2476, y: 3239, z: null } },
          victim: { steam_id: 'p2', name: 'T One', position: { x: -2400, y: 3200, z: null } },
          weapon: 'ak47',
          headshot: true,
          review_signal: { suspicion_score: 0.82, flag_reasons: ['snap_ratio'] },
        }],
        grenades: [
          { round_number: 1, tick: 130, time_ms: 1000, thrower: { steam_id: 'p1', name: 'CT One' }, type: 'smoke', start: { x: -2476, y: 3239, z: 0 }, end: { x: -2400, y: 3200, z: 0 }, end_map_px: 100, end_map_py: 100, trajectory: [] },
          { round_number: 1, tick: 180, time_ms: 2000, thrower: { steam_id: 'p2', name: 'T One' }, type: 'flash', start: { x: -2476, y: 3239, z: 0 }, end: { x: -2200, y: 3100, z: 0 }, end_map_px: 300, end_map_py: 300, trajectory: [] },
        ],
        damage: [],
      }),
    })
  })
  await page.route('**/api/demos/**/ticks**', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'ready', from_tick: 100, to_tick: 240, step: 4, ticks: [{ tick: 100, players: [{ steam_id: 'p1', name: 'CT One', team: 'CT', x: -2476, y: 3239, yaw: 0, alive: true }, { steam_id: 'p2', name: 'T One', team: 'T', x: -2400, y: 3200, yaw: 180, alive: true }], grenades: [] }] }) })
  })
})

test('flagged kill review seeks before the selected event', async ({ page }) => {
  await page.goto(`/results/${demoId}`)
  await expect(page.getByTestId('suspicion-panel')).toContainText('snap_ratio')

  await page.getByRole('button', { name: 'Review' }).click()

  await expect(page.getByText(/tick 118/)).toBeVisible()
})

test('grenade inspector filters utility and similar throws', async ({ page }) => {
  await page.goto(`/results/${demoId}`)
  await expect(page.getByTestId('grenade-inspector')).toContainText('smoke')

  await page.getByLabel('Grenade type filter').selectOption('flash')
  await expect(page.getByTestId('grenade-inspector')).toContainText('flash')
  await expect(page.getByText('tick 130')).not.toBeVisible()

  await page.getByText('Find similar throws').click()
  await expect(page.getByTestId('grenade-inspector')).toBeVisible()
})

test('review UI avoids proof and enforcement language', async ({ page }) => {
  await page.goto(`/results/${demoId}`)
  const text = await page.getByTestId('demo-viewer').innerText()
  expect(text.toLowerCase()).not.toContain('proof')
  expect(text.toLowerCase()).not.toContain('ban')
  expect(text.toLowerCase()).not.toContain('cheater confirmed')
})
