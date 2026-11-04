import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { decodeSnapshot } from '../src/game/snapshot.ts';

export const SEED_ONE = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
export const cards = (page: Page) => page.locator('.card');

export async function freezeClock(page: Page) {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-04T12:00:01Z'));
}

export async function openTools(page: Page) {
  const details = page.locator('details');
  if (!(await details.evaluate(element => element.hasAttribute('open')))) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function loadBoard(page: Page, code = 'np1-4-1') {
  await openTools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}

export function sampleSnapshot(patch: Record<string, unknown> = {}) {
  return JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
    moves: 2, elapsedMs: 1500, started: true, ...patch });
}

export async function loadSnapshot(page: Page, text = sampleSnapshot()) {
  await openTools(page);
  await page.getByLabel('Snapshot JSON').fill(text);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export async function exportedState(page: Page) {
  await openTools(page);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const state = decodeSnapshot(await page.getByLabel('Snapshot JSON').inputValue());
  if (!state) throw new Error('App exported an invalid snapshot');
  return state;
}

export async function solve(page: Page, deck: readonly number[] = SEED_ONE) {
  for (let face = 0; face < deck.length / 2; face++) {
    await cards(page).nth(deck.indexOf(face)).press('Enter');
    await cards(page).nth(deck.lastIndexOf(face)).press('Enter');
  }
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
}

export async function keyboardMove(page: Page, from: number, to: number, size = 4) {
  const rowDelta = Math.floor(to / size) - Math.floor(from / size);
  const columnDelta = to % size - from % size;
  for (let i = 0; i < Math.abs(rowDelta); i++) await page.keyboard.press(rowDelta < 0 ? 'ArrowUp' : 'ArrowDown');
  for (let i = 0; i < Math.abs(columnDelta); i++) await page.keyboard.press(columnDelta < 0 ? 'ArrowLeft' : 'ArrowRight');
  await expect(cards(page).nth(to)).toBeFocused();
}
