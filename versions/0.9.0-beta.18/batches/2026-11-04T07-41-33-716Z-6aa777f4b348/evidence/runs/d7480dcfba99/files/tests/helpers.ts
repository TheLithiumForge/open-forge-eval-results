import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { generateBoard } from '../src/game/boardCode.ts';

export const exampleCode = 'np1-4-1';
export const cards = (page: Page) => page.getByRole('group', { name: /memory board/ }).getByRole('button');
export async function openTools(page: Page) {
  const details = page.locator('details');
  if (!await details.evaluate(node => node.hasAttribute('open'))) await page.getByText('Reproduce a game', { exact: true }).click();
}
export async function loadBoard(page: Page, code = exampleCode) {
  await openTools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}
export async function snapshot(page: Page) {
  await openTools(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const value: unknown = JSON.parse(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue());
  return value;
}
export async function loadSnapshot(page: Page, value: unknown) {
  await openTools(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(value));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}
export async function solve(page: Page, code: string, skip: readonly number[] = []) {
  const board = generateBoard(code);
  if (!board) throw new Error('Invalid test board');
  const pairs = Array.from({ length: board.deck.length / 2 }, (_, face) => face)
    .filter(face => !skip.includes(face))
    .map(face => [board.deck.indexOf(face), board.deck.lastIndexOf(face)]);
  if (board.size >= 8) {
    // Exercise the public native buttons, allowing each turn to render.
    // Pointer, touch and full keyboard journeys are checked separately.
    await page.evaluate(async turns => {
      const buttons = document.querySelectorAll<HTMLButtonElement>('.card');
      for (const turn of turns) {
        for (const index of turn) buttons[index]?.click();
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      }
    }, pairs);
  } else {
    for (const pair of pairs) for (const index of pair) await cards(page).nth(index).click();
  }
  await expect(page.getByText('All pairs found!', { exact: true })).toBeVisible();
}
export function partial(matched: number[] = [], selection: unknown = { kind: 'closed' }) {
  return { version: 1, boardCode: exampleCode, matched, selection, moves: Math.max(1, matched.length / 2), elapsedMs: 1500, started: true };
}
