import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../src/game/state.ts';
import { decodeSnapshot } from '../src/game/snapshot.ts';

export const CODE = 'np1-4-1';
export const PAIRS = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]];

export async function start(page: Page, frozen = false): Promise<void> {
  if (frozen) {
    const time = new Date('2026-11-04T12:00:00Z');
    await page.clock.install({ time });
    await page.clock.pauseAt(new Date(time.getTime() + 1000));
  }
  await page.goto('/');
  await expect(page.locator('.card')).toHaveCount(16);
}

export async function reproduce(page: Page): Promise<void> {
  const details = page.locator('details');
  if (await details.getAttribute('open') === null) await page.getByText('Reproduce a game', { exact: true }).click({ force: true });
}

export async function loadBoard(page: Page, code = CODE): Promise<void> {
  await reproduce(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click({ force: true });
}

export async function reveal(page: Page, index: number): Promise<void> {
  await page.locator('.card').nth(index).dispatchEvent('click', { button: 0, detail: 1 });
}

export async function exported(page: Page) {
  await reproduce(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click({ force: true });
  const text = await page.getByRole('textbox', { name: 'Snapshot JSON', exact: true }).inputValue();
  const state = decodeSnapshot(text);
  if (!state) throw new Error('Export must be a valid snapshot');
  return state;
}

export function snapshot(changes: Record<string, unknown> = {}): string {
  return JSON.stringify({ version: 1, boardCode: CODE, matched: [], selection: { kind: 'closed' },
    moves: 0, elapsedMs: 0, started: false, ...changes });
}

export async function loadSnapshot(page: Page, text: string): Promise<void> {
  await reproduce(page);
  await page.getByRole('textbox', { name: 'Snapshot JSON', exact: true }).fill(text);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click({ force: true });
}

export async function solve(page: Page, code = CODE): Promise<void> {
  const game = createGame(code);
  if (!game) throw new Error('Invalid test board');
  for (let face = 0; face < game.deck.length / 2; face += 1) {
    const first = game.deck.indexOf(face);
    const second = game.deck.lastIndexOf(face);
    await reveal(page, first);
    await reveal(page, second);
  }
}
