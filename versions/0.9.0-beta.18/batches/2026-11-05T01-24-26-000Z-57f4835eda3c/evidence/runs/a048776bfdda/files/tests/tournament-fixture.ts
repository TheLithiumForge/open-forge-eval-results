import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import type { Page } from '@playwright/test';

export const FOUR = ['Ada', 'Bo', 'Cora', 'Dev'];
export const EIGHT = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];

export async function openTournament(page: Page): Promise<void> {
  await page.getByRole('button', { name: DealControl.tournament, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
}

export async function enterPlayers(page: Page, names: readonly string[]): Promise<void> {
  await page.getByLabel('Players', { exact: true }).selectOption(String(names.length));
  for (const [index, name] of names.entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
}

export async function exportedTournament(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const value: unknown = JSON.parse(
    await page.getByLabel('Tournament JSON', { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected an exported tournament object.');
  return value;
}

export async function boardCodes(page: Page): Promise<string[]> {
  const { matches } = await exportedTournament(page);
  if (!Array.isArray(matches)) throw new Error('Expected tournament matches.');
  return matches.map((match: unknown) => {
    if (!isJsonObject(match) || typeof match.boardCode !== 'string')
      throw new Error('Expected a board code.');
    return match.boardCode;
  });
}

// Plays the current turn from its deal. A miss first adds one move and 800ms of active time.
export async function playTurn(page: Page, code: string, misses = 0): Promise<void> {
  const [, size = 0, seed = 0] = code.split('-').map(Number);
  const deck = specDeal(size, seed);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  const cards = page.locator('.card');
  await expect(cards).toHaveCount(deck.length);
  for (let miss = 0; miss < misses; miss += 1) {
    const other = deck.findIndex((face, index) => index > 0 && face !== deck[0]);
    await cards.nth(0).click();
    await cards.nth(other).click();
    await page.clock.runFor(800);
    await expect(page.locator('.card.revealed')).toHaveCount(0);
  }
  for (let face = 0; face < deck.length / 2; face += 1)
    for (const [index, value] of deck.entries()) if (value === face) await cards.nth(index).click();
}
