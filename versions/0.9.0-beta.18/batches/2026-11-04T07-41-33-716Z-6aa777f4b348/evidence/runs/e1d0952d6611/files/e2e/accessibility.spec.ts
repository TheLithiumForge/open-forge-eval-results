import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { card, gameFor, pairsFor } from './helpers.ts';

async function moveByArrows(page: import('@playwright/test').Page, from: number, to: number): Promise<void> {
  const row = Math.floor(from / 4);
  const column = from % 4;
  const targetRow = Math.floor(to / 4);
  const targetColumn = to % 4;
  for (let step = row; step > targetRow; step -= 1) await page.keyboard.press('ArrowUp');
  for (let step = row; step < targetRow; step += 1) await page.keyboard.press('ArrowDown');
  for (let step = column; step > targetColumn; step -= 1) await page.keyboard.press('ArrowLeft');
  for (let step = column; step < targetColumn; step += 1) await page.keyboard.press('ArrowRight');
}

test('finishes a 4x4 keyboard game and saves an accessibility-tree journey', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
  expect(await page.locator('.card-grid .game-card[tabindex="0"]').count()).toBe(1);
  const code = await page.locator('.board-code-current code').textContent();
  if (code === null) throw new Error('Reproduction panel must show its current board code.');
  const game = gameFor(code);
  const firstFace = game.board.deck[0];
  if (firstFace === undefined) throw new Error('First board card must have a face.');
  const matchingPair = pairsFor(code).get(firstFace);
  if (matchingPair === undefined) throw new Error('A board card must have a matching position.');
  const [firstPosition, secondPosition] = matchingPair;
  const evidence = [`Initial controls and closed board\n${await page.locator('body').ariaSnapshot()}`];
  for (const key of ['Tab', 'Tab', 'Tab', 'Tab']) await page.keyboard.press(key);
  await expect(card(page, 0)).toBeFocused();
  await page.keyboard.press('Space');
  const faceName = faceNameFor(firstFace);
  await expect(card(page, 0)).toHaveAccessibleName(`Row 1, column 1, ${faceName}, revealed`);
  evidence.push(`Revealed by Space\n${await page.locator('body').ariaSnapshot()}`);
  await moveByArrows(page, firstPosition, secondPosition);
  await expect(card(page, secondPosition)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Pair found. 1 pair matched.');
  evidence.push(`First result\n${await page.locator('body').ariaSnapshot()}`);

  let current = secondPosition;
  for (const [face, [first, second]] of pairsFor(code)) {
    if (face === firstFace) continue;
    await moveByArrows(page, current, first);
    await page.keyboard.press('Space');
    await moveByArrows(page, first, second);
    await page.keyboard.press('Enter');
    current = second;
  }
  await expect(page.getByRole('region', { name: 'Game complete' })).toContainText('Finished in 8 moves');
  await expect(page.locator('[aria-live="polite"]')).toHaveText(/^Pair found\. All pairs found in 8 moves and \d+:\d{2}\.$/);
  evidence.push(`Win result\n${await page.locator('body').ariaSnapshot()}`);

  await page.keyboard.press('Tab');
  await expect(page.locator('.reproduce-panel summary')).toBeFocused();
  evidence.push(`Tab leaves the board\n${await page.locator('body').ariaSnapshot()}`);
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Game complete' })).toHaveCount(0);
  evidence.push(`New game by keyboard\n${await page.locator('body').ariaSnapshot()}`);
  const path = join(process.cwd(), 'evidence', 'keyboard-journey.txt');
  await mkdir(join(process.cwd(), 'evidence'), { recursive: true });
  await writeFile(path, evidence.join('\n\n'), 'utf8');
});

function faceNameFor(id: number): string {
  const colors = ['cyan', 'magenta', 'green', 'yellow', 'orange', 'violet', 'rose', 'ice'] as const;
  const shapes = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'plus', 'chevron'] as const;
  const markers = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] as const;
  const marker = Math.floor(id / 8) % 8;
  return `${colors[marker]} ${id < 64 ? 'solid' : 'outline'} ${shapes[id % 8]}, marker ${markers[marker]}`;
}

test('hidden names, one tab stop, edges and silent pointer actions stay separate', async ({ page }) => {
  await page.goto('/');
  const code = await page.locator('.board-code-current code').textContent();
  if (code === null) throw new Error('Reproduction panel must show its current board code.');
  const game = gameFor(code);
  const firstFace = game.board.deck[0];
  if (firstFace === undefined) throw new Error('First board card must have a face.');
  const matchingPair = pairsFor(code).get(firstFace);
  if (matchingPair === undefined) throw new Error('A board card must have a matching position.');
  await expect(page.locator('.game-card[tabindex="0"]')).toHaveCount(1);
  await expect(page.locator('.game-card svg.face-art')).toHaveCount(0);
  await expect(page.locator('.game-card[data-face-id], .game-card[data-face]')).toHaveCount(0);
  await expect(card(page, 0)).toHaveAccessibleName('Row 1, column 1, closed');
  await card(page, 0).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(card(page, 0)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(card(page, 0)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(card(page, 5)).toBeFocused();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await card(page, 2).hover();
  await card(page, 2).click({ button: 'right' });
  await card(page, 3).dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 });
  await card(page, 3).dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
  await expect(page.locator('.game-card svg.face-art')).toHaveCount(0);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  const [firstPosition, secondPosition] = matchingPair;
  await card(page, firstPosition).focus();
  await page.keyboard.press('Enter');
  await card(page, secondPosition).focus();
  await page.keyboard.press('Enter');
  await expect(card(page, firstPosition)).toHaveAttribute('aria-disabled', 'true');
  await card(page, firstPosition).focus();
  await card(page, firstPosition).dispatchEvent('click');
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await expect(card(page, firstPosition)).toBeFocused();
});
