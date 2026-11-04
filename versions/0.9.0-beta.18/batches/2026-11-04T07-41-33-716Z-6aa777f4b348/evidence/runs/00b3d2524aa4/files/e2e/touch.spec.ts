import { expect, test } from '@playwright/test'
import { loadBoard } from './fixtures.ts'

test('touch scrolls and taps the last card on a large phone board', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true })
  try {
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4173/')
    await loadBoard(page, 'np1-16-1')
    const area = page.locator('.board-scroll')
    await area.scrollIntoViewIfNeeded()
    const rect = await area.boundingBox()
    if (rect === null) throw new Error('Board must be visible')
    const touch = await context.newCDPSession(page)
    const swipe = async () => {
      const startX = rect.x + rect.width - 14
      const startY = rect.y + rect.height - 14
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: startY, id: 1 }] })
      for (let step = 1; step <= 5; step += 1) {
        const ratio = step / 5
        const x = startX - (rect.width - 28) * ratio
        const y = startY - (rect.height - 28) * ratio
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] })
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    await swipe()
    await swipe()
    await expect.poll(() => area.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
    await expect.poll(() => area.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    const last = page.locator('.card').nth(255)
    const lastBox = await last.boundingBox()
    const areaBox = await area.boundingBox()
    if (lastBox === null || areaBox === null) throw new Error('Scrolled last card must have a box')
    expect(lastBox.x).toBeGreaterThanOrEqual(areaBox.x)
    expect(lastBox.y).toBeGreaterThanOrEqual(areaBox.y)
    await page.touchscreen.tap(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height / 2)
    await expect(last).toHaveAttribute('aria-label', /revealed$/)
    await touch.detach()
  } finally {
    await context.close()
  }
})
