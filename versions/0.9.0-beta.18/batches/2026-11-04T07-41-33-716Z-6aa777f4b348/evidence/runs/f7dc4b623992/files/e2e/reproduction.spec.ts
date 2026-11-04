import { expect, test } from '@playwright/test'
import { boardPairs, captureAnnouncements, completedSnapshot, installTestClock, loadBoard, openReproduction, pauseTestClock, snapshotWithMismatch } from './helpers.ts'

test('unfinished snapshots pause, block activation, keep focus movement and resume the remaining mismatch', async ({ page }) => {
  await installTestClock(page)
  await page.goto('/')
  await pauseTestClock(page)
  await openReproduction(page)
  await page.getByLabel('Snapshot JSON').fill(snapshotWithMismatch('np1-4-1', 300))
  await page.getByRole('button', { name: 'Load snapshot' }).click()
  await expect(page.getByText('Loaded snapshot. Select Resume to continue.', { exact: true })).toBeVisible()
  const cards = page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button')
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /revealed$/)
  await cards.nth(2).click()
  await expect(cards.nth(2)).toHaveAttribute('aria-label', 'Row 1, column 3, closed')
  await cards.nth(2).focus()
  await page.keyboard.press('ArrowRight')
  await expect(cards.nth(3)).toBeFocused()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(cards.nth(3)).toBeFocused()
  await page.clock.runFor(299)
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /revealed$/)
  await page.clock.runFor(1)
  await expect(cards.nth(0)).toHaveAttribute('aria-label', 'Row 1, column 1, closed')
  await expect(cards.nth(1)).toHaveAttribute('aria-label', 'Row 1, column 2, closed')
})

test('completed snapshot imports stay static and preserve the saved best', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('neon-pairs.best.v1', JSON.stringify({ 4: 9 })))
  await page.goto('/')
  await openReproduction(page)
  await page.getByLabel('Snapshot JSON').fill(completedSnapshot('np1-4-1', 8))
  await page.getByRole('button', { name: 'Load snapshot' }).click()
  await expect(page.locator('.reproduction-status')).toHaveText('Loaded completed snapshot.')
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0)
  await expect(page.locator('.win-banner')).toHaveClass(/static/)
  await expect(page.getByText('Best: 9', { exact: true })).toBeVisible()
  await expect.poll(() => page.locator('.win-banner').evaluate((node) => node.getAnimations().length)).toBe(0)
  const saved = await page.evaluate(() => localStorage.getItem('neon-pairs.best.v1'))
  expect(saved).toBe(JSON.stringify({ 4: 9 }))
})

test('a resumed win still completes at the move and clock caps and announces both outcomes once', async ({ page }) => {
  const pairs = boardPairs('np1-4-1')
  const finalPair = pairs.at(-1)
  if (!finalPair) throw new Error('Missing board pair')
  const matched = pairs.slice(0, -1).flatMap(([first, second]) => [first, second])
  const snapshot = JSON.stringify({
    version: 1, boardCode: 'np1-4-1', matched,
    selection: { kind: 'one', index: finalPair[0] },
    moves: 999_999, elapsedMs: 359_999_999, started: true,
  })
  await installTestClock(page)
  await page.goto('/')
  await pauseTestClock(page)
  await openReproduction(page)
  await page.getByLabel('Snapshot JSON').fill(snapshot)
  await page.getByRole('button', { name: 'Load snapshot' }).click()
  await expect(page.getByText('Moves: 999999', { exact: true })).toBeVisible()
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible()
  await page.clock.runFor(250)
  await page.getByRole('button', { name: 'Resume' }).click()
  await page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button').nth(finalPair[1]).click()
  await page.clock.runFor(50)
  await expect(page.getByText('Pairs: 8/8', { exact: true })).toBeVisible()
  await expect(page.getByText('Moves: 999999', { exact: true })).toBeVisible()
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible()
  await expect(page.locator('[role="status"]')).toHaveText('Pair found. All pairs found in 999999 moves and 5999:59.')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('neon-pairs.best.v1'))).toBe(JSON.stringify({ 4: 999_999 }))
})

test('local HTTP preferences persist a chosen size and a new load starts a fresh deal', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('Grid size')).toHaveValue('4')
  await page.getByLabel('Grid size').selectOption('8')
  await expect(page.getByLabel('Grid size')).toHaveValue('8')
  const firstCode = await page.getByLabel('Board code').inputValue()
  await page.reload()
  await expect(page.getByLabel('Grid size')).toHaveValue('8')
  await expect(page.getByLabel('Board code')).not.toHaveValue(firstCode)
})

test('play continues when browser storage operations throw', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', { value: () => { throw new Error('storage blocked') } })
    Object.defineProperty(Storage.prototype, 'setItem', { value: () => { throw new Error('storage blocked') } })
  })
  await page.goto('/')
  await page.getByLabel('Grid size').selectOption('6')
  await expect(page.getByLabel('Grid size')).toHaveValue('6')
  const board = page.getByRole('group', { name: '6 by 6 card board' }).getByRole('button')
  await board.nth(0).click()
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
})

test('consecutive identical misses each announce once; closing, clock and focus add no result', async ({ page }) => {
  await captureAnnouncements(page)
  await installTestClock(page)
  await page.goto('/')
  await pauseTestClock(page)
  await loadBoard(page)
  await page.clock.runFor(250)
  const cards = page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button')
  const misses: readonly [number, number][] = [[0, 1], [2, 3]]
  for (const [first, second] of misses) {
    await cards.nth(first).click()
    await cards.nth(second).click()
    await page.clock.runFor(800)
  }
  await page.clock.runFor(500)
  const logValue = await page.locator('html').getAttribute('data-test-announcements')
  expect(logValue).not.toBeNull()
  const messages: unknown = JSON.parse(logValue ?? '[]')
  if (!Array.isArray(messages)) throw new Error('Announcement capture must be a list')
  const typedMessages: unknown[] = messages
  expect(typedMessages.filter((message: unknown) => message === 'No match. Cards close after a short pause.')).toHaveLength(2)
})

test('hiding the page pauses an unfinished mismatch and elapsed time', async ({ page }) => {
  await installTestClock(page)
  await page.addInitScript(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => document.documentElement.dataset.testHidden === 'true',
    })
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => document.documentElement.dataset.testHidden === 'true' ? 'hidden' : 'visible',
    })
  })
  await page.goto('/')
  await pauseTestClock(page)
  await loadBoard(page)
  const cards = page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button')
  await cards.nth(0).click()
  await page.clock.runFor(500)
  await cards.nth(1).click()
  await page.clock.runFor(300)
  await page.evaluate(() => {
    document.documentElement.dataset.testHidden = 'true'
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => page.evaluate(() => document.hidden)).toBe(true)
  await page.clock.runFor(1_500)
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /revealed$/)
  await page.evaluate(() => {
    delete document.documentElement.dataset.testHidden
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => page.evaluate(() => document.hidden)).toBe(false)
  await page.clock.runFor(499)
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /revealed$/)
  await page.clock.runFor(1)
  await expect(cards.nth(0)).toHaveAttribute('aria-label', 'Row 1, column 1, closed')
  await expect(page.getByText('Time: 0:01', { exact: true })).toBeVisible()
})

