import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../src/game/state.ts';
import { decodeSnapshot, encodeSnapshot } from '../src/game/snapshot.ts';
import type { GameState } from '../src/game/state.ts';

export const literalPairs = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]] as const;
export const card = (page: Page, index: number) => page.locator('.card').nth(index);
export const preferencesKey = 'neon-pairs.preferences.v1';

export async function reproduction(page: Page) {
  if (!(await page.locator('details').evaluate((element) => element instanceof HTMLDetailsElement && element.open))) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function openBoard(page: Page, code = 'np1-4-1') {
  await page.goto('/');
  await reproduction(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}

export async function importSnapshot(page: Page, text: string) {
  await reproduction(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export async function exported(page: Page): Promise<GameState> {
  await reproduction(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const state = decodeSnapshot(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue());
  if (!state) throw new Error('Browser exported an invalid snapshot.');
  return state;
}

export function game(code = 'np1-4-1'): GameState {
  const state = createGame(code);
  if (!state) throw new Error('Invalid test board.');
  return state;
}

export function pairs(state: GameState) {
  return Array.from({ length: state.board.deck.length / 2 }, (_, face) => {
    const first = state.board.deck.indexOf(face);
    return [first, state.board.deck.indexOf(face, first + 1)] as const;
  });
}

export async function complete(page: Page, state = game(), keyboard = false) {
  for (const [first, second] of pairs(state)) {
    if (keyboard) {
      await card(page, first).press('Enter');
      await card(page, second).press('Space');
    } else {
      await card(page, first).click();
      await card(page, second).click();
    }
  }
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
}

export function completedSnapshot(code = 'np1-4-1', moves?: number) {
  const state = game(code);
  return encodeSnapshot({ ...state, matched: state.board.deck.map((_, index) => index),
    moves: moves ?? state.board.deck.length / 2, started: true });
}

export async function frozenClock(page: Page) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(0);
}

export async function moveFocus(page: Page, from: number, to: number, size = 4) {
  for (let row = Math.floor(from / size); row < Math.floor(to / size); row++) await page.keyboard.press('ArrowDown');
  for (let row = Math.floor(from / size); row > Math.floor(to / size); row--) await page.keyboard.press('ArrowUp');
  for (let column = from % size; column < to % size; column++) await page.keyboard.press('ArrowRight');
  for (let column = from % size; column > to % size; column--) await page.keyboard.press('ArrowLeft');
  await expect(card(page, to)).toBeFocused();
}

export async function observeAnnouncements(page: Page) {
  const events: string[] = [];
  await page.exposeFunction('recordTurn', (value: unknown) => {
    if (typeof value === 'string' && value) events.push(value);
  });
  await page.getByRole('status').evaluate((region) => {
    new MutationObserver(() => {
      const record: unknown = Reflect.get(window, 'recordTurn');
      if (typeof record === 'function') void record(region.textContent ?? '');
    }).observe(region, { childList: true, characterData: true, subtree: true });
  });
  return events;
}
