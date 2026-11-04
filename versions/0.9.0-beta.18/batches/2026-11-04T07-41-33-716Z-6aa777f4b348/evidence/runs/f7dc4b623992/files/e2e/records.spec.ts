import { expect, test } from '@playwright/test'
import { boardPairs, finishCurrentDeal, loadBoard, openReproduction } from './helpers.ts'

test('better scores replace best; equal and worse scores keep it after reload', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('neon-pairs-test.records-fixture') === 'set') return
    sessionStorage.setItem('neon-pairs-test.records-fixture', 'set')
    localStorage.setItem('neon-pairs.preferences.v1', JSON.stringify({ size: 4 }))
    localStorage.setItem('neon-pairs.best.v1', JSON.stringify({ 4: 9 }))
  })
  await page.goto('/')
  await expect(page.getByText('Best: 9', { exact: true })).toBeVisible()
  const code = 'np1-4-1'
  await loadBoard(page, code)
  await finishCurrentDeal(page, code)
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Restart' }).click()
  const [firstPair, otherPair] = boardPairs(code)
  if (!firstPair || !otherPair) throw new Error('Missing documented game pairs')
  const cards = page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button')
  await cards.nth(firstPair[0]).click()
  await cards.nth(otherPair[0]).click()
  await page.waitForTimeout(820)
  await finishCurrentDeal(page, code)
  await expect(page.getByText('Moves: 9', { exact: true })).toBeVisible()
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'New Game' }).click()
  await openReproduction(page)
  await expect(page.getByLabel('Board code')).not.toHaveValue(code)
  const freshCode = await page.getByLabel('Board code').inputValue()
  await finishCurrentDeal(page, freshCode)
  await expect(page.getByText('Moves: 8', { exact: true })).toBeVisible()
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Grid size')).toHaveValue('4')
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible()
})

test('invalid saved sizes and scores are ignored; failed loads leave preferences and unrelated keys intact', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('neon-pairs-test.invalid-fixture') === 'set') return
    sessionStorage.setItem('neon-pairs-test.invalid-fixture', 'set')
    localStorage.setItem('neon-pairs.preferences.v1', JSON.stringify({ size: 5 }))
    localStorage.setItem('neon-pairs.best.v1', JSON.stringify({ 4: 1_000_000, 6: 'invalid', 8: 999_999 }))
    localStorage.setItem('unrelated.preference', 'keep')
  })
  await page.goto('/')
  await expect(page.getByLabel('Grid size')).toHaveValue('4')
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible()
  await page.getByLabel('Grid size').selectOption('6')
  await expect(page.getByLabel('Grid size')).toHaveValue('6')
  await openReproduction(page)
  await page.getByLabel('Board code').fill('np1-5-1')
  await page.getByRole('button', { name: 'Load board' }).click()
  await expect(page.locator('.reproduction-status')).toHaveText('Invalid board code.')
  await expect(page.getByLabel('Grid size')).toHaveValue('6')
  await page.reload()
  await expect(page.getByLabel('Grid size')).toHaveValue('6')
  await page.getByLabel('Grid size').selectOption('8')
  await expect(page.getByText('Best: 999999', { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('unrelated.preference'))).toBe('keep')
})
