import { expect, test } from '@playwright/test'
import { finishedSnapshot, openReproduction, pairsFor, snapshotFromTextarea } from './fixtures.ts'

test('uses the documented controls, preserves drafts, and exports without changing play', async ({ page }) => {
  await page.clock.pauseAt(new Date('2025-01-01T00:00:00Z'))
  await page.goto('/')
  const panel = page.locator('details.reproduction-panel')
  await expect(panel).not.toHaveAttribute('open', '')
  await expect(panel.locator('summary')).toHaveText('Reproduce a game')
  await expect(page.getByLabel('Grid size').locator('option')).toHaveText(['4x4', '6x6', '8x8', '10x10', '12x12', '14x14', '16x16'])
  await openReproduction(page)
  const code = page.getByLabel('Board code')
  const snapshot = page.getByLabel('Snapshot JSON')
  await expect(code).toHaveAttribute('maxlength', '32')
  await expect(snapshot).toHaveAttribute('maxlength', '65536')

  await code.fill(' np1-4-1 ')
  await page.getByRole('button', { name: 'Load board' }).click()
  await expect(code).toHaveValue('np1-4-1')
  await expect(page.getByLabel('Grid size')).toHaveValue('4')
  await expect(page.locator('.reproduction-status')).toHaveText('Board loaded.')
  const draft = 'np1-4-2'
  await code.fill(draft)
  await page.locator('.card').nth(0).click()
  await expect(code).toHaveValue(draft)
  await page.clock.runFor(1200)
  const beforeTime = await page.locator('.game-status').innerText()
  const exportButton = page.getByRole('button', { name: 'Export snapshot' })
  await exportButton.click()
  await expect(exportButton).toBeFocused()
  const exported = await snapshot.inputValue()
  expect(exported).toContain('\n  "version": 1')
  expect(exported).toContain('"elapsedMs": 1200')
  expect(await page.locator('.game-status').innerText()).toBe(beforeTime)

  const [first, second] = pairsFor('np1-4-1')[0] ?? []
  const different = pairsFor('np1-4-1')[1]?.[0]
  if (first === undefined || second === undefined || different === undefined) throw new Error('Test pairs must exist')
  await page.locator('.card').nth(second).click()
  await page.locator('.card').nth(different).click()
  await exportButton.click()
  expect(await snapshot.inputValue()).toMatch(/"remainingMs": [1-9]\d*/)

  await snapshotFromTextarea(page, '{')
  await expect(page.getByRole('button', { name: 'Load snapshot' })).toBeFocused()
})

test('imports completed progress without a celebration, best update, or Resume', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('neon-pairs.preferences.v1', JSON.stringify({ version: 1, size: 4, bests: { 4: 9 } })))
  await page.goto('/')
  await openReproduction(page)
  const savedBefore = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))
  await snapshotFromTextarea(page, finishedSnapshot('np1-4-1', 8, 3500))
  const status = page.getByRole('region', { name: 'Game status' })
  await expect(page.locator('.reproduction-status')).toHaveText('Loaded completed snapshot.')
  await expect(page.locator('.live-announcement')).toHaveText('Loaded completed snapshot.')
  await expect(page.getByRole('button', { name: 'Resume' })).toBeHidden()
  await expect(page.locator('.win-banner')).toContainText('All pairs found in 8 moves and 0:03.')
  await expect(page.locator('.win-banner')).not.toHaveClass(/win-banner--pulse/)
  await expect(status).toContainText('Best: 9')
  const savedAfter = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))
  expect(savedAfter).toBe(savedBefore)
})
