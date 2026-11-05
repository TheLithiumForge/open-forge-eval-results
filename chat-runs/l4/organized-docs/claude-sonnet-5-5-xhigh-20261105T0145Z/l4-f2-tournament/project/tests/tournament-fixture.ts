import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import type { Page } from '@playwright/test';

const CLOCK_START = new Date('2026-01-01T00:00:00Z');
export const NAMES = ['Ada', 'Bo', 'Cora', 'Dev'];

export function button(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

// The clock stays paused, so active time moves only when a test runs it.
export async function openGame(page: Page, url: string): Promise<void> {
  await page.clock.install({ time: CLOCK_START });
  await page.goto(url);
  await page.clock.pauseAt(new Date(CLOCK_START.getTime() + 60_000));
}

export async function openTournament(page: Page): Promise<void> {
  await button(page, DealControl.tournament).click();
}

export async function fillNames(page: Page, names: readonly string[]): Promise<void> {
  await page
    .getByLabel(TournamentControl.players, { exact: true })
    .selectOption(String(names.length));
  for (const [index, name] of names.entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
}

export async function startTournament(page: Page, names: readonly string[] = NAMES): Promise<void> {
  await fillNames(page, names);
  await button(page, TournamentControl.start).click();
}

export async function exportedTournament(page: Page): Promise<Record<string, unknown>> {
  await button(page, TournamentControl.exportTournament).click();
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

interface Turn {
  // Extra moves wasted on one miss before the board is cleared.
  miss?: boolean;
  // Active milliseconds that pass after the first reveal.
  waitMs?: number;
}

// Plays the whole deal for a board code from the documented generator, with a controlled cost.
export async function playTurn(page: Page, code: string, turn: Turn = {}): Promise<void> {
  const [, size, seed] = /^np1-(\d+)-(\d+)$/.exec(code) ?? [];
  const deck = specDeal(Number(size), Number(seed));
  const cards = page.locator('.card');
  await expect(cards).toHaveCount(deck.length);
  const pairs: [number, number][] = [];
  const first = new Map<number, number>();
  for (const [index, face] of deck.entries()) {
    const partner = first.get(face);
    if (partner === undefined) first.set(face, index);
    else pairs.push([partner, index]);
  }
  let skipped = -1;
  if (turn.miss) {
    const other = deck.findIndex((face) => face !== deck[0]);
    await cards.nth(0).click();
    await cards.nth(other).click();
    await page.clock.runFor(800);
    await expect(page.locator('.card.revealed')).toHaveCount(0);
  } else if (turn.waitMs) {
    skipped = pairs[0]?.[0] ?? -1;
    await cards.nth(skipped).click();
    await page.clock.runFor(turn.waitMs);
  }
  for (const pair of pairs) {
    for (const index of pair) if (index !== skipped) await cards.nth(index).click();
    skipped = -1;
  }
  await expect(page.locator('.card.matched')).toHaveCount(deck.length);
}
