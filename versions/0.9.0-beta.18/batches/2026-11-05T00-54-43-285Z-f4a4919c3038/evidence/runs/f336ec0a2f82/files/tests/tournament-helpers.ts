import { expect } from './browser-test.ts';
import { decodeTournament, encodeTournament } from '../src/game/tournament/tournament-format.ts';
import { parseBoardCode } from '../src/game/deck.ts';
import { specDeal } from './deal-oracle.ts';
import type { TournamentArchive } from '../src/game/tournament/tournament-format.ts';
import type { Page } from '@playwright/test';

export async function exportedTournament(page: Page): Promise<TournamentArchive> {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const archive = decodeTournament(
    await page.getByLabel('Tournament JSON', { exact: true }).inputValue(),
  );
  if (!archive) throw new Error('Expected valid tournament JSON.');
  return archive;
}

export async function loadTournamentDraft(page: Page, archive: TournamentArchive): Promise<void> {
  await page.getByLabel('Tournament JSON', { exact: true }).fill(encodeTournament(archive));
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
}

export async function startNamedTournament(page: Page, count: number): Promise<void> {
  await page.getByLabel('Players', { exact: true }).selectOption(String(count));
  await expect(page.locator('.tournament-names input')).toHaveCount(count);
  for (let index = 0; index < count; index++)
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(`  Name ${index + 1}  `);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Now playing: Name 1', exact: true }),
  ).toBeVisible();
}

export function tournamentDeal(code: string): { pairs: readonly number[][]; mismatch: number } {
  const parsed = parseBoardCode(code);
  if (!parsed) throw new Error('Expected a tournament deal.');
  const deck = specDeal(parsed.size, parsed.seed);
  const pairs = new Map<number, number[]>();
  deck.forEach((face, index) => {
    const indices = pairs.get(face) ?? [];
    indices.push(index);
    pairs.set(face, indices);
  });
  return { pairs: [...pairs.values()], mismatch: deck.findIndex((face) => face !== deck[0]) };
}
