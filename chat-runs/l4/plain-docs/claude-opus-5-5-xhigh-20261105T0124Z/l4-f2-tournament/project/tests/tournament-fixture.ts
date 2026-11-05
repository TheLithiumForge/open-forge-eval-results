import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { TOURNAMENT_FORMAT, TOURNAMENT_VERSION } from '../src/game/tournament/format.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import type { Page } from '@playwright/test';

export const FOUR = ['Ada', 'Bo', 'Cora', 'Dev'];
export const EIGHT = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
export const FOUR_CODES = ['np1-6-1', 'np1-6-2', 'np1-8-1'];
interface Played {
  moves: number;
  elapsedMs: number;
}

export function button(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

export async function openTournament(page: Page): Promise<void> {
  await button(page, DealControl.tournament).click();
  await expect(page.getByRole('heading', { name: TournamentControl.heading })).toBeFocused();
}

export async function enterPlayers(page: Page, names: readonly string[]): Promise<void> {
  await page
    .getByLabel(TournamentControl.players, { exact: true })
    .selectOption(String(names.length));
  for (const [index, name] of names.entries())
    await page.getByLabel(`${TournamentControl.player} ${index + 1}`, { exact: true }).fill(name);
}

// Tournament JSON with chosen deals, so a journey knows each board from the documented generator.
export function tournamentJson(
  players: readonly string[],
  codes: readonly string[],
  results: readonly Played[] = [],
): string {
  const matches = codes.map((boardCode, index) => ({
    attempts: results.slice(index * 2, index * 2 + 2).map(({ elapsedMs, moves }) => ({
      elapsedMs,
      moves,
    })),
    boardCode,
  }));
  return JSON.stringify({
    format: TOURNAMENT_FORMAT,
    matches,
    players,
    version: TOURNAMENT_VERSION,
  });
}

export async function loadTournament(page: Page, text: string): Promise<void> {
  await page.getByLabel(TournamentControl.json, { exact: true }).fill(text);
  await button(page, TournamentControl.loadJson).click();
}

export async function exportedTournament(page: Page): Promise<Record<string, unknown>> {
  await button(page, TournamentControl.exportJson).click();
  const value: unknown = JSON.parse(
    await page.getByLabel(TournamentControl.json, { exact: true }).inputValue(),
  );
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected an exported tournament object.');
  return Object.fromEntries(Object.entries(value));
}

function pairsOf(code: string): number[][] {
  const [, size = '', seed = ''] = /^np1-(\d+)-(\d+)$/.exec(code) ?? [];
  const deck = specDeal(Number(size), Number(seed));
  const pairs = new Map<number, number[]>();
  for (const [index, face] of deck.entries()) pairs.set(face, [...(pairs.get(face) ?? []), index]);
  return [...pairs.values()];
}

// Starts the shown turn and finishes its board. Each miss adds one move, and `waitMs` adds
// active time after the first reveal, using the page's installed clock.
export async function playTurn(page: Page, code: string, misses = 0, waitMs = 0): Promise<void> {
  const pairs = pairsOf(code);
  await button(page, TournamentControl.startTurn).click();
  const cards = page.locator('.card');
  await expect(cards.first()).toBeFocused();
  for (let miss = 0; miss < misses; miss += 1) {
    await cards.nth(pairs[0]?.[0] ?? 0).click();
    await cards.nth(pairs[1]?.[0] ?? 0).click();
    await page.clock.runFor(800);
  }
  for (const [turn, pair] of pairs.entries())
    for (const [side, index] of pair.entries()) {
      await cards.nth(index).click();
      if (turn === 0 && side === 0 && waitMs) await page.clock.runFor(waitMs);
    }
  await expect(page.locator('.card.matched')).toHaveCount(pairs.length * 2);
}
