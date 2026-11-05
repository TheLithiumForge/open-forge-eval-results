import { expect } from './browser-test.ts';
import { decodeTournament } from '../src/game/tournament/tournament-format.ts';
import type { Page } from '@playwright/test';
import type { TournamentWorkspace } from '../src/game/tournament/tournament.ts';

export async function openTournament(page: Page, count = 4): Promise<void> {
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption(String(count));
  for (let index = 0; index < count; index++)
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(`Name ${index + 1}`);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
}

export async function exportedTournament(page: Page): Promise<TournamentWorkspace> {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const workspace = decodeTournament(
    await page.getByLabel('Tournament JSON', { exact: true }).inputValue(),
  );
  if (!workspace) throw new Error('Expected valid exported tournament JSON.');
  return workspace;
}

export async function completeTournamentBoard(page: Page, misses = 0): Promise<void> {
  const game = (await exportedTournament(page)).active?.game;
  if (!game) throw new Error('Expected an active turn.');
  const cards = page.locator('.card');
  const different = game.deck.findIndex((face) => face !== game.deck[0]);
  for (let miss = 0; miss < misses; miss++) {
    await cards.nth(0).click();
    await cards.nth(different).click();
    await page.clock.runFor(800);
  }
  const pairs = new Map<number, number[]>();
  game.deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
  for (const pair of pairs.values()) for (const index of pair) await cards.nth(index).click();
  await expect(cards).toHaveCount(0);
}
