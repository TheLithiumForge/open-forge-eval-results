import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const DECK = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
export const PAIRS = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]];
export const cards = (page: Page) => page.getByRole('group', { name: 'Memory board' }).getByRole('button');

export async function freezeClock(page: Page) {
  await page.clock.install({ time: new Date('2026-11-04T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-04T00:00:01Z'));
}

export async function openTools(page: Page) {
  const tools = page.locator('details');
  if (!(await tools.evaluate(element => element.hasAttribute('open')))) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function loadBoard(page: Page, code = 'np1-4-1') {
  await openTools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
}

export async function loadSnapshot(page: Page, overrides: Record<string, unknown> = {}) {
  await openTools(page);
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify({ version: 1,
    boardCode: 'np1-4-1', matched: [], selection: { kind: 'closed' },
    moves: 0, elapsedMs: 0, started: false, ...overrides }));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export async function finish(page: Page) {
  for (const pair of PAIRS) for (const index of pair) await cards(page).nth(index).click();
}

export async function keyboardTo(page: Page, current: number, destination: number, size = 4) {
  const row = Math.floor(current / size);
  const targetRow = Math.floor(destination / size);
  for (let i = 0; i < Math.abs(row - targetRow); i++) {
    await page.keyboard.press(targetRow > row ? 'ArrowDown' : 'ArrowUp');
  }
  for (let i = 0; i < Math.abs(current % size - destination % size); i++) {
    await page.keyboard.press(destination % size > current % size ? 'ArrowRight' : 'ArrowLeft');
  }
  await expect(cards(page).nth(destination)).toBeFocused();
}
