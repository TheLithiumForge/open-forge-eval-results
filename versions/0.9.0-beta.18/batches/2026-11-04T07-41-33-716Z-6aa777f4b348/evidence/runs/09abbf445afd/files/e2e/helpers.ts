import type { Page } from '@playwright/test';
import { createGame } from '../src/game/transitions.ts';
import type { Selection } from '../src/game/types.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

export const DEFAULT_CODE = 'np1-4-1';
export type Pair = Readonly<{ first: number; second: number }>;

export function gamePairs(code: string): readonly Pair[] {
  const game = createGame(code);
  if (game === null) throw new Error(`Test fixture board code is invalid: ${code}`);
  const firstByFace = new Map<number, number>();
  const pairs: Pair[] = [];
  for (const [index, face] of game.board.deck.entries()) {
    const first = firstByFace.get(face);
    if (first === undefined) firstByFace.set(face, index);
    else pairs.push({ first, second: index });
  }
  return pairs;
}

export function completedSnapshot(code: string): string {
  const game = createGame(code);
  if (game === null) throw new Error(`Test fixture board code is invalid: ${code}`);
  return encodeSnapshot({
    ...game,
    matched: game.board.deck.map((_, index) => index),
    selection: { kind: 'closed' },
    moves: game.board.deck.length / 2,
    elapsedMs: 1200,
    started: true,
  });
}

export function onePairRemainingSnapshot(code: string, moves: number): Readonly<{
  json: string;
  first: number;
  second: number;
}> {
  const game = createGame(code);
  if (game === null) throw new Error(`Test fixture board code is invalid: ${code}`);
  const positions = new Map<number, number[]>();
  for (const [index, face] of game.board.deck.entries()) {
    const pair = positions.get(face) ?? [];
    pair.push(index);
    positions.set(face, pair);
  }
  const remaining = [...positions.values()].at(-1);
  const [first, second] = remaining ?? [];
  if (first === undefined || second === undefined) throw new Error('Last test pair is missing.');
  const matched = game.board.deck.flatMap((_, index) => index === first || index === second ? [] : [index]);
  const json = encodeSnapshot({
    ...game,
    matched,
    selection: { kind: 'one', index: first },
    moves,
    elapsedMs: 0,
    started: true,
  });
  return { json, first, second };
}

export function snapshotText(
  code: string,
  selection: Selection,
  moves: number,
  elapsedMs: number,
  matched: readonly number[] = [],
  started = true,
): string {
  const game = createGame(code);
  if (game === null) throw new Error(`Test fixture board code is invalid: ${code}`);
  return encodeSnapshot({ ...game, matched, selection, moves, elapsedMs, started });
}

export async function openReproduction(page: Page): Promise<void> {
  if (await page.locator('details[open]').count() === 0) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function freezePageClock(page: Page): Promise<void> {
  const start = new Date('2026-11-04T00:00:00.000Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 60_000));
}

export async function loadBoard(page: Page, code = DEFAULT_CODE): Promise<void> {
  await openReproduction(page);
  await page.getByLabel('Board code').fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}

export async function loadSnapshot(page: Page, json: string): Promise<void> {
  await openReproduction(page);
  await page.getByLabel('Snapshot JSON').fill(json);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export async function observeAnnouncements(page: Page): Promise<void> {
  await page.evaluate(() => {
    const region = document.querySelector('[role="status"][aria-live="polite"][aria-atomic="true"]');
    if (region === null) throw new Error('The polite status region is missing.');
    const events: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          const text = node.textContent?.trim();
          if (text) events.push(text);
        }
      }
      document.documentElement.dataset.testAnnouncements = events.join('\n');
    });
    observer.observe(region, { childList: true, subtree: true, characterData: true });
  });
}

export async function moveFocus(page: Page, from: number, to: number, size: number): Promise<void> {
  let current = from;
  const targetColumn = to % size;
  while (current % size !== targetColumn) {
    const key = current % size > targetColumn ? 'ArrowLeft' : 'ArrowRight';
    await page.keyboard.press(key);
    current += key === 'ArrowRight' ? 1 : -1;
  }
  while (Math.floor(current / size) !== Math.floor(to / size)) {
    const key = current < to ? 'ArrowDown' : 'ArrowUp';
    await page.keyboard.press(key);
    current += key === 'ArrowDown' ? size : -size;
  }
}

