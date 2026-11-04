import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, dealPairs, freezeClock, openGame } from './deal-actions.ts';
import { moveFocus } from './keyboard-actions.ts';

test('complete native keyboard journey produces accessibility-tree evidence', async ({ page, browser }) => {
  await freezeClock(page);
  await page.goto('/');
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await expect(page.getByRole('option')).toHaveText(['4x4', '6x6', '8x8', '10x10', '12x12', '14x14', '16x16']);
  await openGame(page);
  const evidence: { stage: string; tree: string }[] = [];
  const capture = async (stage: string) => { evidence.push({ stage, tree: await page.locator('body').ariaSnapshot() }); };
  await capture('hidden deal: named controls and positions');
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(cards(page).first()).toBeFocused();
  let focused = 0;
  for (const [turn, pair] of dealPairs().entries()) {
    for (const [reveal, index] of pair.entries()) {
      await moveFocus(page, focused, index, 4);
      await page.keyboard.press(reveal === 0 ? 'Enter' : 'Space');
      focused = index;
      if (turn === 0 && reveal === 0) {
        await expect(cards(page).nth(index)).toHaveAccessibleName('Row 1, column 3, cyan solid circle, marker top, revealed');
        await capture('one revealed face');
      }
    }
    await expect(cards(page).nth(focused)).toHaveAttribute('aria-disabled', 'true');
    if (turn === 0) {
      await expect(page.locator('[aria-live="polite"]')).toHaveText('Pair found. 1 pair matched.');
      await page.keyboard.press('Enter');
      await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
      await capture('first pair and one turn announcement');
    }
  }
  await expect(page.locator('[aria-live]')).toHaveCount(1);
  await expect(page.locator('[aria-live="polite"]')).toHaveAttribute('aria-atomic', 'true');
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Pair found. All pairs found in 8 moves and 0:00.');
  await expect(page.getByRole('region', { name: 'Game complete' })).toContainText('Finished in 8 moves and 0:00.');
  await capture('win, final score and combined announcement');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(focused)).toBeFocused();
  await page.getByRole('button', { name: 'New Game', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await expect(cards(page).first()).toHaveAttribute('tabindex', '0');
  await capture('another game, focus retained on New Game');
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/accessibility-tree.json', JSON.stringify({ tool: 'Playwright 1.64.1 ariaSnapshot',
    chromium: browser.version(), node: process.version, screenReaderUsed: false, evidence }, null, 2));
});

test('edges stop, board has one remembered tab stop, and native Tab leaves it', async ({ page }) => {
  await openGame(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await moveFocus(page, 0, 3, 4);
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(3)).toBeFocused();
  await moveFocus(page, 3, 15, 4);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(15)).toBeFocused();
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(15)).toBeFocused();
});
