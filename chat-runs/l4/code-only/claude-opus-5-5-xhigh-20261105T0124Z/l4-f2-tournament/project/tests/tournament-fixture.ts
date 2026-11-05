import { expect } from './browser-test.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { MISMATCH_MS } from '../src/game/game.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { playerLabel, TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import type { Page } from '@playwright/test';

export const FOUR_PLAYERS = ['Ann', 'Ben', 'Cy', 'Di'];

export function button(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

export async function openTournament(page: Page): Promise<void> {
  await button(page, DealControl.tournament).click();
  await expect(
    page.getByRole('heading', { name: TournamentControl.heading, exact: true }),
  ).toBeFocused();
}

export async function enterPlayers(page: Page, names: readonly string[]): Promise<void> {
  await page
    .getByLabel(TournamentControl.players, { exact: true })
    .selectOption(String(names.length));
  for (const [seat, name] of names.entries())
    await page.getByLabel(playerLabel(seat), { exact: true }).fill(name);
}

export async function exportedTournament(page: Page): Promise<Record<string, unknown>> {
  await button(page, TournamentControl.exportTournament).click();
  const value: unknown = JSON.parse(
    await page.getByLabel(TournamentControl.json, { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected an exported tournament object.');
  return value;
}

export async function loadTournament(page: Page, value: unknown): Promise<void> {
  await page.getByLabel(TournamentControl.json, { exact: true }).fill(JSON.stringify(value));
  await button(page, TournamentControl.loadTournament).click();
}

// Every match deals the example board, so each turn can find its pairs without looking.
export async function dealExampleBoards(page: Page): Promise<void> {
  const value = await exportedTournament(page);
  if (!Array.isArray(value.matches)) throw new Error('Expected tournament matches.');
  const matches: unknown[] = value.matches;
  await loadTournament(page, {
    ...value,
    matches: matches.map((match) =>
      isJsonObject(match) ? { ...match, boardCode: EXAMPLE_CODE } : match,
    ),
  });
}

// Plays the example board after the given misses. Each found pair takes the given time.
export async function playTurn(page: Page, misses: number, pairMs: number): Promise<void> {
  await button(page, TournamentControl.startTurn).click();
  await expect(page.locator('.card').first()).toBeFocused();
  for (let miss = 0; miss < misses; miss += 1) {
    await page.locator('.card').nth(0).click();
    await page.locator('.card').nth(1).click();
    await page.clock.runFor(MISMATCH_MS);
  }
  for (const [first, second] of EXAMPLE_PAIRS) {
    await page.locator('.card').nth(first).click();
    await page.clock.runFor(pairMs);
    await page.locator('.card').nth(second).click();
  }
}

// One row per player: name, moves and time, then the match winner.
export function matchRows(page: Page, match: number) {
  return page
    .locator('.match')
    .nth(match)
    .locator('tbody tr, tfoot tr')
    .evaluateAll((rows) =>
      rows.map((row) =>
        [...row.children].map((cell) => (cell.textContent ?? '').trim()).join(' | '),
      ),
    );
}
