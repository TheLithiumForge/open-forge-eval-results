import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../src/game/state.ts';
import type { GameState } from '../src/game/state.ts';
import { decodeSnapshot, encodeSnapshot } from '../src/game/snapshot.ts';

export const KNOWN_PAIRS = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]] as const;
export const SAMPLE = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true } as const;
export const card = (page: Page, index: number) => page.locator('.card').nth(index);

export async function openTools(page: Page): Promise<void> {
  if (await page.locator('details').getAttribute('open') === null) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function loadBoard(page: Page, code = 'np1-4-1'): Promise<void> {
  await openTools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}

export async function loadSnapshot(page: Page, text: string): Promise<void> {
  await openTools(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export async function exported(page: Page): Promise<GameState> {
  await openTools(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const game = decodeSnapshot(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue());
  if (!game) throw new Error('The game exported invalid snapshot JSON.');
  return game;
}

export function initial(code = 'np1-4-1'): GameState {
  const game = createGame(code);
  if (!game) throw new Error('Invalid test board.');
  return game;
}

export function completedText(moves = 8): string {
  const game = initial();
  return encodeSnapshot({ ...game, matched: Array.from({ length: 16 }, (_, index) => index),
    started: true, moves, elapsedMs: 65000 });
}

export function nearlyCompleteText(moves = 7, elapsedMs = 1500): string {
  const game = initial();
  return encodeSnapshot({ ...game, matched: KNOWN_PAIRS.slice(0, 7).flat(),
    started: true, moves, elapsedMs });
}

export function nearlyCompleteBoard(code: string): { text: string; first: number; second: number } {
  const game = initial(code);
  const first = 0;
  const second = game.deck.findIndex((face, index) => index !== first && face === game.deck[first]);
  if (second < 0) throw new Error('Missing final pair.');
  return { first, second, text: encodeSnapshot({ ...game, started: true,
    matched: game.deck.map((_, index) => index).filter((index) => index !== first && index !== second),
    moves: game.deck.length / 2 - 1, elapsedMs: 1500 }) };
}

export async function finish(page: Page, code = 'np1-4-1'): Promise<void> {
  const game = initial(code);
  const pairs = new Map<number, number[]>();
  game.deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
  for (const pair of pairs.values()) for (const index of pair) await card(page, index).press('Enter');
  await expect(page.getByText('All pairs found!', { exact: true })).toBeVisible();
}

export async function frozenClock(page: Page): Promise<void> {
  const time = new Date('2026-11-04T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
}
