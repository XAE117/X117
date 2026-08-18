import { expect, test } from '@playwright/test'

const IOS_URL = 'http://127.0.0.1:4173/X117/ios.html'

async function expectUsableVisibleControls(page) {
  const issues = await page.locator('button:visible, a:visible').evaluateAll(elements => elements
    .map(element => {
      const bounds = element.getBoundingClientRect()
      const name = (element.getAttribute('aria-label') || element.innerText || element.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
      return {
        name,
        height: bounds.height,
        width: bounds.width,
        tag: element.tagName.toLowerCase(),
      }
    })
    .filter(control => !control.name || control.height < 44 || control.width < 44),
  )

  expect(issues).toEqual([])
}

test.describe('SIXPM iPhone shell', () => {
  test('renders the rights-gated directory with accessible field navigation', async ({ page }) => {
    await page.goto(IOS_URL, { waitUntil: 'networkidle' })

    const main = page.getByRole('main')
    const fieldIndex = page.getByRole('navigation', { name: 'SIXPM field index' })
    const tabs = fieldIndex.getByRole('button')

    await expect(main).toBeVisible()
    await expect(page.getByText("AMC / TONIGHT'S PROGRAM")).toBeVisible()
    await expect(tabs).toHaveCount(4)
    await expect(fieldIndex.getByRole('button', { name: 'Tonight' })).toHaveAttribute('aria-current', 'page')

    for (const tab of await tabs.all()) {
      const box = await tab.boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }

    await fieldIndex.getByRole('button', { name: 'Catalog' }).click()
    await expect(main).toBeFocused()
    await expect(fieldIndex.getByRole('button', { name: 'Catalog' })).toHaveAttribute('aria-current', 'page')
  })

  test('keeps catalog response failures clear and non-technical', async ({ page }) => {
    await page.route('**/catalog/v1/index.json', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><title>SIXPM</title>',
    }))

    await page.goto(IOS_URL, { waitUntil: 'networkidle' })

    await expect(page.getByRole('heading', { name: 'Catalog unavailable.' })).toBeVisible()
    await expect(page.getByText('SIXPM could not verify a current catalog. Check your connection and try again.')).toBeVisible()
    await expect(page.locator('#root')).not.toContainText('Catalog response was not JSON')
    await expect(page.getByRole('navigation', { name: 'SIXPM field index' })).toBeVisible()

    await page.getByRole('button', { name: 'Notes', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Keep it simple.' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Policies + support' })).toBeVisible()
  })

  test('honors the reduced-motion preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(IOS_URL, { waitUntil: 'networkidle' })

    await expect(page.getByRole('main')).toBeVisible()
    const motion = await page.getByRole('button').first().evaluate(element => {
      const style = getComputedStyle(element)
      return {
        transition: Number.parseFloat(style.transitionDuration),
        animation: Number.parseFloat(style.animationDuration),
      }
    })
    expect(motion.transition).toBeLessThanOrEqual(0.01)
    expect(motion.animation).toBeLessThanOrEqual(0.01)
  })

  test('keeps named regions and touch-safe labeled controls across the directory', async ({ page }) => {
    await page.goto(IOS_URL, { waitUntil: 'networkidle' })

    await expect(page.getByRole('region', { name: /Tonight.?s film|Next up/ })).toBeVisible()
    await expect(page.getByRole('region', { name: /Dinner/ })).toBeVisible()
    await expectUsableVisibleControls(page)

    await page.getByRole('button', { name: 'Catalog' }).click()
    await expect(page.getByRole('group', { name: 'Catalog type' })).toBeVisible()
    await expectUsableVisibleControls(page)

    await page.getByRole('button', { name: 'Notes' }).click()
    await expect(page.getByRole('region', { name: 'Policies + support' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'On-device data' })).toBeVisible()
    await expectUsableVisibleControls(page)
  })
})
