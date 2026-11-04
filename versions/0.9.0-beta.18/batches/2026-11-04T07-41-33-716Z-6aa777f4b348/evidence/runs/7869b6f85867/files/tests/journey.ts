import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { generateBoard } from '../src/game/board-code.ts';

export const cards = (page: Page) => page.getByRole('region', { name: 'Card board' }).getByRole('button');
export const live = (page: Page) => page.locator('[aria-live="polite"]');
export async function freezeClock(page: Page) {
  const time = new Date('2026-11-04T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
}
export async function openTools(page: Page) {
  const tools = page.locator('details');
  if (!(await tools.getAttribute('open') !== null)) await page.getByText('Reproduce a game', { exact: true }).click();
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
export async function exportSnapshot(page: Page): Promise<unknown> {
  await openTools(page);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  return JSON.parse(await page.getByLabel('Snapshot JSON').inputValue());
}
export const mismatchSnapshot = { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true };
export function completeSnapshot(size = 4, moves = size * size / 2, complete = true) {
  const deck = generateBoard(`np1-${size}-1`).deck;
  const matched = deck.flatMap((face, index) => complete || face !== 0 ? [index] : []);
  return { version: 1, boardCode: `np1-${size}-1`, matched,
    selection: { kind: 'closed' }, moves, elapsedMs: 12345, started: true };
}
export async function finish(page: Page, size = 4) {
  const deck = generateBoard(`np1-${size}-1`).deck;
  for (let face = 0; face < size * size / 2; face++) {
    const pair = deck.flatMap((value, index) => value === face ? [index] : []);
    await page.locator('.board').evaluate((element, indices) => {
      const buttons = element.querySelectorAll('button');
      for (const index of indices) buttons[index]?.click();
    }, pair);
  }
  await expect(page.locator('.win-banner')).toBeVisible();
}
