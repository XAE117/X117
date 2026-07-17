import { expect, test } from '@playwright/test'

const routes = [
  '',
  'tonight',
  'by-theater',
  'map',
  'jazz',
  'jazz/tonight',
  'jazz/by-venue',
  'jazz/map',
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
