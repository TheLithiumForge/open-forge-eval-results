import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../src/game/state.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';
import type { Size } from '../src/game/boardCode.ts';

export const cards = (page: Page) => page.getByRole('group', { name: /card board/ }).getByRole('button');
export async function tools(page: Page) {
  const details = page.locator('details');
  if (!await details.evaluate(element => element.hasAttribute('open'))) await page.getByText('Reproduce a game', { exact: true }).click();
}
export async function loadBoard(page: Page, size: Size = 4) {
  await tools(page);
  await page.getByLabel('Board code', { exact: true }).fill(`np1-${size}-1`);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}
export function fixture(size: Size = 4) {
  const game = createGame(`np1-${size}-1`);
  if (!game) throw new Error('Invalid test fixture');
  return game;
}
export function completed(size: Size = 4, moves = size * size / 2) {
  return encodeSnapshot({ ...fixture(size), matched: Array.from({ length: size * size }, (_, i) => i), moves, started: true, elapsedMs: 12345 });
}
export async function loadSnapshot(page: Page, text: string) {
  await tools(page);
  await page.getByLabel('Snapshot JSON').fill(text);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}
export async function win(page: Page, size: Size = 4, keyboard = false) {
  const deck = fixture(size).board.deck;
  for (let face = 0; face < size * size / 2; face++) {
    for (const index of [deck.indexOf(face), deck.lastIndexOf(face)]) {
      const card = cards(page).nth(index);
      if (await card.getAttribute('aria-disabled') === 'true') continue;
      if (keyboard) {
        if (size === 4) await navigateTo(page, index, size);
        else await card.focus();
        await page.keyboard.press('Enter');
      }
      else await card.click();
    }
  }
  await expect(page.locator('.win-banner')).toContainText('All pairs found.');
}
async function navigateTo(page: Page, index: number, size: number) {
  let from = await cards(page).evaluateAll(elements => elements.findIndex(element => element === document.activeElement));
  if (from < 0) { await cards(page).first().focus(); from = 0; }
  const rowDifference = Math.floor(index / size) - Math.floor(from / size);
  const columnDifference = index % size - from % size;
  for (let i = 0; i < Math.abs(rowDifference); i++) await page.keyboard.press(rowDifference > 0 ? 'ArrowDown' : 'ArrowUp');
  for (let i = 0; i < Math.abs(columnDifference); i++) await page.keyboard.press(columnDifference > 0 ? 'ArrowRight' : 'ArrowLeft');
}
export async function frozenClock(page: Page) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
}
