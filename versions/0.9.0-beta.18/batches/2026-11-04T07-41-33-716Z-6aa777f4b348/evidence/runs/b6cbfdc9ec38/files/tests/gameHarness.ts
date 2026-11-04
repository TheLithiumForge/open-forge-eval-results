import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createGame } from '../src/game/state.ts';

export const PREFERENCE_KEY = 'neon-pairs.preferences.v1';
export const cards = (page: Page) => page.locator('.card');
export const live = (page: Page) => page.locator('[aria-live="polite"]');

export async function openGame(page: Page, offline = false): Promise<void> {
  if (offline) {
    await page.context().setOffline(true);
    await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  } else await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
}

export async function reproduction(page: Page): Promise<void> {
  if (!await page.locator('details').evaluate((element) => element instanceof HTMLDetailsElement && element.open)) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function loadBoard(page: Page, code = 'np1-4-1'): Promise<void> {
  await reproduction(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}

export async function loadSnapshot(page: Page, text: string): Promise<void> {
  await reproduction(page);
  await page.getByLabel('Snapshot JSON').fill(text);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export async function snapshot(page: Page) {
  await reproduction(page);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const value: unknown = JSON.parse(await page.getByLabel('Snapshot JSON').inputValue());
  return value;
}

export function gameFor(code = 'np1-4-1') {
  const game = createGame(code);
  if (!game) throw new Error('Invalid test board.');
  return game;
}

export function pairsFor(code: string): number[][] {
  const deck = gameFor(code).deck;
  return Array.from({ length: deck.length / 2 }, (_, face) =>
    deck.flatMap((value, index) => value === face ? [index] : []));
}

export async function finish(page: Page, code = 'np1-4-1'): Promise<void> {
  for (const positions of pairsFor(code)) {
    await page.evaluate((indices) => {
      const buttons = document.querySelectorAll('.card');
      for (const index of indices) {
        const button = buttons[index];
        if (!(button instanceof HTMLButtonElement)) throw new Error('Missing card button.');
        button.click();
      }
    }, positions);
  }
  await expect(page.locator('.win-banner')).toBeVisible();
}

export function progress(moves = 7, complete = false, elapsedMs = 1500): string {
  const game = gameFor();
  return JSON.stringify({ version: 1, boardCode: game.board.code,
    matched: game.deck.flatMap((face, index) => face !== 3 || complete ? [index] : []),
    selection: { kind: 'closed' }, moves, elapsedMs, started: true });
}
