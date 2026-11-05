import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { parseBoardCode } from '../src/game/deck.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import type { Page } from '@playwright/test';

export function button(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

export async function startTournament(page: Page, names: readonly string[]): Promise<void> {
  await button(page, TournamentControl.open).click();
  await page
    .getByLabel(TournamentControl.players, { exact: true })
    .selectOption(String(names.length));
  for (const [index, name] of names.entries())
    await page.getByLabel(`${TournamentControl.player} ${index + 1}`, { exact: true }).fill(name);
  await button(page, TournamentControl.start).click();
}

async function exportedTournament(page: Page): Promise<Record<string, unknown>> {
  await button(page, TournamentControl.exportTournament).click();
  const text = await page.getByLabel(TournamentControl.json, { exact: true }).inputValue();
  const value: unknown = JSON.parse(text);
  if (!isJsonObject(value)) throw new Error('Expected an exported tournament object.');
  return value;
}

// Board codes of every match, round by round, as the export lists them.
export async function matchCodes(page: Page): Promise<string[][]> {
  const { rounds } = await exportedTournament(page);
  if (!Array.isArray(rounds)) throw new Error('Expected tournament rounds.');
  return rounds.map((round: unknown) =>
    Array.isArray(round)
      ? round.map((match: unknown) => (isJsonObject(match) ? String(match.boardCode) : ''))
      : [],
  );
}

// The position pairs of a deal, read from its code with the independent oracle.
function pairsOf(code: string): number[][] {
  const parsed = parseBoardCode(code);
  if (!parsed) throw new Error(`Invalid code ${code}`);
  const positions = new Map<number, number[]>();
  for (const [index, face] of specDeal(parsed.size, parsed.seed).entries())
    positions.set(face, [...(positions.get(face) ?? []), index]);
  return [...positions.values()];
}

// Starts the turn on the given deal, misses as often as asked, then finds every pair.
export async function playTurn(page: Page, code: string, misses = 0): Promise<void> {
  await button(page, TournamentControl.startTurn).click();
  const cards = page.locator('.tournament .card');
  const pairs = pairsOf(code);
  await expect(cards).toHaveCount(pairs.length * 2);
  await expect(cards.first()).toBeFocused();
  const [first = [], second = []] = pairs;
  for (let miss = 0; miss < misses; miss++) {
    await cards.nth(first[0] ?? 0).click();
    await cards.nth(second[0] ?? 0).click();
    await page.clock.runFor(800);
  }
  for (const pair of pairs) for (const index of pair) await cards.nth(index).click();
  // The final turn of the final replaces the board with the champion, so read the result instead.
  await expect(page.getByRole('status')).toHaveText(/^Pair found\. All pairs found in /);
}
