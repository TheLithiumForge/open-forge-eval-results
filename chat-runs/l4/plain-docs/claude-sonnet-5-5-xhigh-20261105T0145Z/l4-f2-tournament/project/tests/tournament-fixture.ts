import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import type { Page } from '@playwright/test';

const CLOCK_START = new Date('2026-01-01T00:00:00Z');
const CLOCK_PAUSE = new Date(CLOCK_START.getTime() + 60_000);
const MISMATCH_MS = 800;

export const FOUR_PLAYERS = ['Ada', 'Bo', 'Cora', 'Dev'];
export const EIGHT_PLAYERS = [...FOUR_PLAYERS, 'Emi', 'Finn', 'Gia', 'Hal'];

// Time stands still until a test runs the clock, so every result is exact.
export async function loadPausedGame(page: Page, url: string): Promise<void> {
  await page.clock.install({ time: CLOCK_START });
  await page.goto(url);
  await page.clock.pauseAt(CLOCK_PAUSE);
}

export async function openTournament(page: Page): Promise<void> {
  await page.getByRole('button', { name: DealControl.tournament, exact: true }).click();
}

export async function fillNames(page: Page, names: readonly string[]): Promise<void> {
  await page
    .getByLabel(TournamentControl.players, { exact: true })
    .selectOption(String(names.length));
  for (const [index, name] of names.entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
}

export async function startTournament(page: Page, names: readonly string[]): Promise<void> {
  await fillNames(page, names);
  await page.getByRole('button', { name: TournamentControl.start, exact: true }).click();
}

export async function exportedTournament(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole('button', { name: TournamentControl.exportJson, exact: true }).click();
  const value: unknown = JSON.parse(
    await page.getByLabel(TournamentControl.json, { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected an exported tournament object.');
  return value;
}

export async function boardCodes(page: Page): Promise<string[]> {
  const matches = (await exportedTournament(page)).matches;
  if (!Array.isArray(matches)) throw new Error('Expected matches.');
  return matches.map((match) => (isJsonObject(match) ? String(match.boardCode) : ''));
}

function pairsOf(code: string): number[][] {
  const [, size, seed] = code.split('-');
  const positions = new Map<number, number[]>();
  for (const [index, face] of specDeal(Number(size), Number(seed)).entries())
    positions.set(face, [...(positions.get(face) ?? []), index]);
  return [...positions.values()];
}

export async function button(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

// Two positions whose faces differ, so revealing both is a miss.
export function missPositions(code: string): [number, number] {
  const pairs = pairsOf(code);
  return [pairs[0]?.[0] ?? 0, pairs[1]?.[0] ?? 1];
}

// Starts the turn and plays the deal to the end. Each miss costs one extra move. `thinkMs` passes
// after the first reveal, before the board is finished.
export async function playTurn(page: Page, code: string, misses = 0, thinkMs = 0): Promise<void> {
  await (await button(page, TournamentControl.startTurn)).click();
  const pairs = pairsOf(code);
  const cards = page.locator('.card');
  await expect(cards).toHaveCount(Number(code.split('-')[1]) ** 2);
  const [first, second] = missPositions(code);
  for (let miss = 0; miss < misses; miss += 1) {
    await cards.nth(first).click();
    await cards.nth(second).click();
    await page.clock.runFor(MISMATCH_MS);
  }
  if (thinkMs) {
    await cards.nth(first).click();
    await page.clock.runFor(thinkMs);
  }
  for (const pair of pairs) for (const index of pair) await cards.nth(index).click();
  await expect(page.locator('.card.matched')).toHaveCount(Number(code.split('-')[1]) ** 2);
}

export async function faceNames(page: Page): Promise<(string | null)[]> {
  return page
    .locator('.card')
    .evaluateAll((cards) => cards.map((card) => card.getAttribute('aria-label')));
}
