import { expect, test } from './browser-test.ts';
import { TournamentControl, TournamentNotice } from '../src/game/tournament/tournament-labels.ts';
import { TOURNAMENTS_KEY } from '../src/game/tournament/records.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import {
  FOUR_PLAYERS,
  boardCodes,
  button,
  faceNames,
  loadPausedGame,
  missPositions,
  openTournament,
  playTurn,
  startTournament,
} from './tournament-fixture.ts';

test('a four player knockout plays every turn on the match deal and crowns the champion', async ({
  page,
  gameURL,
}) => {
  const preferences = JSON.stringify({ schemaVersion: 1, size: 10, bestMoves: { '4': 12 } });
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: PREFERENCES_KEY, value: preferences },
  );
  await loadPausedGame(page, gameURL);
  await openTournament(page);
  await startTournament(page, FOUR_PLAYERS);
  const status = page.getByRole('status');
  await expect(status).toContainText('Now playing: Ada');
  await expect(page.getByText('Round: Semifinal', { exact: true })).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(0);
  const codes = await boardCodes(page);
  expect(codes.map((code) => code.split('-')[1])).toEqual(['6', '6', '8']);
  expect(new Set(codes).size).toBe(3);

  // Semifinal 1: Ada and Dev finish in the same moves, so the lower time wins.
  await playTurn(page, codes[0] ?? '', 0, 5000);
  await expect(status).toContainText('Now playing: Ada');
  await expect(page.locator('.card:focus')).toHaveCount(1);
  const adaDeck = await faceNames(page);
  await expect(page.locator('.victory')).toContainText('Every pair found in 18 moves and 0:05.');
  await (await button(page, TournamentControl.nextTurn)).click();
  await expect(status).toContainText('Now playing: Dev');
  await expect(await button(page, TournamentControl.startTurn)).toBeFocused();
  await playTurn(page, codes[0] ?? '');
  expect(await faceNames(page)).toEqual(adaDeck);
  await expect(page.getByText('Ada', { exact: true })).toBeVisible();
  await (await button(page, TournamentControl.nextMatch)).click();
  await expect(status).toContainText('Now playing: Bo');
  await expect(page.getByText('Dev (winner)', { exact: true })).toBeVisible();

  // Semifinal 2: Bo misses once more than Cora, so fewer moves win for Cora.
  await playTurn(page, codes[1] ?? '', 1);
  expect(await faceNames(page)).not.toEqual(adaDeck);
  await (await button(page, TournamentControl.nextTurn)).click();
  await playTurn(page, codes[1] ?? '');
  await (await button(page, TournamentControl.nextMatch)).click();
  await expect(status).toContainText('Now playing: Dev');
  await expect(page.getByText('Round: Final', { exact: true })).toBeVisible();

  // Final on the 8x8 board: equal moves and time go to the higher seed, Cora is seed 3.
  await playTurn(page, codes[2] ?? '');
  await (await button(page, TournamentControl.nextTurn)).click();
  await playTurn(page, codes[2] ?? '');
  await expect(status).toContainText('Champion: Cora');
  await expect(page.getByRole('button', { name: TournamentControl.nextMatch })).toHaveCount(0);
  await expect(page.getByText('Cora (winner)', { exact: true })).toHaveCount(2);
  await expect(page.getByRole('table', { name: 'Bracket' }).locator('tbody tr')).toHaveCount(6);

  // The tournament never touched the saved size or best moves.
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(
    preferences,
  );
  const saved = JSON.parse(
    (await page.evaluate((key) => localStorage.getItem(key), TOURNAMENTS_KEY)) ?? '',
  );
  expect(Object.keys(saved).sort()).toEqual(['items', 'v']);
  expect(saved.v).toBe(3);
  await (await button(page, TournamentControl.back)).click();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await page.reload();
  await openTournament(page);
  const past = page.getByRole('table', { name: 'Past tournaments' });
  await expect(past.getByRole('cell', { name: 'Cora', exact: true })).toBeVisible();
  await expect(past.getByRole('cell', { name: 'Ada, Bo, Cora, Dev' })).toBeVisible();
});

test('a seed breaks a tie in moves and time and the bracket names the winner', async ({
  page,
  gameURL,
}) => {
  await loadPausedGame(page, gameURL);
  await openTournament(page);
  await startTournament(page, FOUR_PLAYERS);
  const codes = await boardCodes(page);
  await playTurn(page, codes[0] ?? '');
  await (await button(page, TournamentControl.nextTurn)).click();
  await playTurn(page, codes[0] ?? '');
  await (await button(page, TournamentControl.nextMatch)).click();
  const rows = page.getByRole('table', { name: 'Bracket' }).locator('tbody tr');
  await expect(rows.nth(0)).toContainText('Ada (winner)');
  await expect(rows.nth(0).locator('td').nth(2)).toHaveText('18');
  await expect(rows.nth(0).locator('td').nth(3)).toHaveText('0:00');
  await expect(rows.nth(1)).toContainText('Dev');
  await expect(rows.nth(1)).not.toContainText('(winner)');
  await expect(page.getByRole('table', { name: 'Bracket' }).getByRole('columnheader')).toHaveText([
    'Match',
    'Player',
    'Moves',
    'Time',
    'Board code',
  ]);
});

test('the turn owner and each result share the page live region', async ({ page, gameURL }) => {
  await loadPausedGame(page, gameURL);
  await openTournament(page);
  await startTournament(page, FOUR_PLAYERS);
  await expect(page.locator('[role=status]')).toHaveCount(1);
  const codes = await boardCodes(page);
  await (await button(page, TournamentControl.startTurn)).click();
  const [first, second] = missPositions(codes[0] ?? '');
  await page.locator('.card').nth(first).click();
  await page.locator('.card').nth(second).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Now playing: Ada');
  await expect(status).toContainText(
    'Pairs found'.slice(0, 0) + 'No match. Cards close after a short pause.',
  );
  expect(await status.getAttribute('aria-live')).toBe('polite');
  expect(await status.getAttribute('aria-atomic')).toBe('true');
  expect(codes).toHaveLength(3);
  expect(TournamentNotice.loaded).toContain('Start turn');
});
