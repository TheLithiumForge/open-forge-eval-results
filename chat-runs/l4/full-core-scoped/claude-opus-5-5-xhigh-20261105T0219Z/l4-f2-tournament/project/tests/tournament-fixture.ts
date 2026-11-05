import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { parseBoardCode } from '../src/game/deck.ts';
import { playerLabel, TournamentControl } from '../src/game/tournament/labels.ts';
import type { Page } from '@playwright/test';

export const PLAYERS = ['Ada', 'Bo', 'Cora', 'Dev'];

export function button(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

export async function openTournament(page: Page): Promise<void> {
  await button(page, TournamentControl.open).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
}

export async function enterPlayers(page: Page, names: readonly string[]): Promise<void> {
  await page
    .getByLabel(TournamentControl.players, { exact: true })
    .selectOption(String(names.length));
  for (const [index, name] of names.entries())
    await page.getByLabel(playerLabel(index + 1), { exact: true }).fill(name);
}

export async function exportedTournament(page: Page): Promise<Record<string, unknown>> {
  await button(page, TournamentControl.exportTournament).click();
  const value: unknown = JSON.parse(
    await page.getByLabel(TournamentControl.json, { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected an exported tournament object.');
  return value;
}

export function boardCodes(value: Record<string, unknown>): string[] {
  const matches = value.matches;
  if (!Array.isArray(matches)) throw new Error('Expected tournament matches.');
  return matches.map((match: unknown) => {
    if (!isJsonObject(match) || typeof match.boardCode !== 'string')
      throw new Error('Expected a match board code.');
    return match.boardCode;
  });
}

// Pair positions for a code, from the independent deal reading.
function pairsOf(code: string): number[][] {
  const parsed = parseBoardCode(code);
  if (!parsed) throw new Error('Expected a valid board code.');
  const positions = new Map<number, number[]>();
  specDeal(parsed.size, parsed.seed).forEach((face, index) =>
    positions.set(face, [...(positions.get(face) ?? []), index]),
  );
  return [...positions.values()];
}

// Starts the turn and finishes its board. Each miss adds a move, and the wait adds active time
// before the final pair.
export async function playTurn(page: Page, code: string, misses = 0, waitMs = 0): Promise<void> {
  await button(page, TournamentControl.startTurn).click();
  const cards = page.locator('.card');
  await expect(cards.first()).toBeFocused();
  const pairs = pairsOf(code);
  for (let miss = 0; miss < misses; miss += 1) {
    await cards.nth(pairs[0]?.[0] ?? 0).click();
    await cards.nth(pairs[1]?.[0] ?? 0).click();
    await page.clock.runFor(800);
  }
  for (const [turn, pair] of pairs.entries()) {
    if (turn === pairs.length - 1) await page.clock.runFor(waitMs);
    for (const index of pair) await cards.nth(index).click();
  }
  await expect(cards).toHaveCount(0);
}

// A started four-player tournament with known deals and Ada's first result recorded.
export const LOADABLE = {
  format: 'neon-pairs/tournament',
  matches: [
    { boardCode: 'np1-6-1', results: [{ elapsedMs: 4000, moves: 18 }] },
    { boardCode: 'np1-6-2', results: [] },
    { boardCode: 'np1-8-1', results: [] },
  ],
  players: PLAYERS,
  version: 1,
};

export const FINISHED = {
  ...LOADABLE,
  matches: [
    {
      boardCode: 'np1-6-1',
      results: [
        { elapsedMs: 4000, moves: 18 },
        { elapsedMs: 1, moves: 20 },
      ],
    },
    {
      boardCode: 'np1-6-2',
      results: [
        { elapsedMs: 1, moves: 19 },
        { elapsedMs: 1, moves: 18 },
      ],
    },
    {
      boardCode: 'np1-8-1',
      results: [
        { elapsedMs: 9, moves: 40 },
        { elapsedMs: 9, moves: 40 },
      ],
    },
  ],
};
