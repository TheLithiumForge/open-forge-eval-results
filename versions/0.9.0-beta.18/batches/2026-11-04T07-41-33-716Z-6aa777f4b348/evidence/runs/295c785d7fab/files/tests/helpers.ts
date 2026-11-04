import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame, activateCard } from '../src/game/state.ts';
import type { GameState } from '../src/game/state.ts';
import { encodeSnapshot, decodeSnapshot } from '../src/game/snapshot.ts';

export const FOUR_PAIRS = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]] as const;
export const MISMATCH = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 }, moves: 2, elapsedMs: 1500, started: true };

export async function openTools(page: Page): Promise<void> {
  const details = page.locator('details');
  if (await details.getAttribute('open') === null) await page.getByText('Reproduce a game', { exact: true }).click();
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
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).dispatchEvent('click');
  const state = decodeSnapshot(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue());
  if (!state) throw new Error('The game exported invalid progress.');
  return state;
}

export async function activate(page: Page, index: number): Promise<void> {
  await page.locator('.card').nth(index).dispatchEvent('click', { button: 0 });
}

export function fixtureGame(): GameState {
  const state = createGame('np1-4-1');
  if (!state) throw new Error('Invalid documented board.');
  return state;
}

export function progress(pairCount: number, moves = pairCount): string {
  let state = fixtureGame();
  for (const [first, second] of FOUR_PAIRS.slice(0, pairCount)) {
    state = activateCard(activateCard(state, first), second);
  }
  return encodeSnapshot({ ...state, moves, elapsedMs: pairCount ? 1500 : 0 });
}

export async function freezeTime(page: Page): Promise<void> {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
}

export async function solve(page: Page, code: string): Promise<void> {
  const state = createGame(code);
  if (!state) throw new Error('Invalid test board.');
  const ordered = state.deck.map((face, index) => ({ face, index })).sort((a, b) => a.face - b.face);
  await page.locator('.card').evaluateAll((buttons, positions) => {
    for (const position of positions) {
      const button = buttons[position];
      if (!(button instanceof HTMLButtonElement)) throw new Error('Missing card button.');
      button.click();
    }
  }, ordered.map(card => card.index));
  await expect(page.locator('.win-banner')).toBeVisible();
}
