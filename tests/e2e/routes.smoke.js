import { expect, test } from '@playwright/test'

const routes = [
  '',
  'browse',
  'tonight',
  'by-theater',
  'map',
  'search',
  'jazz',
  'jazz/tonight',
  'jazz/by-venue',
  'jazz/map',
  'jazz/bio',
  'food',
  'food/tacos',
  'food/map',
  'guide',
  'roll',
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('sixpm-splash-seen', '1')
  })
})

for (const route of routes) {
  test(`${route || 'home'} renders without a fatal error`, async ({ page }) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    const response = await page.goto(route, { waitUntil: 'networkidle' })

    expect(response?.ok()).toBe(true)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('#root')).not.toContainText('Something went wrong')
    await expect(page.locator('#root')).not.toContainText('Unable to load data')
    expect(pageErrors).toEqual([])
  })
}

test('food cards expose keyboard-operable disclosure controls', async ({ page }) => {
  await page.goto('food', { waitUntil: 'networkidle' })

  const firstToggle = page.getByRole('button', { name: /show details for/i }).first()
  const detailsId = await firstToggle.getAttribute('aria-controls')
  const toggle = page.locator(`[aria-controls="${detailsId}"]`)

  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.focus()
  await page.keyboard.press('Enter')

  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator(`#${detailsId}`)).toBeVisible()
})

test('cinema map waits for its styles before rendering markers', async ({ page }) => {
  await page.goto('map', { waitUntil: 'networkidle' })

  const pane = page.locator('.leaflet-pane').first()
  await expect(pane).toHaveCount(1)
  await expect(pane).toHaveCSS('position', 'absolute')
  await expect(page.locator('.leaflet-interactive').first()).toBeVisible()
})
