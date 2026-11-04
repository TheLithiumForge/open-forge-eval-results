import { expect, test } from '@playwright/test'
import { activatePairsWithMouse, loadBoard, pairsFor } from './fixtures.ts'

test('reduces card transitions and displays a static win under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await loadBoard(page, 'np1-4-1')
  await expect(page.locator('.card').nth(0)).toHaveCSS('transition-duration', '0s')
  await activatePairsWithMouse(page, pairsFor('np1-4-1'))
  const banner = page.locator('.win-banner')
  await expect(banner).toBeVisible()
  await expect(banner).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.confetti, canvas, audio')).toHaveCount(0)
})

test('plays one 600ms completion pulse and then remains static', async ({ page }) => {
  await page.goto('/')
  await loadBoard(page, 'np1-4-1')
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-test-win-pulses', '0')
    document.addEventListener('animationend', (event) => {
      if (event.animationName === 'win-pulse') {
        const count = Number(document.documentElement.getAttribute('data-test-win-pulses') ?? '0')
        document.documentElement.setAttribute('data-test-win-pulses', String(count + 1))
      }
    })
  })
  await activatePairsWithMouse(page, pairsFor('np1-4-1'))
  const banner = page.locator('.win-banner')
  await expect(banner).toHaveCSS('animation-name', 'win-pulse')
  await expect(banner).toHaveCSS('animation-duration', '0.6s')
  await expect(banner).toHaveCSS('animation-iteration-count', '1')
  await expect(page.locator('html')).toHaveAttribute('data-test-win-pulses', '1', { timeout: 1500 })
  expect(await banner.evaluate((element) => element.getAnimations().length)).toBe(0)
  const notice = await page.locator('.live-announcement').innerText()
  await page.keyboard.press('Tab')
  await expect(page.locator('.live-announcement')).toHaveText(notice)
  expect(await banner.evaluate((element) => element.getAnimations().length)).toBe(0)
})
