import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { boardPairs, completedSnapshot, loadBoard, openReproduction } from './helpers.ts'

test('a 16x16 board renders 256 cards at phone and desktop widths and scrolls internally', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  await loadBoard(page, 'np1-16-1')
  const cards = page.getByRole('group', { name: '16 by 16 card board' }).getByRole('button')
  await expect(cards).toHaveCount(256)
  await expect(page.getByText('Moves:', { exact: true })).toHaveCSS('font-size', '14px')
  await expect(page.getByText('Moves:', { exact: true })).toHaveCSS('color', 'rgb(184, 189, 210)')
  await expect(page.locator('.game-status p').first()).toHaveCSS('font-size', '16px')
  const measure = async () => page.evaluate(() => {
    const board = document.querySelector<HTMLDivElement>('.board-scroll')
    const card = document.querySelector<HTMLButtonElement>('.card-button')
    if (!board || !card) throw new Error('Board is missing')
    const rect = card.getBoundingClientRect()
    const box = board.getBoundingClientRect()
    const size = Number.parseFloat(getComputedStyle(card).width)
    return {
      viewport: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      cardWidth: rect.width,
      cardHeight: rect.height,
      cardSize: size,
      boardHeight: box.height,
      boardClientHeight: board.clientHeight,
      boardScrollHeight: board.scrollHeight,
      shellWidth: document.querySelector('.game-shell')?.getBoundingClientRect().width ?? 0,
    }
  })
  const phone = await measure()
  expect(phone).toMatchObject({ viewport: 360, pageWidth: 360, cardSize: 44, cardWidth: 44, cardHeight: 44 })
  expect(phone.shellWidth).toBeLessThanOrEqual(360)
  expect(phone.boardHeight).toBeLessThanOrEqual(561)
  expect(phone.boardScrollHeight).toBeGreaterThan(phone.boardClientHeight)

  const middle = cards.nth(128)
  await middle.focus()
  const middleBox = await middle.boundingBox()
  const middleArea = await page.locator('.board-scroll').boundingBox()
  if (!middleBox || !middleArea) throw new Error('Middle focus geometry is unavailable')
  expect(middleBox.x - 5).toBeGreaterThanOrEqual(middleArea.x)
  expect(middleBox.y - 5).toBeGreaterThanOrEqual(middleArea.y)
  expect(middleBox.x + middleBox.width + 5).toBeLessThanOrEqual(middleArea.x + middleArea.width)
  expect(middleBox.y + middleBox.height + 5).toBeLessThanOrEqual(middleArea.y + middleArea.height)

  await cards.nth(255).focus()
  await expect(cards.nth(255)).toBeFocused()
  await expect.poll(() => measure()).toMatchObject({ cardWidth: 44, cardHeight: 44 })
  const focusedPhone = await cards.nth(255).boundingBox()
  const areaPhone = await page.locator('.board-scroll').boundingBox()
  if (!focusedPhone || !areaPhone) throw new Error('Focused card geometry is unavailable')
  expect(focusedPhone.x - 5).toBeGreaterThanOrEqual(areaPhone.x)
  expect(focusedPhone.x + focusedPhone.width + 5).toBeLessThanOrEqual(areaPhone.x + areaPhone.width)

  await page.setViewportSize({ width: 1280, height: 800 })
  await expect.poll(() => measure()).toMatchObject({ viewport: 1280, pageWidth: 1280 })
  const desktop = await measure()
  expect(desktop.cardSize).toBeGreaterThanOrEqual(44)
  expect(desktop.cardSize).toBeLessThanOrEqual(88)
  expect(desktop.cardWidth).toBeCloseTo(desktop.cardHeight, 0)
  expect(desktop.shellWidth).toBeLessThanOrEqual(1120)
  expect(desktop.boardHeight).toBeLessThanOrEqual(561)
  await expect(page.getByLabel('Grid size')).toBeVisible()
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible()
})

test('all 128 named faces remain visible in a grayscale 44px face sheet', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1500 })
  await page.goto('/')
  await openReproduction(page)
  await page.getByLabel('Snapshot JSON').fill(completedSnapshot('np1-16-1', 128))
  await page.getByRole('button', { name: 'Load snapshot' }).click()
  const cards = page.getByRole('group', { name: '16 by 16 card board' }).getByRole('button')
  await expect(cards).toHaveCount(256)
  await expect(page.locator('.face-art')).toHaveCount(256)
  const names = await cards.evaluateAll((buttons) => buttons.map((button) => (button.getAttribute('aria-label') ?? '')
    .replace(/^Row \d+, column \d+, /u, '')
    .replace(/, matched$/u, '')))
  expect(new Set(names).size).toBe(128)
  expect(names).toContain('magenta solid square, marker top-right')
  expect(names).toContain('magenta outline square, marker top-right')
  await page.addStyleTag({ content: '.board-scroll { max-height: none !important; overflow: visible !important; filter: grayscale(1); } .card-button { --card-size: 44px !important; } .match-check { display: none !important; } .card-button.is-matched { border-color: #757C9A !important; }' })
  await mkdir(resolve('evidence'), { recursive: true })
  await page.locator('.board-scroll').screenshot({ path: resolve('evidence/grayscale-faces.png') })
})

test('colors, hover, matched cards and reduced motion use the specified states', async ({ page }) => {
  await page.goto('/')
  await loadBoard(page)
  const cards = page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button')
  const first = cards.nth(0)
  const backColor = await first.evaluate((node) => getComputedStyle(node).backgroundColor)
  await first.hover()
  await page.waitForTimeout(150)
  await expect.poll(() => first.evaluate((node) => getComputedStyle(node).borderColor)).toBe('rgb(244, 246, 255)')
  await expect(first).toHaveCSS('background-color', backColor)
  await expect(first).toHaveCSS('transition-duration', '0.12s')
  await first.click()
  await cards.nth(11).click()
  await expect(cards.nth(11)).toHaveAttribute('aria-disabled', 'true')
  await cards.nth(11).hover()
  await expect.poll(() => cards.nth(11).evaluate((node) => getComputedStyle(node).borderColor)).toBe('rgb(139, 234, 125)')
  await expect(cards.nth(11)).toHaveCSS('opacity', '1')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(first).toHaveCSS('transition-duration', '0s')
  await page.getByRole('button', { name: 'Restart' }).click()
  for (const [left, right] of boardPairs('np1-4-1')) {
    await cards.nth(left).click()
    await cards.nth(right).click()
  }
  const banner = page.locator('.win-banner')
  await expect(banner).toHaveClass(/celebrate/u)
  await expect.poll(() => banner.evaluate((node) => node.getAnimations().length)).toBe(0)
})

test('zoom-equivalent 640x400 at device scale two keeps controls readable with both board sizes', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4173/')
  await loadBoard(page, 'np1-4-1')
  await expect(page.getByLabel('Grid size')).toBeVisible()
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(640)
  await page.getByLabel('Grid size').selectOption('16')
  const cards = page.getByRole('group', { name: '16 by 16 card board' }).getByRole('button')
  await expect(cards).toHaveCount(256)
  await cards.nth(0).focus()
  await expect(cards.nth(0)).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(cards.nth(1)).toBeFocused()
  await cards.nth(255).click()
  await expect(cards.nth(255)).toHaveAttribute('aria-label', /revealed$/u)
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible()
  await context.close()
})

test('the default completion pulse lasts once for 600ms and leaves a static banner', async ({ page }) => {
  await page.goto('/')
  await loadBoard(page, 'np1-4-1')
  const cards = page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button')
  for (const [first, second] of boardPairs('np1-4-1')) {
    await cards.nth(first).click()
    await cards.nth(second).click()
  }
  const banner = page.locator('.win-banner')
  await expect(banner).toHaveClass(/celebrate/u)
  await expect.poll(() => banner.evaluate((node) => {
    const timing = node.getAnimations()[0]?.effect?.getTiming()
    return timing ? `${timing.duration}:${timing.iterations}` : ''
  })).toBe('600:1')
  const animationFinished = await banner.evaluate((node) => {
    const animation = node.getAnimations()[0]
    if (!animation) throw new Error('Completion animation did not start')
    return animation.finished.then(() => true)
  })
  expect(animationFinished).toBe(true)
  await expect(banner).toBeVisible()
  await expect.poll(() => banner.evaluate((node) => node.getAnimations().filter((animation) => animation.playState === 'running').length)).toBe(0)
  const transform = await banner.evaluate((node) => getComputedStyle(node).transform)
  expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(transform)
})
