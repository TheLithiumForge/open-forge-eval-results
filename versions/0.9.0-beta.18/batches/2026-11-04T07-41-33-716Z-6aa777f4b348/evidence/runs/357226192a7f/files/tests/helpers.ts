import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../src/game/state.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

export const cards = (page: Page) => page.locator('.board-grid button');

export async function freezeClock(page: Page) {
  const time = new Date('2026-11-04T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
}

export async function loadBoard(page: Page, code = 'np1-4-1') {
  const tools = page.getByText('Reproduce a game', { exact: true });
  if (!(await page.locator('details').evaluate(element => element.hasAttribute('open')))) await tools.click();
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue(code.trim());
}

export function knownState(code = 'np1-4-1') {
  const game = createGame(code);
  if (!game) throw new Error('Invalid test deal');
  return game;
}

export async function finish(page: Page, code = 'np1-4-1', skip: readonly number[] = [], input: 'pointer' | 'keyboard' = 'pointer') {
  const game = knownState(code);
  for (const face of new Set(game.deck)) {
    for (let index = 0; index < game.deck.length; index++) {
      if (game.deck[index] !== face || skip.includes(index)) continue;
      if (input === 'keyboard') await cards(page).nth(index).press('Enter');
      else await cards(page).nth(index).click();
    }
  }
  await expect(page.getByText('All pairs found!', { exact: true })).toBeVisible();
}

export async function loadSnapshot(page: Page, text: string) {
  if (!(await page.locator('details').evaluate(element => element.hasAttribute('open')))) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export function completedSnapshot(code = 'np1-4-1', moves = 8) {
  const game = knownState(code);
  return encodeSnapshot({ ...game, matched: game.deck.map((_, i) => i), moves, elapsedMs: 123000, started: true });
}
