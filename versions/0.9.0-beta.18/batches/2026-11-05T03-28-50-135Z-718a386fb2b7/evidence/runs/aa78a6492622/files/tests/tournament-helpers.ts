import { generateBoard } from '../src/game/deck.ts';
import { expect } from './browser-test.ts';
import type { Page } from '@playwright/test';

export async function matchCode(page: Page, index: number): Promise<string> {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const value: unknown = JSON.parse(
    await page.getByRole('textbox', { name: 'Tournament JSON', exact: true }).inputValue(),
  );
  if (!value || typeof value !== 'object' || !('data' in value))
    throw new Error('No tournament data.');
  const data = value.data;
  if (!data || typeof data !== 'object' || !('matches' in data) || !Array.isArray(data.matches))
    throw new Error('No bracket matches.');
  const match: unknown = data.matches[index];
  if (
    !match ||
    typeof match !== 'object' ||
    !('boardCode' in match) ||
    typeof match.boardCode !== 'string'
  )
    throw new Error('Missing match deal code.');
  return match.boardCode;
}

export async function finishTurn(page: Page, code: string): Promise<void> {
  const deck = generateBoard(code).deck;
  const first = new Map<number, number>();
  const pairs: [number, number][] = [];
  deck.forEach((face, index) => {
    const previous = first.get(face);
    if (previous === undefined) first.set(face, index);
    else pairs.push([previous, index]);
  });
  for (const [firstIndex, secondIndex] of pairs) {
    await page.locator('.card').nth(firstIndex).click();
    await page.locator('.card').nth(secondIndex).click();
  }
  const matched = await page.locator('.card.matched').count();
  if (matched === deck.length) return;
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const event = JSON.parse(
    await page.getByRole('textbox', { name: 'Tournament JSON', exact: true }).inputValue(),
  ).data;
  if (event.phase === 'finished') return;
  throw new Error(
    `Turn did not complete: phase=${event.phase}, turn=${event.currentTurn}, moves=${event.game?.moves}, matched=${event.game?.matched?.length}, expected=${deck.length}.`,
  );
}

export async function assertTargetSizes(page: Page, selector: string): Promise<void> {
  const boxes = await page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const { width, height } = element.getBoundingClientRect();
      return { width, height };
    }),
  );
  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) {
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
}
