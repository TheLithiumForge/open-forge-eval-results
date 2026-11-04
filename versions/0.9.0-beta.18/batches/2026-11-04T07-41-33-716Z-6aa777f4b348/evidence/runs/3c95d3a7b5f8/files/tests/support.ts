import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createGame } from '../src/game/state.ts';
import { decodeSnapshot, encodeSnapshot } from '../src/game/snapshot.ts';

export const cards = (page: Page) => page.locator('.card');
export const live = (page: Page) => page.locator('[aria-live="polite"]');

export async function tools(page: Page): Promise<void> {
  if (!await page.getByLabel('Board code', { exact: true }).isVisible()) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function loadBoard(page: Page, code = 'np1-4-1'): Promise<void> {
  await tools(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue(code.trim());
}

export async function loadSnapshot(page: Page, text: string): Promise<void> {
  await tools(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export async function exported(page: Page) {
  await tools(page);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const state = decodeSnapshot(await page.getByLabel('Snapshot JSON', { exact: true }).inputValue());
  if (!state) throw new Error('Export did not produce a valid snapshot.');
  return state;
}

export async function frozenPage(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-11-04T12:01:00Z'));
}

export async function finish(page: Page, code = 'np1-4-1'): Promise<void> {
  const game = createGame(code);
  for (let face = 0; face < game.board.deck.length / 2; face += 1) {
    await cards(page).nth(game.board.deck.indexOf(face)).press('Enter');
    await cards(page).nth(game.board.deck.lastIndexOf(face)).press('Enter');
  }
}

export function endingSnapshot(moves = 7, completed = false, size = 4, elapsedMs = 1234): string {
  const game = createGame(`np1-${size}-1`);
  const matched = game.board.deck.flatMap((face, index) => completed || face !== 0 ? [index] : []);
  return encodeSnapshot({ ...game, matched, moves, elapsedMs, started: true });
}

export async function keyboardTo(page: Page, target: number, size = 4): Promise<void> {
  const source = Number(await page.locator('.card:focus').getAttribute('data-position'));
  if (!Number.isInteger(source)) throw new Error('A card must have focus.');
  const vertical = Math.floor(target / size) - Math.floor(source / size);
  const horizontal = target % size - source % size;
  for (let step = 0; step < Math.abs(vertical); step += 1) {
    await page.keyboard.press(vertical > 0 ? 'ArrowDown' : 'ArrowUp');
  }
  for (let step = 0; step < Math.abs(horizontal); step += 1) {
    await page.keyboard.press(horizontal > 0 ? 'ArrowRight' : 'ArrowLeft');
  }
  await expect(cards(page).nth(target)).toBeFocused();
}

export async function observeAnnouncements(page: Page): Promise<string[]> {
  const events: string[] = [];
  page.on('console', (message) => {
    const prefix = 'NEON_TEST_ANNOUNCEMENT:';
    if (message.text().startsWith(prefix)) events.push(message.text().slice(prefix.length));
  });
  await live(page).evaluate((node) => {
    new MutationObserver(() => {
      const text = node.textContent?.trim();
      if (text) console.info(`NEON_TEST_ANNOUNCEMENT:${text}`);
    }).observe(node, { childList: true, subtree: true, characterData: true });
  });
  return events;
}
