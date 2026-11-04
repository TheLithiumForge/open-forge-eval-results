import { expect, type Locator, type Page } from '@playwright/test';
import { createGame, type GameState } from '../../src/game/state.ts';

export function boardFor(boardCode: string): GameState {
  const game = createGame(boardCode);
  if (game === null) throw new Error('Invalid test board code: ' + boardCode);
  return game;
}

export function pairPositions(game: GameState): number[][] {
  const pairs = new Map<number, number[]>();
  game.deck.forEach((face, index) => {
    const positions = pairs.get(face) ?? [];
    positions.push(index);
    pairs.set(face, positions);
  });
  return Array.from(pairs.values());
}

export function cardAt(page: Page, index: number): Locator {
  return page.locator('.game-card').nth(index);
}

export async function openReproduction(page: Page): Promise<void> {
  const panel = page.locator('.reproduction-panel');
  if (!(await panel.evaluate((element) => element instanceof HTMLDetailsElement && element.open))) {
    await page.getByText('Reproduce a game', { exact: true }).click();
  }
}

export async function loadBoard(page: Page, boardCode: string): Promise<void> {
  await openReproduction(page);
  await page.getByLabel('Board code').fill(boardCode);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.game-card')).toHaveCount(boardFor(boardCode.trim()).deck.length);
}

export function snapshotFor(
  boardCode: string,
  matchedPairs = 0,
  selection: Record<string, unknown> = { kind: 'closed' },
  elapsedMs = 0,
): string {
  const game = boardFor(boardCode);
  const matched: number[] = [];
  for (const pair of pairPositions(game).slice(0, matchedPairs)) matched.push(...pair);
  return JSON.stringify({
    version: 1,
    boardCode,
    matched,
    selection,
    moves: matchedPairs + (selection.kind === 'mismatch' ? 1 : 0),
    elapsedMs,
    started: matchedPairs > 0 || selection.kind !== 'closed' || elapsedMs > 0,
  });
}

export async function keyboardMoveTo(page: Page, from: number, to: number, size: number): Promise<void> {
  let row = Math.floor(from / size);
  let column = from % size;
  const destinationRow = Math.floor(to / size);
  const destinationColumn = to % size;
  while (row !== destinationRow) {
    const direction = row < destinationRow ? 'ArrowDown' : 'ArrowUp';
    await page.keyboard.press(direction);
    row += direction === 'ArrowDown' ? 1 : -1;
  }
  while (column !== destinationColumn) {
    const direction = column < destinationColumn ? 'ArrowRight' : 'ArrowLeft';
    await page.keyboard.press(direction);
    column += direction === 'ArrowRight' ? 1 : -1;
  }
}

export async function finishByPointer(
  page: Page,
  boardCode: string,
  resolveMismatch?: () => Promise<void>,
): Promise<void> {
  const game = boardFor(boardCode);
  if (resolveMismatch !== undefined) {
    const first = 0;
    const face = game.deck[first];
    const second = game.deck.findIndex((candidate, index) => index !== first && candidate !== face);
    await cardAt(page, first).click();
    await cardAt(page, second).click();
    await resolveMismatch();
  }
  for (const pair of pairPositions(game)) {
    const first = pair[0];
    const second = pair[1];
    if (first === undefined || second === undefined) throw new Error('Pair fixture incomplete');
    await cardAt(page, first).click();
    await cardAt(page, second).click();
  }
}

export async function observeAnnouncements(page: Page): Promise<void> {
  await page.evaluate(() => {
    const region = document.querySelector('.screen-reader-output');
    if (region === null) throw new Error('Announcement region is missing');
    const observer = new MutationObserver((records) => {
      const events = records.flatMap((record) => Array.from(record.addedNodes))
        .filter((node): node is HTMLElement => node instanceof HTMLElement && node.tagName === 'SPAN')
        .map((node) => node.textContent ?? '');
      if (events.length > 0) {
        const previous = document.documentElement.getAttribute('data-announcement-events') ?? '';
        document.documentElement.setAttribute('data-announcement-events', [previous, ...events].filter(Boolean).join('\n'));
      }
    });
    observer.observe(region, { childList: true, subtree: true });
  });
}

export async function announcedTexts(page: Page): Promise<string[]> {
  const events = await page.locator('html').getAttribute('data-announcement-events');
  return events === null ? [] : events.split('\n').filter((text) => text !== '');
}

export function pairMoves(game: GameState): number {
  return pairPositions(game).length;
}
