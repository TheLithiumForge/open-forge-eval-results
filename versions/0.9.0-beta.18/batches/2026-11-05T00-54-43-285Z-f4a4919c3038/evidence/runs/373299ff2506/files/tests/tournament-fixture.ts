import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { decodeTournamentDocument } from '../src/game/tournament/tournament-document.ts';
import type { Page } from '@playwright/test';
import type { TournamentDocument } from '../src/game/tournament/tournament-document.ts';

export const TOURNAMENT_NAMES = ['Ada', 'Bo', 'Cy', 'Dee', 'Eli', 'Flo', 'Gia', 'Hal'];

export async function setupTournament(page: Page, players = 4): Promise<void> {
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption(String(players));
  for (const [index, name] of TOURNAMENT_NAMES.slice(0, players).entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Now playing: Ada', exact: true })).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(0);
}

export async function tournamentExport(page: Page): Promise<TournamentDocument> {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const document = decodeTournamentDocument(await page.getByLabel('Tournament JSON').inputValue());
  if (!document) throw new Error('Expected a valid tournament export.');
  return document;
}

export async function finishTournamentGame(
  page: Page,
  code: string,
  misses = 0,
  elapsedMs = 1000,
): Promise<void> {
  const [, size, seed] = code.split('-');
  const deck = specDeal(Number(size), Number(seed));
  const different = deck.findIndex((face) => face !== deck[0]);
  for (let miss = 0; miss < misses; miss++) {
    await page.locator('.card').nth(0).click();
    await page.locator('.card').nth(different).click();
    await page.clock.runFor(800);
  }
  const pairs = new Map<number, number[]>();
  for (const [index, face] of deck.entries()) {
    const pair = pairs.get(face) ?? [];
    pair.push(index);
    pairs.set(face, pair);
  }
  let first = true;
  for (const pair of pairs.values()) {
    for (const index of pair) {
      await page.locator('.card').nth(index).click();
      if (first) await page.clock.runFor(elapsedMs);
      first = false;
    }
  }
  await expect(page.locator('.card')).toHaveCount(0);
}
