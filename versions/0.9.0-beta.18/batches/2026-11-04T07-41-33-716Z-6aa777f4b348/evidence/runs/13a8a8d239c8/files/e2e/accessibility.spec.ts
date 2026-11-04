import { mkdir, writeFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { parseBoardCode } from '../src/game/board.ts';
import { faceName } from '../src/game/board/faces.ts';
import { loadBoard } from './helpers.ts';

async function focusIndex(page: Page, from: number, to: number, side: number): Promise<void> {
  const rowDelta = Math.floor(to / side) - Math.floor(from / side);
  const columnDelta = (to % side) - (from % side);
  for (let step = 0; step < Math.abs(rowDelta); step += 1) {
    await page.keyboard.press(rowDelta > 0 ? 'ArrowDown' : 'ArrowUp');
  }
  for (let step = 0; step < Math.abs(columnDelta); step += 1) {
    await page.keyboard.press(columnDelta > 0 ? 'ArrowRight' : 'ArrowLeft');
  }
}

test('completes the 4x4 keyboard screen-reader journey and saves its accessibility tree', async ({ page }) => {
  const time = new Date('2026-11-04T00:00:00.000Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.goto('/');
  await expect(page.getByLabel('Grid size')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
  await loadBoard(page, 'np1-4-1');

  const firstClosed = page.getByRole('button', { name: 'Row 1, column 1, closed' });
  await expect(firstClosed).toHaveAttribute('tabindex', '0');
  await page.getByLabel('Grid size').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(firstClosed).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Row 1, column 1, cyan solid plus, marker top, revealed' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Row 1, column 2, closed' })).toBeVisible();
  const revealedTree = await page.locator('body').ariaSnapshot();

  const board = parseBoardCode('np1-4-1');
  if (board === null) throw new Error('The documented fixture should be a valid deal.');
  const pairs = new Map<number, number[]>();
  board.deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
  let focus = 0;
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/accessibility-revealed.yaml', revealedTree, 'utf8');

  for (const indices of pairs.values()) {
    const first = indices[0];
    const second = indices[1];
    if (first === undefined || second === undefined) throw new Error('Every face must form one pair.');
    if (first === 0) {
      await focusIndex(page, focus, second, 4);
      focus = second;
      await page.keyboard.press('Enter');
    } else {
      await focusIndex(page, focus, first, 4);
      focus = first;
      await page.keyboard.press('Enter');
      await focusIndex(page, focus, second, 4);
      focus = second;
      await page.keyboard.press('Enter');
    }
  }

  await expect(page.locator('.game-summary')).toContainText('Pairs: 8/8');
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Pair found. All pairs found in 8 moves and 0:00.');
  await expect(page.locator('.win-banner')).toContainText('All pairs found in 8 moves and 0:00.');
  await expect(page.locator('.memory-card[tabindex="0"]')).toHaveCount(1);
  const finishedTree = await page.locator('body').ariaSnapshot();
  await writeFile('evidence/accessibility-finished.yaml', finishedTree, 'utf8');

  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.memory-card[tabindex="0"]')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game' })).toBeFocused();
  await expect(page.locator('.game-summary')).toContainText('Pairs: 0/8');
  expect(finishedTree).toContain(`${faceName(board.deck[0] ?? 0)}, matched`);
});
