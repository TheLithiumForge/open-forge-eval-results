import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cards, frozen, loadBoard } from './gameDriver.ts';

async function move(page: Page, from: number, to: number) {
  let current = from;
  while (Math.floor(current / 4) !== Math.floor(to / 4)) {
    const down = current < to;
    await page.keyboard.press(down ? 'ArrowDown' : 'ArrowUp');
    current += down ? 4 : -4;
  }
  while (current !== to) {
    await page.keyboard.press(current < to ? 'ArrowRight' : 'ArrowLeft');
    current += current < to ? 1 : -1;
  }
}

test('complete keyboard journey with accessibility tree evidence', async ({ page, browser }) => {
  await frozen(page);
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.getByLabel('Grid size').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await loadBoard(page);
  const evidence = [`Playwright 1.64.1; Chromium ${browser.version()}; no screen reader used.`, await page.locator('main').ariaSnapshot()];
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(cards(page).nth(0)).toBeFocused();
  let current = 0;
  const literalPairs = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]];
  for (const [turn, pair] of literalPairs.entries()) {
    for (const index of pair) {
      await move(page, current, index);
      current = index;
      await expect(cards(page).nth(index)).toHaveAccessibleName(/closed$/);
      await page.keyboard.press(index % 2 === 0 ? 'Enter' : 'Space');
      evidence.push(`Turn ${turn + 1}, index ${index}:\n${await cards(page).nth(index).ariaSnapshot()}`);
    }
    await expect(cards(page).nth(current)).toHaveAttribute('aria-disabled', 'true');
    evidence.push(await page.locator('[aria-live]').ariaSnapshot());
  }
  await expect(page.locator('[aria-live]')).toHaveText('Pair found. All pairs found in 8 moves and 0:00.');
  evidence.push(`Completed:\n${await page.locator('main').ariaSnapshot()}`);
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(current)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/keyboard-accessibility.txt', evidence.join('\n\n'));
});

test('one remembered tab stop, row edges and unrelated keys leave play unchanged', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(3).focus();
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(3)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(7)).toBeFocused();
  await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.press('a');
  await expect(cards(page).nth(7)).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(7)).toBeFocused();
});
