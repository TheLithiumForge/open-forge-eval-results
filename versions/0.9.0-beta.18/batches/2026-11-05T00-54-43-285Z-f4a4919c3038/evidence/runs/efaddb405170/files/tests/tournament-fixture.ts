import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { decodeTournament } from '../src/game/tournament/format.ts';
import type { Page } from '@playwright/test';

const TOURNAMENT_NAMES = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];

export async function enterTournament(page: Page, count: number): Promise<void> {
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await page.getByLabel('Players', { exact: true }).selectOption(String(count));
  for (const [index, name] of TOURNAMENT_NAMES.slice(0, count).entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
}

export async function tournamentExport(page: Page) {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const text = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
  const decoded = decodeTournament(text);
  if (!decoded.state) throw new Error(decoded.error ?? 'Expected tournament data.');
  return { text, state: decoded.state };
}

export async function finishTournamentTurn(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  const { state } = await tournamentExport(page);
  const code = state.game?.boardCode;
  if (!code) throw new Error('Expected an active tournament game.');
  const [, side, seed] = code.split('-');
  const size = Number(side);
  const deck = specDeal(size, Number(seed));
  await expect(page.locator('.card')).toHaveCount(size ** 2);
  for (let face = 0; face < size ** 2 / 2; face += 1)
    for (const [index, value] of deck.entries())
      if (face === value) await page.locator('.card').nth(index).click();
  await expect(page.locator('.card')).toHaveCount(0);
  return code;
}
