import type { Page } from '@playwright/test';
import { createGame } from '../src/game/createGame.ts';

export interface FacePair {
  readonly face: number;
  readonly positions: readonly [number, number];
}

export interface ProgressSnapshot {
  readonly version: 1;
  readonly boardCode: string;
  readonly matched: readonly number[];
  readonly selection: { readonly kind: 'closed' } | { readonly kind: 'one'; readonly index: number };
  readonly moves: number;
  readonly elapsedMs: number;
  readonly started: boolean;
}

export function pairsForCode(boardCode: string): readonly FacePair[] {
  const game = createGame(boardCode);
  if (game === null) throw new Error(`Test board is invalid: ${boardCode}`);
  const byFace = new Map<number, number[]>();
  game.board.deck.forEach((face, index) => {
    byFace.set(face, [...(byFace.get(face) ?? []), index]);
  });
  return [...byFace.entries()].map(([face, positions]) => {
    const first = positions[0];
    const second = positions[1];
    if (first === undefined || second === undefined) throw new Error(`Face ${face} has no pair`);
    return { face, positions: [first, second] };
  });
}

export function makeSnapshot(
  boardCode: string,
  matched: readonly number[],
  moves: number,
  elapsedMs = 0,
  selection: ProgressSnapshot['selection'] = { kind: 'closed' },
  started = true
): string {
  return JSON.stringify({ version: 1, boardCode, matched, selection, moves, elapsedMs, started }, null, 2);
}

export function progressSnapshot(boardCode: string, matchedPairCount: number, moves: number): string {
  const pairs = pairsForCode(boardCode);
  const matched = pairs.slice(0, matchedPairCount).flatMap((pair) => pair.positions);
  const selection = matchedPairCount === 0 ? { kind: 'one' as const, index: 0 } : { kind: 'closed' as const };
  return makeSnapshot(boardCode, matched, moves, 12_345, selection, true);
}

export function completedSnapshot(boardCode: string, moves: number): string {
  const pairs = pairsForCode(boardCode);
  const matched = pairs.flatMap((pair) => pair.positions);
  return makeSnapshot(boardCode, matched, moves, 123_000);
}

export async function openReproduction(page: Page): Promise<void> {
  await page.locator('.reproduction-panel').evaluate((element) => {
    if (element instanceof HTMLDetailsElement) element.open = true;
  });
}

export async function loadBoard(page: Page, boardCode: string): Promise<void> {
  await openReproduction(page);
  await page.getByLabel('Board code', { exact: true }).fill(boardCode);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}

export async function loadSnapshot(page: Page, text: string): Promise<void> {
  await openReproduction(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export async function clickCard(page: Page, index: number): Promise<void> {
  await page.locator('.board-card').nth(index).evaluate((element) => {
    if (!(element instanceof HTMLButtonElement)) throw new Error('Card locator is not a button');
    element.click();
  });
}
