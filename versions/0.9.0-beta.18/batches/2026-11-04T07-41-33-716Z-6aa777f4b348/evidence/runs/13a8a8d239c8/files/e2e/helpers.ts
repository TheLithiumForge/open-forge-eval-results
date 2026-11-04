import { expect, type Page } from '@playwright/test';
import { parseBoardCode, type GridSize } from '../src/game/board.ts';
import { faceName } from '../src/game/board/faces.ts';

export function parseJson(text: string): unknown {
  return JSON.parse(text);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function boardCodeFor(size: GridSize): string {
  return `np1-${size}-1`;
}

export async function openReproduction(page: Page): Promise<void> {
  const summary = page.getByText('Reproduce a game', { exact: true });
  if (await page.locator('details').getAttribute('open') === null) await summary.click();
}

export async function loadBoard(page: Page, code: string): Promise<void> {
  await openReproduction(page);
  await page.getByLabel('Board code').fill(code);
  await page.getByRole('button', { name: 'Load board' }).click();
}

export async function cardNames(code: string): Promise<string[]> {
  const board = parseBoardCode(code);
  if (board === null) throw new Error('The fixture board code must be valid.');
  return board.deck.map((face, index) => {
    const row = Math.floor(index / board.size) + 1;
    const column = (index % board.size) + 1;
    return `Row ${row}, column ${column}, ${faceName(face)}, revealed`;
  });
}

export async function winPairs(page: Page, code: string): Promise<void> {
  const board = parseBoardCode(code);
  if (board === null) throw new Error('The fixture board code must be valid.');
  const groups = new Map<number, number[]>();
  board.deck.forEach((face, index) => groups.set(face, [...(groups.get(face) ?? []), index]));
  const pairs = [...groups.values()];
  await page.evaluate((positions) => {
    const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('.memory-card'));
    for (const pair of positions) {
      const first = pair[0];
      const second = pair[1];
      if (first !== undefined) cards[first]?.click();
      if (second !== undefined) cards[second]?.click();
    }
  }, pairs);
}

export async function expectBoardSize(page: Page, size: GridSize): Promise<void> {
  await expect(page.getByRole('group', { name: `${size} by ${size} memory board` })).toBeVisible();
  await expect(page.locator('.memory-card')).toHaveCount(size * size);
}
