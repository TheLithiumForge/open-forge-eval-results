import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { card, frozenClock, KNOWN_PAIRS, loadBoard } from './gameActions.ts';
import { moveFrom } from './keyboardJourney.ts';

test('complete keyboard journey exposes positions, faces, turn results and victory in the accessibility tree', async ({ page, browser }) => {
  await frozenClock(page);
  await page.goto('/');
  await expect(page.locator('body')).toBeFocused();
  await expect(page.getByLabel('Grid size', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await loadBoard(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(card(page, 0)).toBeFocused();
  await expect(card(page, 0)).toHaveAccessibleName('Row 1, column 1, closed');
  const stages: string[] = [`Chromium ${browser.version()}; Playwright 1.64.1; no screen reader used.`,
    'Initial closed board:\n' + await page.locator('main').ariaSnapshot()];
  await page.keyboard.press('Enter');
  await expect(card(page, 0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  stages.push('First reveal:\n' + await page.locator('main').ariaSnapshot());
  let position = await moveFrom(page, 0, 11, 4);
  await page.keyboard.press('Space');
  await expect(card(page, 0)).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('[aria-live]')).toHaveText('Pair found. 1 pair matched.');
  stages.push('First match:\n' + await page.locator('main').ariaSnapshot());
  for (const pair of KNOWN_PAIRS.slice(1)) {
    for (const index of pair) {
      position = await moveFrom(page, position, index, 4);
      await page.keyboard.press('Enter');
    }
  }
  await expect(page.locator('.win-banner')).toContainText('Finished in 8 moves and 0:00.');
  await expect(page.locator('[aria-live]')).toHaveText('Pair found. All pairs found in 8 moves and 0:00.');
  stages.push('Completion:\n' + await page.locator('main').ariaSnapshot());
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.getByRole('button', { name: 'New Game', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await expect(card(page, 0)).toHaveAttribute('tabindex', '0');
  stages.push('Native Tab exit and another game:\n' + await page.locator('main').ariaSnapshot());
  await writeFile('artifacts/keyboard-accessibility.txt', stages.join('\n\n'));
});

test('roving focus stops at edges, retains matches, exits natively and ignores modifier movement', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(card(page, 0)).toBeFocused();
  await page.keyboard.press('Control+ArrowRight');
  await expect(card(page, 0)).toBeFocused();
  await page.keyboard.press('Shift+Enter');
  await expect(card(page, 0)).toHaveAccessibleName('Row 1, column 1, closed');
  await page.keyboard.press('Enter');
  await moveFrom(page, 0, 11, 4);
  await page.keyboard.press('Space');
  await expect(card(page, 11)).toBeFocused();
  await expect(card(page, 11)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(card(page, 11)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(card(page, 11)).toBeFocused();
  await loadBoard(page, 'np1-4-42');
  await expect(card(page, 0)).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
});
