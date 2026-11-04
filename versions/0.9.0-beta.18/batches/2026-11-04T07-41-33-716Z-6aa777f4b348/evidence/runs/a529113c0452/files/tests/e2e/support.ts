import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../../src/game/state.ts';
import type { GameState } from '../../src/game/state.ts';
import { decodeSnapshot, encodeSnapshot } from '../../src/game/snapshot.ts';

export const cards = (page: Page) => page.getByRole('group', { name: 'Memory board' }).getByRole('button');
export const live = (page: Page) => page.locator('[aria-live="polite"]');
export const stat = (page: Page, label: string) => page.locator('.status-values p').filter({ hasText: `${label}:` });

export async function openGame(page: Page, frozen = false): Promise<void> {
  if (frozen) {
    const time = new Date('2026-11-04T12:00:00Z');
    await page.clock.install({ time });
    await page.clock.pauseAt(new Date(time.getTime() + 3_600_000));
  }
  await page.goto('/');
  await expect(cards(page)).toHaveCount(16);
}

export async function reproduction(page: Page): Promise<void> {
  if (await page.locator('details').getAttribute('open') === null) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function loadBoard(page: Page, code = 'np1-4-1'): Promise<void> {
  await reproduction(page);
  await page.getByLabel('Board code').fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByLabel('Board code')).toHaveValue(code.trim());
}

export async function loadProgress(page: Page, text: string): Promise<void> {
  await reproduction(page);
  await page.getByLabel('Snapshot JSON').fill(text);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export function deal(code = 'np1-4-1'): GameState {
  const game = createGame(code);
  if (game === null) throw new Error('Invalid test board.');
  return game;
}

export function completed(code = 'np1-4-1', moves?: number): string {
  const game = deal(code);
  return encodeSnapshot({ ...game, matched: game.board.deck.map((_, index) => index),
    moves: moves ?? game.board.deck.length / 2, started: true });
}

export function nearWin(moves = 7): string {
  const game = deal();
  return encodeSnapshot({ ...game, matched: game.board.deck.flatMap((face, index) => face === 0 ? [] : [index]),
    moves, started: true });
}

export async function exportProgress(page: Page): Promise<GameState> {
  await reproduction(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const restored = decodeSnapshot(await page.getByLabel('Snapshot JSON').inputValue());
  if (restored === null) throw new Error('Exported snapshot is invalid.');
  return restored;
}

export async function finish(page: Page, game: GameState): Promise<void> {
  const positions: number[] = [];
  for (let face = 0; face < game.board.deck.length / 2; face += 1) {
    positions.push(game.board.deck.indexOf(face), game.board.deck.lastIndexOf(face));
  }
  // Native button activation exercises every turn; pointer/tap journeys cover hit testing separately.
  await page.evaluate((indices) => {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.card');
    for (const index of indices) {
      const button = buttons[index];
      if (button === undefined) throw new Error('Missing card.');
      button.click();
    }
  }, positions);
}
