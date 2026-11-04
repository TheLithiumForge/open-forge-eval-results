import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { decodeSnapshot } from '../src/game/snapshot.ts';

export const deck4 = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
export const pairs4 = [[2, 6], [10, 14], [4, 5], [8, 15], [12, 13], [3, 7], [0, 11], [1, 9]];

export async function openTools(page: Page) {
  const details = page.locator('details');
  if (!(await details.evaluate(node => node instanceof HTMLDetailsElement && node.open))) {
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
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify(snapshot));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export async function exported(page: Page) {
  await openTools(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const game = decodeSnapshot(await page.getByLabel('Snapshot JSON').inputValue());
  if (!game) throw new Error('Export is not a valid snapshot');
  return game;
}

export function nearWin(moves = 9, elapsedMs = 1500) {
  return { version: 1, boardCode: 'np1-4-1', matched: Array.from({ length: 16 }, (_, i) => i).filter(i => i !== 0 && i !== 11),
    selection: { kind: 'closed' }, moves, elapsedMs, started: true };
}

export async function finishImported(page: Page, moves: number) {
  await loadSnapshot(page, nearWin(moves - 1));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(11).click();
  await expect(page.locator('.win-banner')).toContainText(`${moves} moves`);
}
