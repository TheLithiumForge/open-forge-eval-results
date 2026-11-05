import { expect, test } from './browser-test.ts';
import { GAME_URL } from './game-fixture.ts';
import {
  button,
  enterPlayers,
  exportedTournament,
  FOUR,
  FOUR_CODES,
  loadTournament,
  openTournament,
  playTurn,
  tournamentJson,
} from './tournament-fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { TOURNAMENTS_KEY } from '../src/game/tournament/past-tournaments.ts';
import { TournamentControl, TournamentTable } from '../src/game/tournament/tournament-labels.ts';
import type { Page } from '@playwright/test';

// Semifinals go to Ada and Bo. Ada's 40 moves in the final leave Bo one game from the title.
const FINAL_LEFT = tournamentJson(FOUR, FOUR_CODES, [
  { moves: 18, elapsedMs: 9000 },
  { moves: 20, elapsedMs: 8000 },
  { moves: 18, elapsedMs: 7000 },
  { moves: 19, elapsedMs: 6000 },
  { moves: 40, elapsedMs: 12_000.5 },
]);

function stored(page: Page, key: string): Promise<string | null> {
  return page.evaluate((name) => localStorage.getItem(name), key);
}

test('finished tournaments stay listed after reload and leave saved size and bests alone', async ({
  page,
  gameURL,
}) => {
  const preferences = JSON.stringify({ schemaVersion: 1, size: 10, bestMoves: { 4: 12, 8: 40 } });
  await page.goto(gameURL);
  await page.evaluate(
    ({ key, value, past }) => {
      localStorage.setItem(key, value);
      localStorage.setItem(past, '{');
    },
    { key: PREFERENCES_KEY, value: preferences, past: TOURNAMENTS_KEY },
  );
  await page.reload();
  await expect(page.locator('.card')).toHaveCount(100);
  await openTournament(page);
  const past = page.getByRole('table', { name: TournamentTable.past });
  await expect(past).toContainText(TournamentTable.noRecords);
  await expect(page.getByText(TournamentTable.notSaved)).toHaveCount(0);
  expect(await stored(page, TOURNAMENTS_KEY)).toBe('{');
  await loadTournament(page, FINAL_LEFT);
  await expect(page.getByRole('status')).toHaveText('Now playing: Bo');
  await expect(page.locator('.stats')).not.toContainText('Best');
  await playTurn(page, 'np1-8-1');
  await expect(page.getByText('Champion: Bo')).toBeVisible();
  expect(await stored(page, PREFERENCES_KEY)).toBe(preferences);
  const saved: unknown = JSON.parse((await stored(page, TOURNAMENTS_KEY)) ?? '');
  expect(saved).toMatchObject({ v: 3, items: [{ players: FOUR }] });
  expect(Object.keys(saved ?? {})).toEqual(['v', 'items']);
  await button(page, TournamentControl.back).click();
  await expect(page.locator('.card')).toHaveCount(100);
  await page.reload();
  expect(await stored(page, PREFERENCES_KEY)).toBe(preferences);
  await openTournament(page);
  await expect(past.getByRole('row').nth(1)).toHaveText('Ada, Bo, Cora, DevBo');
  await expect(past.getByRole('columnheader')).toHaveText([
    TournamentTable.entrants,
    TournamentTable.champion,
  ]);
});

test('blocked storage keeps a finished tournament for the visit and says it is not saved', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage is blocked.', 'SecurityError');
      },
    });
  });
  await page.goto(gameURL);
  await openTournament(page);
  await expect(page.getByText(TournamentTable.notSaved)).toBeVisible();
  await loadTournament(page, FINAL_LEFT);
  await playTurn(page, 'np1-8-1');
  await expect(page.getByText('Champion: Bo')).toBeVisible();
  await button(page, TournamentControl.back).click();
  await openTournament(page);
  const past = page.getByRole('table', { name: TournamentTable.past });
  await expect(past.getByRole('row').nth(1)).toHaveText('Ada, Bo, Cora, DevBo');
  await expect(page.getByText(TournamentTable.notSaved)).toBeVisible();
});

test('export and load round trip a tournament and name the first unknown field', async ({
  page,
}) => {
  // A paused clock keeps active time at zero, so the export is exact.
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto(GAME_URL);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await openTournament(page);
  const status = page.getByRole('status');
  const json = page.getByLabel(TournamentControl.json, { exact: true });
  await button(page, TournamentControl.exportJson).click();
  await expect(status).toHaveText('Use 2 to 20 characters.');
  await expect(json).toHaveValue('');
  await enterPlayers(page, FOUR);
  const planned = await exportedTournament(page);
  expect(Object.keys(planned)).toEqual(['format', 'matches', 'players', 'version']);
  expect(planned).toMatchObject({ format: 'neon-pairs/tournament', version: 1, players: FOUR });
  await expect(page.locator('.card')).toHaveCount(0);

  await loadTournament(page, tournamentJson(FOUR, FOUR_CODES));
  await expect(
    page.getByRole('heading', { name: TournamentControl.heading, exact: true }),
  ).toBeFocused();
  await expect(status).toHaveText('Now playing: Ada');
  await playTurn(page, 'np1-6-1');
  const exported = await exportedTournament(page);
  expect(exported.matches).toEqual([
    { attempts: [{ elapsedMs: 0, moves: 18 }], boardCode: 'np1-6-1' },
    { attempts: [], boardCode: 'np1-6-2' },
    { attempts: [], boardCode: 'np1-8-1' },
  ]);
  const text = await json.inputValue();
  const load = button(page, TournamentControl.loadJson);
  await loadTournament(page, '{');
  await expect(status).toHaveText('Invalid tournament.');
  await expect(json).toHaveValue('{');
  await expect(load).toBeFocused();
  await expect(button(page, TournamentControl.nextTurn)).toBeVisible();
  await loadTournament(
    page,
    text.replace('"boardCode": "np1-6-2"', '"boardCode": "np1-6-2", "extra": 1'),
  );
  await expect(status).toHaveText('Unknown field: extra.');
  await loadTournament(page, text);
  await expect(status).toHaveText('Now playing: Dev');
  await expect(button(page, TournamentControl.startTurn)).toBeVisible();
  await expect(load).toBeFocused();
  await loadTournament(page, FINAL_LEFT.replace('"moves":40', '"moves":32'));
  await expect(status).toHaveText('Now playing: Bo');
  await loadTournament(
    page,
    tournamentJson(FOUR, FOUR_CODES, [
      ...Array.from({ length: 4 }, () => ({ moves: 18, elapsedMs: 0 })),
      { moves: 32, elapsedMs: 0 },
      { moves: 32, elapsedMs: 0 },
    ]),
  );
  await expect(status).toHaveText('Loaded completed tournament.');
  await expect(page.getByText('Champion: Ada')).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(0);
  await expect(button(page, TournamentControl.exportJson)).toBeVisible();
});
