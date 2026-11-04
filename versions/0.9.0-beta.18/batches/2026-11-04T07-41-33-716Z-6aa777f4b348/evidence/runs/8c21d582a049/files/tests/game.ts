import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../src/game/state.ts';
import { decodeSnapshot } from '../src/game/snapshot.ts';

export const cards = (page: Page) => page.locator('.card');
export const statistics = (page: Page) => page.locator('.game-status');
export const live = (page: Page) => page.getByRole('status');

export async function openGame(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-04T12:00:01Z'));
  await page.goto('/');
  await expect(cards(page)).toHaveCount(16);
}

export async function tools(page: Page): Promise<void> {
  if (!await page.locator('details').getAttribute('open')) {
    const opened = await page.locator('details').evaluate(element => element instanceof HTMLDetailsElement && element.open);
    if (!opened) await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function loadBoard(page: Page, code = 'np1-4-1'): Promise<void> {
  await tools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}

export async function loadSnapshot(page: Page, value: unknown): Promise<void> {
  await tools(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(value));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export function snapshot(size = 4, moves = size ** 2 / 2, complete = true) {
  const length = size ** 2;
  return { version: 1, boardCode: `np1-${size}-1`,
    matched: Array.from({ length }, (_, index) => index).filter(index => complete || (index !== 0 && index !== 11)),
    selection: complete ? { kind: 'closed' } : { kind: 'one', index: 0 },
    moves, elapsedMs: 1500, started: true };
}

export async function exported(page: Page) {
  await tools(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const text = await page.getByLabel('Snapshot JSON', { exact: true }).inputValue();
  const state = decodeSnapshot(text);
  if (!state) throw new Error('Export must be a valid snapshot');
  return state;
}

export async function finish(page: Page, code: string): Promise<void> {
  const game = createGame(code);
  if (!game) throw new Error('Invalid fixture code');
  for (let face = 0; face < game.board.deck.length / 2; face++) {
    await cards(page).nth(game.board.deck.indexOf(face)).click();
    await cards(page).nth(game.board.deck.lastIndexOf(face)).click();
  }
}

export async function moveTo(page: Page, destination: number, size = 4): Promise<void> {
  const current = await cards(page).evaluateAll(elements => elements.findIndex(element => element === document.activeElement));
  if (current < 0) throw new Error('Keyboard journey must already be on the board');
  let row = Math.floor(current / size);
  let column = current % size;
  while (row !== Math.floor(destination / size)) {
    const direction = row < Math.floor(destination / size) ? 1 : -1;
    await page.keyboard.press(direction > 0 ? 'ArrowDown' : 'ArrowUp'); row += direction;
  }
  while (column !== destination % size) {
    const direction = column < destination % size ? 1 : -1;
    await page.keyboard.press(direction > 0 ? 'ArrowRight' : 'ArrowLeft'); column += direction;
  }
  await expect(cards(page).nth(destination)).toBeFocused();
}
