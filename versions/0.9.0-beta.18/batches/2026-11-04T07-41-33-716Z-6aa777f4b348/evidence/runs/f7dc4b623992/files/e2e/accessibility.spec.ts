import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { boardPairs, captureAnnouncements, faceNamesByPosition, loadBoard } from './helpers.ts'

test('complete 4x4 keyboard journey and save the resulting accessibility tree', async ({ page, browser }) => {
  await captureAnnouncements(page)
  await page.goto('/')
  await loadBoard(page)
  await page.getByLabel('Grid size').focus()
  await expect(page.getByLabel('Grid size')).toHaveValue('4')
  await expect(page.getByLabel('Grid size')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'New Game' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Restart' })).toBeFocused()
  await page.keyboard.press('Tab')

  const cards = page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button')
  await expect(cards.nth(0)).toBeFocused()
  const hidden = await cards.nth(0).getAttribute('aria-label')
  expect(hidden).toBe('Row 1, column 1, closed')
  const initialTree = await page.locator('main').ariaSnapshot()

  let current = 0
  const focusCard = async (target: number): Promise<void> => {
    while (Math.floor(current / 4) > Math.floor(target / 4)) {
      await page.keyboard.press('ArrowUp')
      current -= 4
    }
    while (Math.floor(current / 4) < Math.floor(target / 4)) {
      await page.keyboard.press('ArrowDown')
      current += 4
    }
    while (current % 4 > target % 4) {
      await page.keyboard.press('ArrowLeft')
      current -= 1
    }
    while (current % 4 < target % 4) {
      await page.keyboard.press('ArrowRight')
      current += 1
    }
  }

  const positions = boardPairs('np1-4-1')
  const faceNames = faceNamesByPosition('np1-4-1')
  let firstRevealTree = ''
  for (let pair = 0; pair < positions.length; pair += 1) {
    const positionsForPair = positions[pair]
    if (!positionsForPair) throw new Error('Missing documented deal pair')
    await focusCard(positionsForPair[0])
    await page.keyboard.press('Enter')
    const revealedName = await cards.nth(positionsForPair[0]).getAttribute('aria-label')
    const expectedFace = faceNames[positionsForPair[0]]
    expect(revealedName).toContain(`${expectedFace}, revealed`)
    if (pair === 0) firstRevealTree = await page.locator('main').ariaSnapshot()
    await focusCard(positionsForPair[1])
    await page.keyboard.press('Space')
    if (pair === 0) {
      await expect(page.locator('[role="status"]')).toHaveText('Pair found. 1 pair matched.')
      const nextPair = positions[1]
      if (!nextPair) throw new Error('Missing second documented pair')
      await focusCard(nextPair[0])
      await expect(page.locator('[role="status"]')).toHaveText('Pair found. 1 pair matched.')
    }
  }

  await expect(page.getByText('Pairs: 8/8', { exact: true })).toBeVisible()
  await expect(page.getByText('Final moves: 8', { exact: false })).toBeVisible()
  const time = (await page.locator('.game-status').getByText(/^Time: /u).innerText()).slice('Time: '.length)
  const finalAnnouncement = page.locator('[role="status"]')
  await expect(finalAnnouncement).toHaveText(/^Pair found\. All pairs found in 8 moves and \d+:\d{2}\.$/u)
  const winningTree = await page.locator('main').ariaSnapshot()
  const announcementLog: unknown = await page.evaluate(() => JSON.parse(document.documentElement.dataset.testAnnouncements ?? '[]'))
  if (!Array.isArray(announcementLog)) throw new Error('Announcement capture must be a list')
  const messages: unknown[] = announcementLog
  expect(messages).toContain(`Pair found. All pairs found in 8 moves and ${time}.`)
  expect(messages.filter((message: unknown) => typeof message === 'string' && message.startsWith('Pair found. All pairs found'))).toHaveLength(1)
  await page.keyboard.press('Tab')
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Restart' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'New Game' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
  const resetTree = await page.locator('main').ariaSnapshot()

  await mkdir(resolve('evidence'), { recursive: true })
  if (!firstRevealTree) throw new Error('Missing first-reveal accessibility tree')
  await writeFile(
    resolve('evidence/accessibility-journey.txt'),
    `Playwright 1.64.1; Chromium ${browser.version()}; no screen reader used.\n\nAfter tabbing into the board, before play:\n${initialTree}\n\nAfter revealing the first card by Enter:\n${firstRevealTree}\n\nCompleted by arrows, Enter, Space and the documented board code:\n${winningTree}\n\nAfter leaving with Tab and starting another game by keyboard:\n${resetTree}\n`,
  )
})

test('board keyboard movement stops at edges, preserves matched focus, and leaves by Tab', async ({ page }) => {
  await page.goto('/')
  await loadBoard(page)
  const cards = page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button')
  await cards.nth(0).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(cards.nth(0)).toBeFocused()
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(cards.nth(1)).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(cards.nth(5)).toBeFocused()
  await page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button').nth(4).click()
  await page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button').nth(5).click()
  await expect(cards.nth(5)).toHaveAttribute('aria-disabled', 'true')
  await cards.nth(5).focus()
  await expect(cards.nth(5)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused()
})

test('hidden cards expose no face identity while pointer, hover and context menu leave state unchanged', async ({ page }) => {
  await page.goto('/')
  const card = page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button').nth(0)
  await expect(card).toHaveAttribute('aria-label', 'Row 1, column 1, closed')
  const hiddenMarkup = await card.evaluate((button) => button.outerHTML)
  expect(hiddenMarkup).not.toMatch(/face-art|cyan|chevron|faceId|data-face/u)
  await card.hover()
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
  await card.dispatchEvent('pointercancel')
  await card.click({ button: 'right' })
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
  await expect(card).toHaveAttribute('aria-label', 'Row 1, column 1, closed')
})

test('Enter and Space share card activation with pointer input', async ({ page }) => {
  await page.goto('/')
  await loadBoard(page)
  const cards = page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button')
  await cards.nth(0).focus()
  await page.keyboard.press('Enter')
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /revealed$/)
  await cards.nth(11).focus()
  await page.keyboard.press('Space')
  await expect(cards.nth(0)).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible()
})

