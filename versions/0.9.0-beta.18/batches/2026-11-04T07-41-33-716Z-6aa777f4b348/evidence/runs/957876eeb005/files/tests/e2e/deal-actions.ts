import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../../src/game/create-game.ts';

export const SAMPLE_CODE = 'np1-4-1';
export const SAMPLE_DECK = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
export const cards = (page: Page) => page.getByRole('region', { name: 'Card board' }).getByRole('button');

export async function showReproduction(page: Page): Promise<void> {
  if (await page.locator('details').getAttribute('open') === null) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function loadBoard(page: Page, code = SAMPLE_CODE): Promise<void> {
  await showReproduction(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}

export async function openGame(page: Page, code = SAMPLE_CODE): Promise<void> {
  await page.goto('/');
  await loadBoard(page, code);
}

export function dealPairs(code = SAMPLE_CODE): readonly (readonly [number, number])[] {
  const game = createGame(code);
  if (game === null) throw new Error('Invalid test deal');
  const pairs: [number, number][] = [];
  for (let face = 0; face < game.deck.length / 2; face += 1) {
    const positions = game.deck.flatMap((value, index) => value === face ? [index] : []);
    const first = positions[0];
    const second = positions[1];
    if (first === undefined || second === undefined) throw new Error('Incomplete test deal');
    pairs.push([first, second]);
  }
  return pairs;
}

export async function finishDeal(page: Page, code = SAMPLE_CODE): Promise<void> {
  for (const pair of dealPairs(code)) {
    for (const index of pair) await cards(page).nth(index).click();
  }
  await expect(page.getByRole('region', { name: 'Game complete' })).toBeVisible();
}

export async function freezeClock(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-04T12:00:01Z'));
}
