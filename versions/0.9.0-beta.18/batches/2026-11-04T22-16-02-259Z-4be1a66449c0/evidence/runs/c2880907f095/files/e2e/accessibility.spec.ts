import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expectFocusedCard, moveTo } from './helpers';

const DECK = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
const PAIRS = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]] as const;

test('keyboard and accessibility tree support a complete 4x4 game', async ({ page, browser }, testInfo) => {
  await page.goto('/');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  const newGame = page.getByRole('button', { name: 'New Game' });
  await newGame.focus();
  await page.keyboard.press('Enter');
  const restart = page.getByRole('button', { name: 'Restart' });
  await restart.focus();
  await page.keyboard.press('Tab');
  await expectFocusedCard(page, 0, 4);
  await page.keyboard.press('Shift+Tab');
  await expect(restart).toBeFocused();

  const summary = page.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  const boardCode = page.getByLabel('Board code');
  await boardCode.fill('np1-4-1');
  const loadBoard = page.getByRole('button', { name: 'Load board' });
  await loadBoard.focus();
  await page.keyboard.press('Enter');
  await expect(boardCode).toHaveValue('np1-4-1');
  await expect(loadBoard).toBeFocused();
  for (let index = 0; index < 3; index += 1) await page.keyboard.press('Shift+Tab');
  await expectFocusedCard(page, 0, 4);
  await page.keyboard.press('ArrowLeft');
  await expectFocusedCard(page, 0, 4);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Row 1, column 1, cyan solid plus, marker top, revealed' })).toBeFocused();
  await moveTo(page, 0, 11, 4);
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Row 3, column 4, cyan solid plus, marker top, matched' })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('status')).toHaveText('Pair found. 1 pair matched.');

  const earlyTree = await page.locator('body').ariaSnapshot();
  expect(earlyTree).toContain('Row 1, column 1, cyan solid plus, marker top, matched');
  expect(earlyTree).toContain('Pair found. 1 pair matched.');
  let current = 11;
  for (let pairIndex = 1; pairIndex < PAIRS.length; pairIndex += 1) {
    const pair = PAIRS[pairIndex];
    if (!pair) continue;
    const [first, second] = pair;
    await moveTo(page, current, first, 4);
    await page.keyboard.press(pairIndex % 2 === 0 ? 'Space' : 'Enter');
    await moveTo(page, first, second, 4);
    await page.keyboard.press(pairIndex % 2 === 0 ? 'Enter' : 'Space');
    current = second;
    await expect(page.locator('.game-stats')).toContainText(`Pairs: ${pairIndex + 1}/8`);
    if (pairIndex === 7) {
      await expect(page.getByRole('status')).toHaveText(/^Pair found\. All pairs found in 8 moves and \d+:\d{2}\.$/);
    } else await expect(page.getByRole('status')).toHaveText(`Pair found. ${pairIndex + 1} pairs matched.`);
  }
  for (const [first, second] of PAIRS) expect(DECK[first]).toBe(DECK[second]);
  await expect(page.getByRole('status')).toHaveText(/^Pair found\. All pairs found in 8 moves and \d+:\d{2}\.$/);
  await expect(page.locator('.win-banner')).toContainText('All pairs found!');
  await expect(page.locator('.game-stats')).toContainText('Moves: 8');

  const completeTree = await page.locator('body').ariaSnapshot();
  expect(completeTree).toContain('All pairs found!');
  const evidence = [
    'Playwright: 1.64.1',
    `Browser: Chromium ${browser.version()}`,
    'Screen reader used: no (browser accessibility tree captured for automated evidence)',
    '', 'During play:', earlyTree, '', 'After the final match:', completeTree,
  ].join('\n');
  await mkdir(resolve('artifacts'), { recursive: true });
  await writeFile(resolve('artifacts/accessibility-tree.txt'), evidence, 'utf8');
  await testInfo.attach('accessibility-tree.txt', { body: Buffer.from(evidence), contentType: 'text/plain' });

  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(restart).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(newGame).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.game-stats')).toContainText('Moves: 0');
  await expect(page.locator('.game-stats')).toContainText('Pairs: 0/8');
  await expect(page.locator('.game-stats')).toContainText('Best: 8');
  await page.reload();
  await expect(page.locator('.game-stats')).toContainText('Best: 8');
});
