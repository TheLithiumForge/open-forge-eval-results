import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../../src/game/state.ts';
import type { GameState } from '../../src/game/state.ts';
import { decodeSnapshot, encodeSnapshot } from '../../src/game/snapshot.ts';

export const CARDS = '.board .card';
export async function tools(page: Page): Promise<void> {
  if (await page.locator('details').getAttribute('open') === null) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}
export async function loadBoard(page: Page, code = 'np1-4-1'): Promise<void> {
  await tools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}
export async function loadSnapshot(page: Page, game: GameState): Promise<void> {
  await tools(page);
  await page.getByLabel('Snapshot JSON').fill(encodeSnapshot(game));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}
export async function exported(page: Page): Promise<GameState> {
  await tools(page);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const game = decodeSnapshot(await page.getByLabel('Snapshot JSON').inputValue());
  if (!game) throw new Error('Exported snapshot did not validate');
  return game;
}
export async function finish(page: Page, code = 'np1-4-1', batchNativeClicks = false): Promise<void> {
  const game = createGame(code);
  if (batchNativeClicks) {
    const positions = Array.from({ length: game.board.deck.length / 2 }, (_, face) =>
      [game.board.deck.indexOf(face), game.board.deck.lastIndexOf(face)]).flat();
    await page.locator(CARDS).evaluateAll((cards, indices) => {
      for (const index of indices) {
        const card = cards[index];
        if (!(card instanceof HTMLButtonElement)) throw new Error('Missing card');
        card.click();
      }
    }, positions);
  } else for (let face = 0; face < game.board.deck.length / 2; face++) {
    await page.locator(CARDS).nth(game.board.deck.indexOf(face)).click();
    await page.locator(CARDS).nth(game.board.deck.lastIndexOf(face)).click();
  }
  await expect(page.locator('.win-banner')).toContainText('All pairs found!');
}
export async function keyboardTo(page: Page, index: number): Promise<void> {
  const size = Number(await page.getByLabel('Grid size').inputValue());
  const activeIndex = await page.locator(CARDS).evaluateAll(cards => cards.findIndex(card => card === document.activeElement));
  let current = activeIndex;
  if (current < 0) throw new Error('Board must be focused');
  while (Math.floor(current / size) < Math.floor(index / size)) { await page.keyboard.press('ArrowDown'); current += size; }
  while (Math.floor(current / size) > Math.floor(index / size)) { await page.keyboard.press('ArrowUp'); current -= size; }
  while (current % size < index % size) { await page.keyboard.press('ArrowRight'); current++; }
  while (current % size > index % size) { await page.keyboard.press('ArrowLeft'); current--; }
  await expect(page.locator(CARDS).nth(index)).toBeFocused();
}
