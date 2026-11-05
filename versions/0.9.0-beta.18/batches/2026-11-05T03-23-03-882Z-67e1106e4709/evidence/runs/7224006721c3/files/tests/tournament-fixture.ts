import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { decodeTournament } from '../src/game/tournament/format.ts';
import type { Page } from '@playwright/test';

export async function setupTournament(page: Page, count: number): Promise<void> {
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await page.getByLabel('Players', { exact: true }).selectOption(String(count));
  const names = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
  for (let index = 0; index < count; index += 1)
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(names[index] ?? '');
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
}

export async function tournamentExport(page: Page) {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const text = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
  const document = decodeTournament(text);
  if (typeof document === 'string') throw new Error(document);
  return { text, document };
}

export async function finishTournamentTurn(page: Page, delay = 0): Promise<string> {
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  const { document } = await tournamentExport(page);
  const run = document.run;
  if (!run) throw new Error('Expected a tournament match.');
  const code = run.event.matches[run.matchIndex]?.boardCode;
  if (!code) throw new Error('Expected a tournament deal.');
  const [, sizeText, seedText] = code.split('-');
  const size = Number(sizeText);
  const deck = specDeal(size, Number(seedText));
  await expect(page.locator('.card')).toHaveCount(size ** 2);
  for (let face = 0; face < size ** 2 / 2; face += 1) {
    const first = deck.indexOf(face);
    const second = deck.lastIndexOf(face);
    await page.locator('.card').nth(first).click();
    if (face === 0 && delay) await page.clock.runFor(delay);
    await page.locator('.card').nth(second).click();
  }
  await expect(page.locator('.card')).toHaveCount(0);
  return code;
}

export function completedTournamentJson(): string {
  return JSON.stringify({
    format: 'neon-pairs/tournament',
    version: 1,
    setup: { count: 4, names: ['Ada', 'Bo', 'Cora', 'Dev', '', '', '', ''] },
    run: {
      matchIndex: 2,
      phase: 'complete',
      game: null,
      event: {
        players: ['Ada', 'Bo', 'Cora', 'Dev'],
        matches: [
          {
            boardCode: 'np1-6-1',
            results: [
              { moves: 18, elapsedMs: 1000 },
              { moves: 19, elapsedMs: 0 },
            ],
          },
          {
            boardCode: 'np1-6-2',
            results: [
              { moves: 18, elapsedMs: 0 },
              { moves: 18, elapsedMs: 1000 },
            ],
          },
          {
            boardCode: 'np1-8-1',
            results: [
              { moves: 32, elapsedMs: 0 },
              { moves: 32, elapsedMs: 0 },
            ],
          },
        ],
      },
    },
  });
}
