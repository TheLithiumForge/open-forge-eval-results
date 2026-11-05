import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { boardCode } from '../src/game/deck.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import {
  createTournament,
  dealSizes,
  nextTurn,
  recordResult,
} from '../src/game/tournament/rules.ts';
import { playerLabel, TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import type { Tournament } from '../src/game/tournament/rules.ts';
import type { Locator, Page } from '@playwright/test';

export const FOUR = ['Ada', 'Bo', 'Cora', 'Dev'];
export const EIGHT = [...FOUR, 'Emi', 'Finn', 'Gia', 'Hal'];

export function button(page: Page, name: string): Locator {
  return page.getByRole('button', { name, exact: true });
}

export async function openTournament(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await button(page, DealControl.tournament).click();
}

export async function startTournament(page: Page, names: string[]): Promise<void> {
  await page
    .getByLabel(TournamentControl.players, { exact: true })
    .selectOption(String(names.length));
  for (const [index, name] of names.entries())
    await page.getByLabel(playerLabel(index + 1), { exact: true }).fill(name);
  await button(page, TournamentControl.start).click();
}

// The exported document, read back from the Tournament JSON box.
export async function exportedTournament(page: Page): Promise<Record<string, unknown>> {
  await button(page, TournamentControl.exportJson).click();
  const value: unknown = JSON.parse(
    await page.getByLabel(TournamentControl.json, { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected an exported tournament object.');
  return value;
}

export async function matchCodes(page: Page): Promise<string[]> {
  const matches = (await exportedTournament(page)).matches;
  if (!Array.isArray(matches)) throw new Error('Expected a list of matches.');
  return matches.map((match) => (isJsonObject(match) ? String(match.code) : ''));
}

// Plays the turn on screen from its Start turn button to the last pair. Each miss costs one move.
async function playTurn(page: Page, code: string, misses = 0, settles = true): Promise<void> {
  const [, size = '', seed = ''] = /^np1-(\d+)-(\d+)$/.exec(code) ?? [];
  const deck = specDeal(Number(size), Number(seed));
  await button(page, TournamentControl.startTurn).click();
  await expect(page.locator('.card')).toHaveCount(deck.length);
  const other = deck.findIndex((face) => face !== deck[0]);
  for (let miss = 0; miss < misses; miss += 1) {
    await page.locator('.card').nth(0).click();
    await page.locator('.card').nth(other).click();
    await expect(page.locator('.card.revealed')).toHaveCount(0);
  }
  for (let face = 0; face < deck.length / 2; face += 1)
    for (const [index, value] of deck.entries())
      if (value === face) await page.locator('.card').nth(index).click();
  // The last turn of a tournament leaves the board for the champion at once.
  if (settles) await expect(page.locator('.card.matched')).toHaveCount(deck.length);
}

// Plays both turns of the match on screen. Returns once the match button has been used.
export async function playMatch(
  page: Page,
  code: string,
  misses: [number, number],
  last = false,
): Promise<void> {
  await playTurn(page, code, misses[0]);
  await button(page, TournamentControl.nextTurn).click();
  await playTurn(page, code, misses[1], !last);
  if (!last) await button(page, TournamentControl.nextMatch).click();
}

// Ada beats Dev, Cora beats Bo, then Cora beats Ada in the final. Run it on the first screen.
export async function playFourPlayers(page: Page): Promise<string[]> {
  const codes = await matchCodes(page);
  await playMatch(page, codes[0] ?? '', [0, 1]);
  await playMatch(page, codes[1] ?? '', [1, 0]);
  await playMatch(page, codes[2] ?? '', [1, 0], true);
  return codes;
}

// A finished four player tournament whose champion is the first name entered.
export function finishedTournament(champion: string, offset: number): Tournament {
  const codes = dealSizes(4).map((size, index) => boardCode(size, offset * 10 + index + 1));
  let tournament = createTournament([champion, 'Bo', 'Cora', 'Dev'], codes);
  for (let turn = nextTurn(tournament); turn; turn = nextTurn(tournament))
    tournament = recordResult(tournament, turn, { moves: 40 + turn.slot, elapsedMs: 9000 });
  return tournament;
}

// Writes the value before the game starts, but only when the page has not saved one yet.
export async function seedStorage(page: Page, key: string, value: string): Promise<void> {
  await page.addInitScript(
    ([name, text]) => {
      if (window.localStorage.getItem(name ?? '') === null)
        window.localStorage.setItem(name ?? '', text ?? '');
    },
    [key, value],
  );
}
