import { expect, test } from '@playwright/test'
import { loadBoard } from './helpers.ts'

test('a completed tap activates cards through the same action', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 360, height: 800 } })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4173/')
  await loadBoard(page)
  const cards = page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button')
  await cards.nth(4).tap()
  await cards.nth(5).tap()
  await expect(cards.nth(4)).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible()
  await context.close()
})

test('touch scrolling reaches the far edges of a 16x16 board', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 360, height: 800 } })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4173/')
  await loadBoard(page, 'np1-16-1')
  const area = page.locator('.board-scroll')
  const bounds = await area.boundingBox()
  if (!bounds) throw new Error('Board scroll area is missing')
  const cdp = await page.context().newCDPSession(page)
  const swipe = async (fromX: number, fromY: number, toX: number, toY: number): Promise<void> => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fromX, y: fromY, id: 1 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: toX, y: toY, id: 1 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const cards = page.getByRole('group', { name: '16 by 16 card board' }).getByRole('button')
  const inside = async (index: number): Promise<boolean> => cards.nth(index).evaluate((card) => {
    const areaNode = card.closest('.board-scroll')
    if (!(areaNode instanceof HTMLElement)) return false
    const cardRect = card.getBoundingClientRect()
    const areaRect = areaNode.getBoundingClientRect()
    return cardRect.left >= areaRect.left && cardRect.top >= areaRect.top
      && cardRect.right <= areaRect.right && cardRect.bottom <= areaRect.bottom
  })
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (await inside(255)) break
    await swipe(bounds.x + bounds.width - 20, bounds.y + bounds.height - 30, bounds.x + 30, bounds.y + 30)
    await page.waitForTimeout(50)
  }
  await expect.poll(() => inside(255)).toBe(true)
  await expect.poll(() => area.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0)
  await expect.poll(() => area.evaluate((node) => node.scrollTop)).toBeGreaterThan(0)
  const lastBounds = await cards.nth(255).boundingBox()
  const scrolledArea = await area.boundingBox()
  if (!lastBounds || !scrolledArea) throw new Error('Last card geometry is missing')
  expect(lastBounds.x).toBeGreaterThanOrEqual(scrolledArea.x)
  expect(lastBounds.y).toBeGreaterThanOrEqual(scrolledArea.y)
  expect(lastBounds.x + lastBounds.width).toBeLessThanOrEqual(scrolledArea.x + scrolledArea.width)
  expect(lastBounds.y + lastBounds.height).toBeLessThanOrEqual(scrolledArea.y + scrolledArea.height)
  await cards.nth(255).tap()
  await expect(cards.nth(255)).toHaveAttribute('aria-label', /revealed/u)
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (await inside(0)) break
    await swipe(bounds.x + 30, bounds.y + 30, bounds.x + bounds.width - 20, bounds.y + bounds.height - 30)
    await page.waitForTimeout(50)
  }
  await expect.poll(() => inside(0)).toBe(true)
  await cards.nth(0).tap()
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /revealed|matched/u)
  await context.close()
})
