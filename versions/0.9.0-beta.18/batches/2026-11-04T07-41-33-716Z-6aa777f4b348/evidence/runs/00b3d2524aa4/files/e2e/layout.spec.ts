import { mkdir } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { activatePairsWithMouse, loadBoard, pairsFor, snapshotFromTextarea, finishedSnapshot } from './fixtures.ts'

async function focusByArrows(page: import('@playwright/test').Page, target: number, side: number): Promise<void> {
  let current = 0
  await page.locator('.card').nth(0).focus()
  await page.keyboard.press('ArrowLeft')
  while (current % side < target % side) { await page.keyboard.press('ArrowRight'); current += 1 }
  while (current % side > target % side) { await page.keyboard.press('ArrowLeft'); current -= 1 }
  while (Math.floor(current / side) < Math.floor(target / side)) { await page.keyboard.press('ArrowDown'); current += side }
  while (Math.floor(current / side) > Math.floor(target / side)) { await page.keyboard.press('ArrowUp'); current -= side }
}

async function measureFocus(page: import('@playwright/test').Page, index: number) {
  return page.locator('.card').nth(index).evaluate((card) => {
    const area = document.querySelector<HTMLElement>('.board-scroll')
    if (area === null) throw new Error('Board area must exist')
    const cardRect = card.getBoundingClientRect()
    const areaRect = area.getBoundingClientRect()
    const style = getComputedStyle(card)
    const extent = Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset)
    return {
      width: cardRect.width,
      height: cardRect.height,
      outlineWidth: style.outlineWidth,
      outlineOffset: style.outlineOffset,
      withinScrollArea: cardRect.left - extent >= areaRect.left + area.clientLeft
        && cardRect.top - extent >= areaRect.top + area.clientTop
        && cardRect.right + extent <= areaRect.right - area.clientLeft
        && cardRect.bottom + extent <= areaRect.bottom - area.clientTop,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }
  })
}

test('fits and scrolls a 16x16 grid at phone and desktop viewport widths', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  await loadBoard(page, 'np1-16-1')
  await expect(page.locator('.card')).toHaveCount(256)
  const scrollArea = page.locator('.board-scroll')
  await expect.poll(() => page.locator('.card').nth(0).evaluate((card) => card.getBoundingClientRect().width)).toBe(44)
  await expect.poll(async () => (await scrollArea.boundingBox())?.height ?? 0).toBeLessThanOrEqual(560)

  for (const index of [0, 127, 255]) {
    await focusByArrows(page, index, 16)
    const measured = await measureFocus(page, index)
    expect(measured.outlineWidth).toBe('3px')
    expect(measured.outlineOffset).toBe('2px')
    expect(measured.withinScrollArea).toBe(true)
    expect(measured.pageWidth).toBeLessThanOrEqual(measured.viewportWidth)
  }
  await mkdir('evidence', { recursive: true })
  await page.screenshot({ path: 'evidence/phone-16x16.png', fullPage: true })

  await page.setViewportSize({ width: 1280, height: 800 })
  await expect.poll(() => page.locator('.card').nth(0).evaluate((card) => card.getBoundingClientRect().width)).toBeGreaterThan(44)
  await expect(page.locator('.card')).toHaveCount(256)
  await focusByArrows(page, 255, 16)
  expect((await measureFocus(page, 255)).withinScrollArea).toBe(true)
  await page.screenshot({ path: 'evidence/desktop-16x16.png', fullPage: true })
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible()
})

test('keeps 4x4 and 16x16 readable and playable at equivalent 200 percent zoom', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 })
  try {
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4173/')
    expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2)
    await loadBoard(page, 'np1-4-1')
    const status = page.getByRole('region', { name: 'Game status' })
    await expect(page.locator('.card')).toHaveCount(16)
    await expect(page.locator('.card').nth(0)).toHaveCSS('width', '88px')
    const firstGrid = page.locator('.card')
    await firstGrid.nth(0).focus()
    await page.keyboard.press('ArrowRight')
    await expect(firstGrid.nth(1)).toBeFocused()
    await expect(status).toContainText('Moves: 0')
    for (const index of [0, 8, 15]) {
      await focusByArrows(page, index, 4)
      expect((await measureFocus(page, index)).withinScrollArea).toBe(true)
    }
    await firstGrid.nth(0).click()
    await expect(firstGrid.nth(0)).toHaveAttribute('aria-label', /revealed$/)
    await focusByArrows(page, 11, 4)
    await page.keyboard.press('Space')
    await expect(status).toContainText('Pairs: 1/8')
    await activatePairsWithMouse(page, pairsFor('np1-4-1'))
    await expect(page.locator('.win-banner')).toContainText('All pairs found in 8 moves and')
    const blocks = await page.locator('.game-shell > :not(.live-announcement)').evaluateAll((items) => items.map((item) => {
      const box = item.getBoundingClientRect()
      return { top: box.top, bottom: box.bottom, hidden: getComputedStyle(item).position === 'absolute' }
    }).filter((item) => !item.hidden))
    for (let index = 1; index < blocks.length; index += 1) {
      const previous = blocks[index - 1]
      const current = blocks[index]
      if (previous === undefined || current === undefined) throw new Error('Adjacent layout blocks must exist')
      expect(previous.bottom).toBeLessThanOrEqual(current.top)
    }
    await page.setViewportSize({ width: 640, height: 400 })
    await page.screenshot({ path: 'evidence/zoom-4x4.png', fullPage: true })
    await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible()

    await page.getByLabel('Grid size').selectOption('16')
    await expect(page.locator('.card')).toHaveCount(256)
    await expect.poll(() => page.locator('.card').nth(0).evaluate((card) => card.getBoundingClientRect().width)).toBe(44)
    await page.locator('.card').nth(0).focus()
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('.card').nth(16)).toBeFocused()
    await expect(status).toContainText('Moves: 0')
    await expect(status).toContainText('Pairs: 0/128')
    await page.locator('.card').nth(16).click()
    await expect(page.locator('.card').nth(16)).toHaveAttribute('aria-label', /revealed$/)
    await snapshotFromTextarea(page, finishedSnapshot('np1-16-1', 128, 37000))
    await expect(page.locator('.win-banner')).toContainText('All pairs found in 128 moves and 0:37.')
    await expect(page.getByRole('button', { name: 'Resume' })).toBeHidden()
    const zoomBlocks = await page.locator('.game-shell > :not(.live-announcement)').evaluateAll((items) => items.map((item) => {
      const box = item.getBoundingClientRect()
      return { top: box.top, bottom: box.bottom, hidden: getComputedStyle(item).position === 'absolute' }
    }).filter((item) => !item.hidden))
    for (let index = 1; index < zoomBlocks.length; index += 1) {
      const previous = zoomBlocks[index - 1]
      const current = zoomBlocks[index]
      if (previous === undefined || current === undefined) throw new Error('Adjacent layout blocks must exist')
      expect(previous.bottom).toBeLessThanOrEqual(current.top)
    }
    await page.screenshot({ path: 'evidence/zoom-16x16.png', fullPage: true })
    const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }))
    expect(widths.page).toBeLessThanOrEqual(widths.viewport)
    await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible()
  } finally {
    await context.close()
  }
})
