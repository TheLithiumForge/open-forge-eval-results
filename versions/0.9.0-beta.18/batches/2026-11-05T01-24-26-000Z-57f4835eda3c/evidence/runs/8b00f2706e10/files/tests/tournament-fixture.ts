import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import type { Locator, Page } from '@playwright/test';

const CLOCK_START = new Date('2026-01-01T00:00:00Z');

interface ExportedMatch {
  boardCode: string;
  results: unknown[];
}

export function button(scope: Page | Locator, name: string) {
  return scope.getByRole('button', { name, exact: true });
}

// Installs a paused clock, so active time moves only when a journey runs it.
export async function openTournament(page: Page, url: string): Promise<void> {
  await page.clock.install({ time: CLOCK_START });
  await page.goto(url);
  await page.clock.pauseAt(new Date(CLOCK_START.getTime() + 60_000));
  await button(page, DealControl.tournament).click();
  await expect(page.getByRole('heading', { name: TournamentControl.heading })).toBeFocused();
}

export async function startTournament(page: Page, names: readonly string[]): Promise<void> {
  await page.getByLabel(TournamentControl.players, { exact: true }).selectOption(`${names.length}`);
  for (const [index, name] of names.entries())
    await page.getByLabel(`${TournamentControl.player} ${index + 1}`, { exact: true }).fill(name);
  await button(page, TournamentControl.start).click();
}

export async function exportedMatches(page: Page): Promise<ExportedMatch[]> {
  await button(page, TournamentControl.exportTournament).click();
  const value: unknown = JSON.parse(
    await page.getByLabel(TournamentControl.json, { exact: true }).inputValue(),
  );
  if (!isJsonObject(value) || !Array.isArray(value.matches)) throw new Error('Expected matches.');
  return value.matches.map((match: unknown) => {
    if (
      !isJsonObject(match) ||
      typeof match.boardCode !== 'string' ||
      !Array.isArray(match.results)
    )
      throw new Error('Expected an exported match.');
    return { boardCode: match.boardCode, results: match.results };
  });
}

// Plays one turn on a known deal: each miss costs a move, then every pair is matched in order.
// Active time runs for the given milliseconds before the final pair.
export async function playTurn(
  page: Page,
  code: string,
  misses: number,
  elapsedMs = 0,
): Promise<void> {
  const [, size = 0, seed = 0] = code.split('-').map(Number);
  const deck = specDeal(size, seed);
  await button(page, TournamentControl.startTurn).click();
  await expect(page.locator('.card').first()).toBeFocused();
  const cards = page.locator('.card');
  const pairs = deck
    .map((face, index) => [index, deck.indexOf(face, index + 1)])
    .filter(([, other]) => (other ?? -1) >= 0);
  const [first, second] = pairs;
  for (let miss = 0; miss < misses && first && second; miss += 1) {
    await cards.nth(first[0] ?? 0).click();
    await cards.nth(second[0] ?? 0).click();
    await page.clock.runFor(800);
  }
  for (const [pair, indices] of pairs.entries()) {
    if (pair === pairs.length - 1 && elapsedMs) await page.clock.runFor(elapsedMs);
    for (const index of indices) await cards.nth(index).click();
  }
  await expect(page.locator('.card.matched')).toHaveCount(size * size);
}
