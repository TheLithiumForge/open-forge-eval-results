import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../../src/game/state.ts';
import type { GameState } from '../../src/game/state.ts';
import { decodeSnapshot, encodeSnapshot } from '../../src/game/snapshot.ts';

export const exampleCode = 'np1-4-1';
export function game(code = exampleCode): GameState {
  const state = createGame(code);
  if (!state) throw new Error('Invalid test board code');
  return state;
}
export const cards = (page: Page) => page.locator('button.card');
export async function tools(page: Page): Promise<void> {
  if (await page.locator('details').getAttribute('open') === null) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}
export async function loadBoard(page: Page, code = exampleCode): Promise<void> {
  await tools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByLabel('Grid size')).toHaveValue(String(game(code).board.size));
}
export async function loadState(page: Page, state: GameState): Promise<void> {
  await tools(page);
  await page.getByLabel('Snapshot JSON').fill(encodeSnapshot(state));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}
export async function exported(page: Page): Promise<GameState> {
  await tools(page);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const state = decodeSnapshot(await page.getByLabel('Snapshot JSON').inputValue());
  if (!state) throw new Error('Browser exported invalid snapshot');
  return state;
}
export async function playAll(page: Page, code = exampleCode): Promise<void> {
  const deck = game(code).deck;
  for (let face = 0; face < deck.length / 2; face++) {
    await cards(page).nth(deck.indexOf(face)).click();
    await cards(page).nth(deck.lastIndexOf(face)).click();
  }
}
export async function frozenClock(page: Page): Promise<void> {
  await page.clock.install({ time: 0 });
  // Pause in the future so install-to-pause transport latency cannot race zero.
  await page.clock.pauseAt(1000000);
}
export async function watchAnnouncements(page: Page): Promise<string[]> {
  const messages: string[] = [];
  page.on('console', message => {
    const prefix = 'neon-test-announcement:';
    if (message.text().startsWith(prefix)) messages.push(message.text().slice(prefix.length));
  });
  await page.locator('[aria-live]').evaluate(region => {
    new MutationObserver(() => {
      if (region.textContent) console.debug(`neon-test-announcement:${region.textContent}`);
    }).observe(region, { childList: true, characterData: true, subtree: true });
  });
  return messages;
}
export function almostWon(moves = 7): GameState {
  const initial = game();
  return { ...initial, matched: initial.deck.flatMap((face, index) => face === 6 ? [] : [index]),
    moves, elapsedMs: 1500, started: true, selection: { kind: 'closed' } };
}
