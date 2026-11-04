import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createGame } from '../src/game/game.ts';
import { cards, frozen, keyboardTo, loadBoard } from './actions.ts';

test('complete keyboard game exposes controls, card identities, results and a win in the accessibility tree', async ({ page, browser }) => {
  await frozen(page);
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Game', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await loadBoard(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  const evidence = [`Neon Pairs automated accessibility journey\nPlaywright 1.64.1; Chromium ${browser.version()}; headless.\nNo screen reader was used. This is browser accessibility-tree evidence, not spoken-output confirmation.\nBoard: np1-4-1. All card activation below uses Enter or Space; movement uses arrows.\n`];
  evidence.push('INITIAL CLOSED BOARD\n' + await page.locator('main').ariaSnapshot());
  await page.keyboard.press('Enter');
  await expect(cards(page).nth(0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  evidence.push('FIRST REVEAL\n' + await page.locator('main').ariaSnapshot());
  await keyboardTo(page, 0, 11);
  await page.keyboard.press('Space');
  await expect(cards(page).nth(11)).toHaveAttribute('aria-disabled', 'true');
  evidence.push('FIRST MATCH\n' + await page.locator('main').ariaSnapshot());
  let current = 11;
  const game = createGame('np1-4-1');
  for (let face = 0; face < 8; face += 1) {
    if (face === 6) continue;
    const first = game.deck.indexOf(face);
    const second = game.deck.lastIndexOf(face);
    await keyboardTo(page, current, first);
    await page.keyboard.press('Enter');
    await keyboardTo(page, first, second);
    await page.keyboard.press('Space');
    current = second;
    await expect(page.locator('[aria-live]')).toHaveText(face === 7
      ? 'Pair found. All pairs found in 8 moves and 0:00.' : `Pair found. ${face + 2} pairs matched.`);
  }
  await expect(page.getByRole('region', { name: 'Game complete' })).toBeVisible();
  evidence.push('COMPLETED BOARD AND COMBINED WIN ANNOUNCEMENT\n' + await page.locator('main').ariaSnapshot());
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(current)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  evidence.push('TAB EXIT AND NEW GAME\n' + await page.locator('main').ariaSnapshot());
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/accessibility-journey.txt', evidence.join('\n\n') + '\n');
});
