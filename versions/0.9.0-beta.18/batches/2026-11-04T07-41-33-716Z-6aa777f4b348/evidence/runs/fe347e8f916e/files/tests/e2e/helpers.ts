import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { generateDeck } from '../../src/game/boardCode.ts';
import type { Size } from '../../src/game/boardCode.ts';
import { decodeSnapshot } from '../../src/game/snapshot.ts';

export const DECK = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
export const card = (page: Page, index: number) => page.getByRole('group', { name: /card board/ }).getByRole('button').nth(index);
export async function reproduce(page: Page) {
  const panel = page.locator('details');
  if (!(await panel.evaluate((element) => element.hasAttribute('open')))) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}
export async function loadBoard(page: Page, code = 'np1-4-1') {
  await reproduce(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}
export async function exportState(page: Page) {
  await reproduce(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const state = decodeSnapshot(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue());
  if (!state) throw new Error('Exported an invalid snapshot');
  return state;
}
export async function loadSnapshot(page: Page, snapshot: unknown) {
  await reproduce(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(snapshot));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}
export function nearWin(moves = 7) {
  return { version: 1, boardCode: 'np1-4-1', matched: DECK.flatMap((_, index) => index === 0 || index === 11 ? [] : [index]),
    selection: { kind: 'closed' }, moves, elapsedMs: 1234, started: true };
}
export async function finish(page: Page, size: Size, seed = 42) {
  const deck = generateDeck(size, seed);
  for (let face = 0; face < size * size / 2; face += 1) {
    for (const index of deck.flatMap((value, position) => value === face ? [position] : [])) await card(page, index).press('Enter');
  }
  await expect(page.getByText('All pairs found!', { exact: true })).toBeVisible();
}
export async function freezeClock(page: Page) {
  const time = new Date('2026-11-04T08:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
}
