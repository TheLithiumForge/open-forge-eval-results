import { mkdir, writeFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { pairsFor } from './fixtures.ts'

async function moveFocus(page: Page, from: number, to: number, side: number): Promise<void> {
  let current = from
  while (current % side < to % side) { await page.keyboard.press('ArrowRight'); current += 1 }
  while (current % side > to % side) { await page.keyboard.press('ArrowLeft'); current -= 1 }
  while (Math.floor(current / side) < Math.floor(to / side)) { await page.keyboard.press('ArrowDown'); current += side }
  while (Math.floor(current / side) > Math.floor(to / side)) { await page.keyboard.press('ArrowUp'); current -= side }
}

test('plays a full 4x4 keyboard journey and captures its accessibility tree', async ({ page }) => {
  await page.goto('/')
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
  const sizeSelect = page.getByLabel('Grid size')
  await sizeSelect.focus()
  await page.keyboard.press('Tab')
  const newGame = page.getByRole('button', { name: 'New Game' })
  await expect(newGame).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Restart' })).toBeFocused()
  await page.keyboard.press('Tab')
  const cards = page.locator('.card')
  await expect(cards.nth(0)).toBeFocused()
  await expect(cards.nth(0)).toHaveAttribute('tabindex', '0')
  await expect(cards.nth(1)).toHaveAttribute('tabindex', '-1')
  const initialTree = await page.getByRole('main').ariaSnapshot()
  expect(initialTree).toContain('Row 1, column 1, closed')
  expect(initialTree).toContain('Grid size')
  expect(initialTree).toContain('New Game')

  await page.keyboard.press('ArrowLeft')
  await expect(cards.nth(0)).toBeFocused()
  await page.keyboard.press('Control+ArrowRight')
  await expect(cards.nth(0)).toBeFocused()
  await page.keyboard.press('Shift+ArrowDown')
  await expect(cards.nth(0)).toBeFocused()
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText('Moves: 0')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(cards.nth(1)).toBeFocused()
  await expect(page.getByText('Moves: 0')).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.locator('details summary')).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(cards.nth(1)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.locator('details summary')).toBeFocused()
  await page.keyboard.press('Enter')
  const boardCode = page.getByLabel('Board code')
  await page.keyboard.press('Tab')
  await expect(boardCode).toBeFocused()
  await page.keyboard.press('Control+A')
  await page.keyboard.type('np1-4-1')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Load board' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Load board' })).toBeFocused()
  await expect(page.locator('.live-announcement')).toHaveText('Board loaded.')
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(cards.nth(0)).toBeFocused()
  const code = await page.getByLabel('Board code').inputValue()
  const pairs = pairsFor(code)
  const firstPair = pairs[0]
  if (firstPair === undefined) throw new Error('Test pair must exist')
  await moveFocus(page, 0, firstPair[0], 4)
  await page.keyboard.press('Space')
  const revealedName = await cards.nth(firstPair[0]).getAttribute('aria-label')
  expect(revealedName).toMatch(/^Row \d+, column \d+, .* revealed$/)
  const revealedTree = await page.getByRole('main').ariaSnapshot()
  expect(revealedTree).toContain(revealedName ?? '')
  let focused = firstPair[0]
  for (const [first, second] of pairs) {
    await moveFocus(page, focused, first, 4)
    await page.keyboard.press('Enter')
    focused = first
    await moveFocus(page, focused, second, 4)
    await page.keyboard.press('Space')
    focused = second
  }
  await expect(page.getByRole('region', { name: 'Game status' })).toContainText('Moves: 8')
  await expect(page.getByRole('region', { name: 'Game status' })).toContainText('Pairs: 8/8')
  await expect(page.locator('.live-announcement')).toContainText(/Pair found\. All pairs found in 8 moves and/)
  await expect(page.locator('.win-banner')).toContainText('All pairs found in 8 moves and')
  await expect(cards.nth(focused)).toHaveAttribute('aria-disabled', 'true')
  const finalTree = await page.getByRole('main').ariaSnapshot()
  await mkdir('evidence', { recursive: true })
  await writeFile('evidence/accessibility-journey.md', `# Automated accessibility tree evidence\n\nBrowser: Chromium 156.0.8078.4, Playwright 1.64.1.\nScreen reader used: no. Spoken-output review remains user acceptance.\n\n## Initial game tree\n\n\`\`\`yaml\n${initialTree}\n\`\`\`\n\n## Revealed card tree\n\n\`\`\`yaml\n${revealedTree}\n\`\`\`\n\n## Completed keyboard game tree\n\n\`\`\`yaml\n${finalTree}\n\`\`\`\n`)
  await page.screenshot({ path: 'evidence/keyboard-win-4x4.png', fullPage: true })

  await page.keyboard.press('Tab')
  await expect(page.locator('details summary')).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(cards.nth(focused)).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Restart' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'New Game' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Moves: 0')).toBeVisible()
})
