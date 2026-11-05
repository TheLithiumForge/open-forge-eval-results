import { expect } from './browser-test.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { specDeal } from './deal-oracle.ts';
import type { Page } from '@playwright/test';

export async function tournamentJSON(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const value: unknown = JSON.parse(
    await page.getByLabel('Tournament JSON', { exact: true }).inputValue(),
  );
  if (!isJsonObject(value) || !isJsonObject(value.state)) throw Error('Expected tournament JSON.');
  return value.state;
}

export async function enterTournament(page: Page, count = 4): Promise<void> {
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await page.getByLabel('Players', { exact: true }).selectOption(String(count));
  const names = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
  for (let index = 0; index < count; index += 1)
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(names[index] ?? '');
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
}

export async function playTournamentTurn(page: Page, miss = false): Promise<string> {
  const state = await tournamentJSON(page);
  const game = state.game;
  if (!isJsonObject(game) || typeof game.boardCode !== 'string') throw Error('Expected a deal.');
  const [, sizeText, seedText] = game.boardCode.split('-');
  const deck = specDeal(Number(sizeText), Number(seedText));
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(deck.length);
  if (miss) {
    const other = deck.findIndex((face) => face !== deck[0]);
    await page.locator('.card').nth(0).click({ force: true });
    await page.locator('.card').nth(other).click({ force: true });
    await page.clock.runFor(800);
  }
  for (const face of new Set(deck))
    for (const [index, value] of deck.entries())
      if (value === face) await page.locator('.card').nth(index).click({ force: true });
  return game.boardCode;
}
