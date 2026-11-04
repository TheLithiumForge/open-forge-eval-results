import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { decodeSnapshot } from '../../src/game/snapshot.ts';

export { expect };
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', (request) => {
      if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4173/')) {
        errors.push(`Unexpected network request: ${request.url()}`);
      }
    });
    await use(page);
    expect(errors).toEqual([]);
  },
});
export const LITERAL_DECK = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
export const PREFERENCES_KEY = 'neon-pairs.preferences.v1';
export const cards = (page: Page) => page.locator('.board button');
export const live = (page: Page) => page.locator('[aria-live="polite"]');
export function status(page: Page, label: 'Moves' | 'Pairs' | 'Time' | 'Best') {
  return page.locator('.game-status p').filter({ hasText: new RegExp(`^${label}:`) });
}
export async function openTools(page: Page) {
  if (!(await page.locator('details').getAttribute('open')) && !(await page.locator('details').evaluate((e) => e.hasAttribute('open')))) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}
export async function loadBoard(page: Page, code = 'np1-4-1') {
  await openTools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}
export async function loadSnapshot(page: Page, snapshot: unknown) {
  await openTools(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(snapshot));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}
export async function exported(page: Page) {
  await openTools(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const state = decodeSnapshot(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue());
  if (!state) throw new Error('Game exported an invalid snapshot');
  return state;
}
export async function freezeClock(page: Page) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:10Z'));
}
export const blankSnapshot = {
  version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' },
  moves: 0, elapsedMs: 0, started: false,
};
export const pendingSnapshot = {
  ...blankSnapshot, matched: [0, 11], moves: 2, elapsedMs: 1500, started: true,
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
};
export function almostWon(moves = 7, elapsedMs = 0) {
  return { ...blankSnapshot, matched: Array.from({ length: 16 }, (_, index) => index).filter((i) => i !== 0 && i !== 11),
    moves, elapsedMs, started: true };
}
export async function finishLastPair(page: Page) {
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
}
