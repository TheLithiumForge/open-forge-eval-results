import { expect, test } from '@playwright/test'
import { mismatchSnapshot, openReproduction, pairsFor, snapshotFromTextarea } from './fixtures.ts'

test('pauses an imported mismatch, blocks play, and resumes at the remembered focus', async ({ page }) => {
  await page.clock.pauseAt(new Date('2025-01-01T00:00:00Z'))
  await page.goto('/')
  await snapshotFromTextarea(page, mismatchSnapshot('np1-4-1', 300, 1000))
  await expect(page.locator('.reproduction-status')).toHaveText('Loaded snapshot. Select Resume to continue.')
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await expect(page.getByText('Moves: 1')).toBeVisible()
  await expect(page.getByText('Time: 0:01')).toBeVisible()

  const cards = page.locator('.card')
  const firstPair = pairsFor('np1-4-1')[0]
  const secondPair = pairsFor('np1-4-1')[1]
  if (firstPair === undefined || secondPair === undefined) throw new Error('Test pairs must exist')
  const first = firstPair[0]
  const second = secondPair[0]
  const openLabel = await cards.nth(first).getAttribute('aria-label')
  await cards.nth(3).click()
  await page.keyboard.press('Enter')
  await page.clock.runFor(5000)
  await expect(cards.nth(first)).toHaveAttribute('aria-label', openLabel ?? '')
  await expect(page.getByText('Time: 0:01')).toBeVisible()

  await cards.nth(5).focus()
  await page.keyboard.press('ArrowRight')
  await expect(cards.nth(6)).toBeFocused()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(cards.nth(6)).toBeFocused()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeHidden()
  await page.clock.runFor(299)
  await expect(cards.nth(first)).toHaveAttribute('aria-label', openLabel ?? '')
  await page.clock.runFor(1)
  await expect(cards.nth(first)).toHaveAttribute('aria-label', /closed$/)
  await expect(cards.nth(second)).toHaveAttribute('aria-label', /closed$/)
  await expect(page.getByText('Moves: 1')).toBeVisible()
})

test('freezes the active clock and mismatch while the page is hidden', async ({ page }) => {
  await page.clock.pauseAt(new Date('2025-01-01T00:00:00Z'))
  await page.addInitScript(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => document.documentElement.getAttribute('data-test-visibility') ?? 'visible',
    })
  })
  await page.goto('/')
  await openReproduction(page)
  await page.getByLabel('Board code').fill('np1-4-1')
  await page.getByRole('button', { name: 'Load board' }).click()
  const cards = page.locator('.card')
  await cards.nth(0).click()
  await cards.nth(1).click()
  await page.clock.runFor(250)
  const mismatchName = await cards.nth(0).getAttribute('aria-label')
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-test-visibility', 'hidden')
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.runFor(5000)
  await expect(cards.nth(0)).toHaveAttribute('aria-label', mismatchName ?? '')
  await expect(page.getByText('Time: 0:00')).toBeVisible()
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-test-visibility', 'visible')
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.runFor(549)
  await expect(cards.nth(0)).toHaveAttribute('aria-label', mismatchName ?? '')
  await page.clock.runFor(1)
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /closed$/)
})

test('restart and New Game invalidate pending mismatch callbacks', async ({ page }) => {
  await page.clock.pauseAt(new Date('2025-01-01T00:00:00Z'))
  await page.goto('/')
  await openReproduction(page)
  await page.getByLabel('Board code').fill('np1-4-1')
  await page.getByRole('button', { name: 'Load board' }).click()
  const cards = page.locator('.card')
  await cards.nth(0).click()
  await cards.nth(1).click()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByRole('button', { name: 'Restart' })).toBeFocused()
  await cards.nth(5).click()
  const afterRestart = await cards.nth(5).getAttribute('aria-label')
  await page.clock.runFor(900)
  await expect(cards.nth(5)).toHaveAttribute('aria-label', afterRestart ?? '')
  await expect(page.getByText('Moves: 0')).toBeVisible()

  await cards.nth(0).click()
  await cards.nth(1).click()
  await page.getByRole('button', { name: 'New Game' }).click()
  await expect(page.getByRole('button', { name: 'New Game' })).toBeFocused()
  await expect(page.getByLabel('Board code')).not.toHaveValue('np1-4-1')
  await cards.nth(5).click()
  const afterNewGame = await cards.nth(5).getAttribute('aria-label')
  await page.clock.runFor(900)
  await expect(cards.nth(5)).toHaveAttribute('aria-label', afterNewGame ?? '')
  await expect(page.getByText('Moves: 0')).toBeVisible()
})
