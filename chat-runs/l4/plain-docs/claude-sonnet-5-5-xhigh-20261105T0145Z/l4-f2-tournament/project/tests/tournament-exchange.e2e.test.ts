import { expect, test } from './browser-test.ts';
import { TournamentControl, TournamentNotice } from '../src/game/tournament/tournament-labels.ts';
import { RECORDS_BLOCKED } from '../src/game/tournament/records.ts';
import {
  EIGHT_PLAYERS,
  FOUR_PLAYERS,
  boardCodes,
  button,
  exportedTournament,
  fillNames,
  loadPausedGame,
  openTournament,
  playTurn,
  startTournament,
} from './tournament-fixture.ts';

test('Leave tournament asks first and Keep playing is the default', async ({ page, gameURL }) => {
  await page.goto(gameURL);
  await openTournament(page);
  await startTournament(page, FOUR_PLAYERS);
  const leave = await button(page, TournamentControl.leave);
  await leave.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(leave).toBeFocused();
  await expect(page.getByRole('status')).toContainText('Now playing: Ada');
  await leave.click();
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status')).toContainText('Now playing: Ada');
  await leave.click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(
    page.getByRole('button', { name: TournamentControl.start, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tournament', level: 2 })).toBeFocused();
  await expect(page.getByRole('table', { name: 'Past tournaments' })).toContainText(
    'No finished tournaments yet.',
  );
});

test('exporting and loading carry an entry list, progress and a finished tournament', async ({
  page,
  gameURL,
}) => {
  await loadPausedGame(page, gameURL);
  await openTournament(page);
  const json = page.getByLabel('Tournament JSON', { exact: true });
  const status = page.getByRole('status');
  await fillNames(page, FOUR_PLAYERS);
  const draft = await exportedTournament(page);
  expect(Object.keys(draft)).toEqual(['format', 'matches', 'players', 'version']);
  expect(draft).toEqual({
    format: 'neon-pairs/tournament',
    matches: [],
    players: FOUR_PLAYERS,
    version: 1,
  });
  await fillNames(page, EIGHT_PLAYERS);
  await page.getByLabel('Tournament JSON', { exact: true }).fill(JSON.stringify(draft));
  await page.getByRole('button', { name: TournamentControl.loadJson, exact: true }).click();
  await expect(status).toContainText(TournamentNotice.loadedPlayers);
  await expect(page.getByLabel('Players', { exact: true })).toHaveValue('4');
  await expect(page.getByLabel('Player 3', { exact: true })).toHaveValue('Cora');

  await (await button(page, TournamentControl.start)).click();
  const codes = await boardCodes(page);
  await playTurn(page, codes[0] ?? '');
  const progress = await exportedTournament(page);
  expect(JSON.stringify(progress.matches)).toContain('"results":[{"elapsedMs":0,"moves":18}]');
  await (await button(page, TournamentControl.leave)).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await json.fill(JSON.stringify(progress));
  await page.getByRole('button', { name: TournamentControl.loadJson, exact: true }).click();
  await expect(status).toContainText(TournamentNotice.loaded);
  await expect(status).toContainText('Now playing: Dev');
  await expect(page.getByRole('table', { name: 'Bracket' })).toContainText('Ada');

  const results = [
    [20, 21],
    [22, 19],
    [40, 41],
  ];
  const matches = [0, 1, 2].map((match) => ({
    boardCode: codes[match],
    results: (results[match] ?? []).map((moves) => ({ elapsedMs: 1000, moves })),
  }));
  await json.fill(JSON.stringify({ ...progress, matches }));
  await page.getByRole('button', { name: TournamentControl.loadJson, exact: true }).click();
  await expect(status).toContainText(TournamentNotice.loadedCompleted);
  await expect(status).toContainText('Champion: Ada');
  await expect(page.getByRole('table', { name: 'Past tournaments' })).toContainText(
    'No finished tournaments yet.',
  );
  await json.fill(JSON.stringify(progress));
  await page.getByRole('button', { name: TournamentControl.loadJson, exact: true }).click();
  await json.fill('{');
  await page.getByRole('button', { name: TournamentControl.loadJson, exact: true }).click();
  await expect(status).toContainText('Invalid tournament.');
  await expect(status).toContainText('Now playing: Dev');
  await json.fill(JSON.stringify({ ...progress, note: 1, extra: 2 }));
  await page.getByRole('button', { name: TournamentControl.loadJson, exact: true }).click();
  await expect(status).toContainText('Unknown field: note.');
  await expect(json).toHaveValue(JSON.stringify({ ...progress, note: 1, extra: 2 }));
  await expect(status).toContainText('Now playing: Dev');
});

test('a blocked store keeps the tournament playable and says progress will not be saved', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
  });
  await page.goto(gameURL);
  await openTournament(page);
  await expect(page.getByText(RECORDS_BLOCKED, { exact: true })).toBeVisible();
  await startTournament(page, FOUR_PLAYERS);
  await expect(page.getByRole('status')).toContainText('Now playing: Ada');
  await expect(page.getByText(RECORDS_BLOCKED, { exact: true })).toBeVisible();
});
