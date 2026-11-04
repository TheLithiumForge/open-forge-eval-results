import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { generateDeck } from '../src/game/deck.ts';
import type { Size } from '../src/game/boardCode.ts';

export const VECTOR = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
export const cards = (page: Page) => page.locator('.card');

export async function loadBoard(page: Page, size: Size = 4) {
  const details = page.locator('details');
  if (!(await details.evaluate(element => element.hasAttribute('open')))) await page.getByText('Reproduce a game', { exact: true }).click();
  await page.getByLabel('Board code', { exact: true }).fill(`np1-${size}-1`);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(cards(page)).toHaveCount(size * size);
}

export async function exported(page: Page) {
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  return page.getByLabel('Snapshot JSON', { exact: true }).inputValue();
}

export async function finish(page: Page, size: Size = 4) {
  const deck = size === 4 ? VECTOR : generateDeck(size, 1);
  if (size > 4) {
    const order = Array.from({ length: size * size / 2 }, (_, face) => [deck.indexOf(face), deck.lastIndexOf(face)]).flat();
    // Bulk completion checks all faces through native buttons; the separate
    // pointer, touch and keyboard journeys cover physical input and scrolling.
    await cards(page).evaluateAll((elements, indices) => {
      for (const index of indices) {
        const element = elements[index];
        if (!(element instanceof HTMLButtonElement)) throw new Error('Missing card button');
        element.click();
      }
    }, order);
    return;
  }
  for (let face = 0; face < size * size / 2; face++) {
    await cards(page).nth(deck.indexOf(face)).press('Enter');
    await cards(page).nth(deck.lastIndexOf(face)).press('Space');
  }
}

export const sample = {
  version: 1, boardCode: 'np1-4-1', matched: [0, 11],
  selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
  moves: 2, elapsedMs: 1500, started: true,
};
