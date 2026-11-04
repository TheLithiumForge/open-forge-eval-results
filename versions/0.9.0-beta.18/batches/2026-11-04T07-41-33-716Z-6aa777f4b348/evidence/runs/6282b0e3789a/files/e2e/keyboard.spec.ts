import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createGame } from '../src/game/createGame.ts';
import { cards, freezeClock, live, loadBoard } from './gameFixtures.ts';

test('complete keyboard journey exposes positions, faces, results and win in the accessibility tree', async ({ page, browser }) => {
  await freezeClock(page);
  await page.goto('/');
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
  await loadBoard(page);
  await page.getByLabel('Grid size').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  await expect(cards(page).nth(0)).toHaveAccessibleName('Row 1, column 1, closed');
  const code = await page.getByLabel('Board code', { exact: true }).inputValue();
  const game = createGame(code);
  if (!game) throw new Error('Invalid displayed code.');
  const evidence = [`Chromium ${browser.version()}, Playwright 1.64.1; keyboard only after fixture setup.`,
    'INITIAL CLOSED BOARD', await page.locator('body').ariaSnapshot()];
  let current = 0;
  const move = async (target: number) => {
    while (Math.floor(current / 4) < Math.floor(target / 4)) { await page.keyboard.press('ArrowDown'); current += 4; }
    while (Math.floor(current / 4) > Math.floor(target / 4)) { await page.keyboard.press('ArrowUp'); current -= 4; }
    while (current % 4 < target % 4) { await page.keyboard.press('ArrowRight'); current += 1; }
    while (current % 4 > target % 4) { await page.keyboard.press('ArrowLeft'); current -= 1; }
    await expect(cards(page).nth(target)).toBeFocused();
  };
  for (let face = 0; face < 8; face += 1) {
    await move(game.deck.indexOf(face));
    await page.keyboard.press('Enter');
    if (face === 0) evidence.push('ONE REVEALED FACE', await page.locator('body').ariaSnapshot());
    await move(game.deck.lastIndexOf(face));
    await page.keyboard.press('Space');
    if (face === 0) evidence.push('FIRST MATCH', await page.locator('body').ariaSnapshot());
  }
  await expect(page.getByText('Moves: 8', { exact: true })).toBeVisible();
  await expect(live(page)).toHaveText('Pair found. All pairs found in 8 moves and 0:00.');
  await expect(cards(page).nth(current)).toHaveAttribute('aria-disabled', 'true');
  evidence.push('FINAL MATCH AND WIN', await page.locator('body').ariaSnapshot());
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(current)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  evidence.push('NEW GAME AFTER TAB EXIT', await page.locator('body').ariaSnapshot());
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/keyboard-accessibility.txt', evidence.join('\n\n'));
});

test('roving focus stops at edges, remembers Tab position and resets on Restart', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).focus();
  for (const key of ['ArrowLeft', 'ArrowUp']) await page.keyboard.press(key);
  await expect(cards(page).nth(0)).toBeFocused();
  for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(3)).toBeFocused();
  for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(15)).toBeFocused();
  await expect(page.locator('.board-grid button[tabindex="0"]')).toHaveCount(1);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(15)).toBeFocused();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
});
