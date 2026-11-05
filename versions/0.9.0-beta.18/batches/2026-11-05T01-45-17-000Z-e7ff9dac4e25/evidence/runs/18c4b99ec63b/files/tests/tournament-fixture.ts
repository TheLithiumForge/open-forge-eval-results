import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { parseBoardCode } from '../src/game/deck.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { playerLabel, TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import type { Page } from '@playwright/test';

export const NAMES = ['Ann', 'Ben', 'Cy', 'Dee', 'Eve', 'Fay', 'Gus', 'Hal'];
export const FOUR = NAMES.slice(0, 4);

export function button(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

export async function openTournament(page: Page): Promise<void> {
  await button(page, DealControl.tournament).click();
  await expect(
    page.getByRole('heading', { name: TournamentControl.heading, level: 2 }),
  ).toBeVisible();
}

export async function fillPlayers(page: Page, names: readonly string[]): Promise<void> {
  const players = page.getByLabel(TournamentControl.players, { exact: true });
  await players.selectOption(String(names.length));
  for (const [index, name] of names.entries())
    await page.getByLabel(playerLabel(index + 1), { exact: true }).fill(name);
}

export async function startTournament(page: Page, names: readonly string[]): Promise<void> {
  await openTournament(page);
  await fillPlayers(page, names);
  await button(page, TournamentControl.start).click();
}

// The deal both players of the current match play, as the screen names it.
export async function currentDeal(page: Page): Promise<string> {
  const text = await page.getByText(/Both players play deal/).textContent();
  const code = /deal (np1-\d+-\d+)\./.exec(text ?? '')?.[1];
  if (!code) throw new Error('Expected the deal of the current match.');
  return code;
}

// Plays one player's game on the current deal. Each extra move is a mismatch that closes again.
export async function playTurn(page: Page, extraMoves = 0): Promise<void> {
  const deal = parseBoardCode(await currentDeal(page));
  if (!deal) throw new Error('Expected a valid deal.');
  await button(page, TournamentControl.startTurn).click();
  const deck = specDeal(deal.size, deal.seed);
  const cards = page.locator('.card');
  await expect(cards).toHaveCount(deal.size ** 2);
  const other = deck.findIndex((face) => face !== deck[0]);
  for (let miss = 0; miss < extraMoves; miss += 1) {
    await cards.nth(0).click();
    await cards.nth(other).click();
    await expect(page.locator('.card.revealed')).toHaveCount(0);
  }
  const places = new Map<number, number[]>();
  for (const [index, face] of deck.entries())
    places.set(face, [...(places.get(face) ?? []), index]);
  for (const pair of places.values()) for (const index of pair) await cards.nth(index).click();
  // The last game of a tournament leaves for the champion, so the board is not always there to check.
  const next = button(page, TournamentControl.nextTurn).or(
    button(page, TournamentControl.nextMatch),
  );
  await expect(next.or(page.getByText(/^Champion: /))).toBeVisible();
}

// Plays a whole match. The first player makes the fewer moves, so the first player wins it.
export async function playMatch(page: Page, last = false): Promise<void> {
  await playTurn(page);
  await button(page, TournamentControl.nextTurn).click();
  await playTurn(page, 1);
  if (!last) await button(page, TournamentControl.nextMatch).click();
}

export function matchRow(page: Page, match: number, row: number) {
  return page.locator('.match').nth(match).locator('tbody tr').nth(row);
}
