import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { parseBoardCode } from '../src/game/deck.ts';
import { decodeTournament } from '../src/game/tournament/format.ts';
import type { Page } from '@playwright/test';
import type { TournamentState } from '../src/game/tournament/rules.ts';

export const ENTRANTS = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];

export async function enterTournament(page: Page, count = 4): Promise<void> {
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await page.getByLabel('Players', { exact: true }).selectOption(String(count));
  for (const [index, name] of ENTRANTS.slice(0, count).entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByText('Now playing: Ada', { exact: true })).toBeVisible();
}

export async function tournamentState(page: Page): Promise<TournamentState> {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const text = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
  const decoded = decodeTournament(text);
  if (!decoded.state) throw new Error(decoded.problem);
  return decoded.state;
}

export async function finishTournamentTurn(page: Page, code: string, miss = false): Promise<void> {
  const parsed = parseBoardCode(code);
  if (!parsed) throw new Error('Expected a board code.');
  const deck = specDeal(parsed.size, parsed.seed);
  const cards = page.locator('.card');
  if (miss) {
    await cards.nth(0).click();
    await cards.nth(deck.findIndex((face) => face !== deck[0])).click();
    await page.clock.runFor(800);
  }
  for (let face = 0; face < deck.length / 2; face++) {
    await cards.nth(deck.indexOf(face)).click();
    await cards.nth(deck.lastIndexOf(face)).click();
  }
  await expect(page.locator('.card')).toHaveCount(0);
}
