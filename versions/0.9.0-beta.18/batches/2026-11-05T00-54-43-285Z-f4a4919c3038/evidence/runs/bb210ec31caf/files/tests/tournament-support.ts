import assert from 'node:assert/strict';
import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { readTournament } from '../src/game/tournament/format.ts';
import type { Page } from '@playwright/test';

export async function tournamentExport(page: Page) {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const text = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
  const result = readTournament(text);
  assert.ok(result.archive?.tournament && result.archive.game, result.error);
  return { text, tournament: result.archive.tournament, game: result.archive.game };
}

export async function enterTournament(page: Page, count = 4): Promise<void> {
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await page.getByLabel('Players', { exact: true }).selectOption(String(count));
  const names = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
  for (let index = 0; index < count; index += 1)
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(names[index] ?? '');
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start turn', exact: true })).toBeVisible();
}

export async function finishTournamentTurn(page: Page, miss = false): Promise<string> {
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  const { game } = await tournamentExport(page);
  const deck = specDeal(game.size, game.seed);
  if (miss) {
    const other = deck.findIndex((face) => face !== deck[0]);
    await page.locator('.card').nth(0).click();
    await page.locator('.card').nth(other).click();
    await page.clock.runFor(800);
  }
  for (let face = 0; face < deck.length / 2; face += 1)
    for (const [index, value] of deck.entries())
      if (value === face) await page.locator('.card').nth(index).click();
  return game.boardCode;
}
