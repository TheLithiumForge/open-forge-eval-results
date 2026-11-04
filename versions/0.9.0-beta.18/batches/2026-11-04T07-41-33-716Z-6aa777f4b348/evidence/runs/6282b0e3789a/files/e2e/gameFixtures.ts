import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../src/game/createGame.ts';

export const PAIRS = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]] as const;
export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export const cards = (page: Page) => page.locator('.board-grid button');
export const live = (page: Page) => page.locator('[aria-live="polite"]');

export async function openTools(page: Page) {
  if (!await page.getByLabel('Board code', { exact: true }).isVisible()) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function loadBoard(page: Page, code = 'np1-4-1') {
  await openTools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}

export async function loadSnapshot(page: Page, value: unknown) {
  await openTools(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(value));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export function snapshot(size = 4, moves = size * size / 2) {
  return { version: 1, boardCode: `np1-${size}-1`,
    matched: Array.from({ length: size * size }, (_, i) => i),
    selection: { kind: 'closed' }, moves, elapsedMs: 1500, started: true };
}

export async function finish(page: Page, size = 4) {
  const state = createGame(`np1-${size}-1`);
  if (!state) throw new Error('Invalid fixture board.');
  for (let face = 0; face < size * size / 2; face += 1) {
    await cards(page).nth(state.deck.indexOf(face)).press('Enter');
    await cards(page).nth(state.deck.lastIndexOf(face)).press('Enter');
  }
  await expect(page.getByRole('region', { name: 'Game complete' })).toBeVisible();
}

export async function freezeClock(page: Page) {
  const time = new Date('2026-11-04T10:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 60000));
}

export async function exportValue(page: Page): Promise<unknown> {
  await openTools(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  return JSON.parse(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue());
}
