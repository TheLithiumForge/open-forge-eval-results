import type { Page } from '@playwright/test';
import { createGame, type GameState, type Selection } from '../src/game/state.ts';
import { encodeSnapshot } from '../src/game/snapshot.ts';

export async function pauseClock(page: Page): Promise<void> {
  const fixedTime = new Date('2026-11-04T12:00:00.000Z');
  await page.clock.install({ time: fixedTime });
  await page.clock.pauseAt(fixedTime);
}

export function gameFor(code: string): GameState {
  const game = createGame(code);
  if (game === null) throw new Error(`Test board code was rejected: ${code}`);
  return game;
}

export function pairsFor(code: string): ReadonlyMap<number, readonly [number, number]> {
  const pairs = new Map<number, number[]>();
  for (const [index, face] of gameFor(code).board.deck.entries()) {
    const positions = pairs.get(face) ?? [];
    positions.push(index);
    pairs.set(face, positions);
  }
  return new Map([...pairs.entries()].map(([face, positions]) => {
    const first = positions[0];
    const second = positions[1];
    if (first === undefined || second === undefined) throw new Error('Board code must contain face pairs.');
    return [face, [first, second] as const];
  }));
}

export function snapshotFor(code: string, matched: readonly number[], selection: Selection,
  moves: number, elapsedMs: number): string {
  return encodeSnapshot({ ...gameFor(code), matched: [...matched], selection,
    moves, elapsedMs, started: true });
}

export function completedSnapshot(code: string, moves: number): string {
  const game = gameFor(code);
  return snapshotFor(code, game.board.deck.map((_, index) => index), { kind: 'closed' },
    Math.max(game.board.deck.length / 2, moves), 10_000);
}

export function card(page: Page, index: number) {
  return page.locator('.card-grid .game-card').nth(index);
}

export async function openReproduction(page: Page): Promise<void> {
  const panel = page.locator('.reproduce-panel');
  if (!(await panel.evaluate((details) => details instanceof HTMLDetailsElement && details.open))) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function loadBoard(page: Page, code: string): Promise<void> {
  await openReproduction(page);
  await page.getByLabel('Board code', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
}

export async function loadSnapshot(page: Page, snapshot: string): Promise<void> {
  await openReproduction(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(snapshot);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

export async function moveToPosition(page: Page, from: number, to: number, side: number): Promise<void> {
  await card(page, from).focus();
  const row = Math.floor(from / side);
  const column = from % side;
  const targetRow = Math.floor(to / side);
  const targetColumn = to % side;
  for (let current = row; current > targetRow; current -= 1) await page.keyboard.press('ArrowUp');
  for (let current = row; current < targetRow; current += 1) await page.keyboard.press('ArrowDown');
  for (let current = column; current > targetColumn; current -= 1) await page.keyboard.press('ArrowLeft');
  for (let current = column; current < targetColumn; current += 1) await page.keyboard.press('ArrowRight');
}
