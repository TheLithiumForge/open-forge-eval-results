import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import type { Page } from '@playwright/test';

const TOURNAMENT_NAMES = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];

export async function startBrowserTournament(page: Page, count: 4 | 8 = 4): Promise<void> {
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await page.getByLabel('Players', { exact: true }).selectOption(String(count));
  for (let index = 0; index < count; index += 1)
    await page
      .getByLabel(`Player ${index + 1}`, { exact: true })
      .fill(TOURNAMENT_NAMES[index] ?? '');
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
}

export async function tournamentText(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  return page.getByLabel('Tournament JSON', { exact: true }).inputValue();
}

export async function tournamentCodes(page: Page): Promise<string[]> {
  const document: unknown = JSON.parse(await tournamentText(page));
  if (
    !isJsonObject(document) ||
    !isJsonObject(document.tournament) ||
    !Array.isArray(document.tournament.matches)
  )
    throw new Error('Expected a tournament export.');
  return document.tournament.matches.map((match: unknown) => {
    if (!isJsonObject(match) || typeof match.boardCode !== 'string')
      throw new Error('Expected a match deal.');
    return match.boardCode;
  });
}

export async function solveTournamentDeal(page: Page, code: string): Promise<void> {
  const [, sizeText = '', seedText = ''] = code.split('-');
  const deck = specDeal(Number(sizeText), Number(seedText));
  for (let face = 0; face < deck.length / 2; face += 1) {
    await page.locator('.card').nth(deck.indexOf(face)).click();
    await page.locator('.card').nth(deck.lastIndexOf(face)).click();
  }
}
