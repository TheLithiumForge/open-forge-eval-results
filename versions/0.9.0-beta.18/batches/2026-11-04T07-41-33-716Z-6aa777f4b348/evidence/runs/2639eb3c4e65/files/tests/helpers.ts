import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { generateBoard } from '../src/game/deck.ts';

export const DECK = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
export const cards = (page: Page) => page.getByRole('group', { name: /game board/ }).getByRole('button');

export async function loadBoard(page: Page, code = 'np1-4-1') {
  const details = page.locator('details');
  if (!(await details.getAttribute('open') !== null)) await page.getByText('Reproduce a game', { exact: true }).click();
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}

export async function freezeTime(page: Page) {
  const start = new Date('2026-11-04T00:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
}

export async function finish(page: Page, code = 'np1-4-1') {
  const deck = code === 'np1-4-1' ? DECK : generateBoard(code)?.deck;
  if (!deck) throw new Error('Invalid test code');
  for (let face = 0; face < deck.length / 2; face++) {
    for (const [index, id] of deck.entries()) if (id === face) await cards(page).nth(index).click();
  }
  await expect(page.locator('.win-banner')).toBeVisible();
}

export function snapshot(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
    moves: 2, elapsedMs: 1500, started: true, ...overrides });
}

export async function importSnapshot(page: Page, text: string) {
  if (await page.locator('details').getAttribute('open') === null) await page.locator('summary').click();
  await page.getByLabel('Snapshot JSON').fill(text);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}
