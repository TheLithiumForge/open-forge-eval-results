import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../src/game/game.ts';
import { decodeSnapshot, encodeSnapshot } from '../src/game/snapshot.ts';

export const cards = (page: Page) => page.getByRole('group', { name: 'Memory board', exact: true }).getByRole('button');

export async function tools(page: Page): Promise<void> {
  if (!await page.locator('details').getAttribute('open').then((value) => value !== null)) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function loadBoard(page: Page, code = 'np1-4-1'): Promise<void> {
  await tools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Loaded board.');
}

export async function loadSnapshot(page: Page, text: string): Promise<void> {
  await tools(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export async function exported(page: Page) {
  await tools(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const state = decodeSnapshot(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue());
  if (!state) throw new Error('Browser exported an invalid snapshot.');
  return state;
}

export function snapshot(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' },
    moves: 0, elapsedMs: 0, started: false, ...overrides });
}

export function almostWon(moves = 7, elapsedMs = 1500, boardCode = 'np1-4-1'): string {
  const game = createGame(boardCode);
  const face = game.deck[0];
  if (face === undefined) throw new Error('Missing final-pair fixture.');
  const second = game.deck.lastIndexOf(face);
  return encodeSnapshot({ ...game, moves, elapsedMs, started: true,
    matched: game.deck.map((_, index) => index).filter((index) => index !== 0 && index !== second) });
}

export async function frozen(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-11-04T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-11-04T00:00:01Z'));
}

export async function keyboardTo(page: Page, from: number, to: number, size = 4): Promise<void> {
  const row = Math.floor(from / size);
  const column = from % size;
  const targetRow = Math.floor(to / size);
  const targetColumn = to % size;
  for (let step = 0; step < Math.abs(targetRow - row); step += 1) {
    await page.keyboard.press(targetRow > row ? 'ArrowDown' : 'ArrowUp');
  }
  for (let step = 0; step < Math.abs(targetColumn - column); step += 1) {
    await page.keyboard.press(targetColumn > column ? 'ArrowRight' : 'ArrowLeft');
  }
  await expect(cards(page).nth(to)).toBeFocused();
}
