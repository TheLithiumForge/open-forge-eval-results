import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../src/game/state.ts';
import type { GameState } from '../src/game/state.ts';
import { decodeSnapshot, encodeSnapshot } from '../src/game/snapshot.ts';

export const cards = (page: Page) => page.locator('.card');
export async function tools(page: Page) {
  const details = page.locator('details');
  if (!(await details.getAttribute('open') !== null)) await page.getByText('Reproduce a game', { exact: true }).click();
}
export async function loadBoard(page: Page, code = 'np1-4-1') {
  await tools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue(code.trim());
}
export async function readSnapshot(page: Page): Promise<GameState> {
  await tools(page);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const game = decodeSnapshot(await page.getByLabel('Snapshot JSON').inputValue());
  if (!game) throw new Error('Exported invalid snapshot');
  return game;
}
export async function loadSnapshot(page: Page, state: GameState) {
  await tools(page);
  await page.getByLabel('Snapshot JSON').fill(encodeSnapshot(state));
  await page.getByRole('button', { name: 'Load snapshot' }).click();
}
export function game(code = 'np1-4-1'): GameState {
  const state = createGame(code);
  if (!state) throw new Error('Invalid test board');
  return state;
}
export function pairs(state: GameState): readonly number[][] {
  const result = new Map<number, number[]>();
  state.board.deck.forEach((face, index) => result.set(face, [...(result.get(face) ?? []), index]));
  return [...result.values()];
}
export function nearWin(moves = 7): GameState {
  return { ...game(), matched: Array.from({ length: 16 }, (_, index) => index).filter((index) => index !== 12 && index !== 13),
    selection: { kind: 'closed' }, started: true, moves, elapsedMs: 1500 };
}
export async function frozen(page: Page) {
  const time = new Date('2026-11-04T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 60000));
  await page.goto('/');
}
export async function visibility(page: Page, hidden: boolean) {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'hidden', { configurable: true, value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}
