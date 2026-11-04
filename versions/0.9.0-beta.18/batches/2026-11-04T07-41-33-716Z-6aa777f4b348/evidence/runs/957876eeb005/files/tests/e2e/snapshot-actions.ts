import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { decodeSnapshot } from '../../src/game/snapshot.ts';
import { SAMPLE_DECK, showReproduction } from './deal-actions.ts';

export const mismatchSnapshot = {
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};

export function completedSnapshot(moves = 8) {
  return { version: 1, boardCode: 'np1-4-1', matched: SAMPLE_DECK.map((_, index) => index),
    selection: { kind: 'closed' }, moves, elapsedMs: 12345, started: true };
}

export function nearlyCompletedSnapshot(moves = 7) {
  return { ...completedSnapshot(moves), matched: SAMPLE_DECK.flatMap((face, index) => face === 6 ? [] : [index]) };
}

export async function loadSnapshot(page: Page, value: unknown): Promise<void> {
  await showReproduction(page);
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify(value));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export async function exportState(page: Page) {
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const text = await page.getByLabel('Snapshot JSON').inputValue();
  const game = decodeSnapshot(text);
  expect(game).not.toBeNull();
  if (game === null) throw new Error('Invalid exported snapshot');
  return game;
}
