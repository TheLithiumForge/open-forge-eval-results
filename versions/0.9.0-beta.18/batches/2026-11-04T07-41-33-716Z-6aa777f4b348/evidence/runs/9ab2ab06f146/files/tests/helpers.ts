import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createBoard } from '../src/game/board.ts';
import { isRecord } from '../src/game/validation.ts';

export const DECK = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
export const cards = (page: Page) => page.getByRole('group', { name: /^Memory board/ }).getByRole('button');
export async function pauseClock(page: Page) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
}
export async function openTools(page: Page) {
  if (!await page.locator('details').evaluate(element => element instanceof HTMLDetailsElement && element.open)) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}
export async function loadBoard(page: Page, code = 'np1-4-1') {
  await openTools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Loaded board.');
}
export async function loadSnapshot(page: Page, value: unknown) {
  await openTools(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(value));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}
export async function exportSnapshot(page: Page): Promise<Record<string, unknown>> {
  await openTools(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const value: unknown = JSON.parse(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue());
  if (!isRecord(value)) throw new Error('Invalid export');
  return value;
}
export function snapshot(changes: Record<string, unknown> = {}) {
  return { version: 1, boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' }, moves: 0,
    elapsedMs: 0, started: false, ...changes };
}
export function pairs(code = 'np1-4-1'): number[][] {
  const board = createBoard(code);
  if (!board) throw new Error('Invalid test code');
  const deck = code === 'np1-4-1' ? DECK : board.deck;
  return Array.from({ length: deck.length / 2 }, (_, face) => deck.flatMap((value, index) => value === face ? [index] : []));
}
export async function solve(page: Page, code = 'np1-4-1') {
  for (const pair of pairs(code)) for (const index of pair) await cards(page).nth(index).click();
}
export async function focusCard(page: Page, target: number) {
  const active = await cards(page).evaluateAll(buttons => buttons.findIndex(button => button === document.activeElement));
  if (active < 0) await cards(page).first().focus();
  const size = Number(await page.getByLabel('Grid size', { exact: true }).inputValue());
  let current = active < 0 ? 0 : active;
  while (Math.floor(current / size) < Math.floor(target / size)) { await page.keyboard.press('ArrowDown'); current += size; }
  while (Math.floor(current / size) > Math.floor(target / size)) { await page.keyboard.press('ArrowUp'); current -= size; }
  while (current % size < target % size) { await page.keyboard.press('ArrowRight'); current++; }
  while (current % size > target % size) { await page.keyboard.press('ArrowLeft'); current--; }
}
