import { expect, test, TestTimeouts, Scrollbars } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { GAME_URL } from './game-fixture.ts';
import { TournamentControl } from '../src/game/tournament/labels.ts';
import {
  boardCodes,
  button,
  enterPlayers,
  exportedTournament,
  openTournament,
  playTurn,
} from './tournament-fixture.ts';

const SAVED = JSON.stringify({ schemaVersion: 1, size: 10, bestMoves: { '6': 30, '8': 60 } });

// Reads each bracket row as its visible cells, so a match's second row starts with its player.
async function bracket(page: Parameters<typeof playTurn>[0]): Promise<string[][]> {
  return page
    .getByRole('table', { name: 'Bracket' })
    .locator('tbody tr')
    .evaluateAll((rows) =>
      rows.map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent ?? '')),
    );
}

test(
  'a four-player knockout plays each deal twice, breaks ties and keeps the champion after reload',
  async ({ page, gameURL }) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.goto(gameURL);
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: PREFERENCES_KEY,
      value: SAVED,
    });
    await page.reload();
    await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
    await openTournament(page);
    await enterPlayers(page, ['  Ada   Lovelace ', 'Bo', 'Cora', 'Dev']);
    await button(page, TournamentControl.start).click();
    const status = page.getByRole('status');
    await expect(status).toHaveText('Now playing: Ada Lovelace');
    await expect(page.getByText('Round: Semifinal', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    await expect(page.locator('.card')).toHaveCount(0);
    const codes = boardCodes(await exportedTournament(page));
    expect(codes.map((code) => code.split('-')[1])).toEqual(['6', '6', '8']);
    expect(new Set(codes).size).toBe(3);
    const [first = '', second = '', final = ''] = codes;

    await playTurn(page, first, 0, 2000);
    await expect(status).toHaveText('Pair found. All pairs found in 18 moves and 0:02.');
    await expect(button(page, TournamentControl.nextTurn)).toBeFocused();
    await expect(page.getByRole('row').filter({ hasText: 'Ada Lovelace' }).first()).toContainText(
      '18 moves0:02',
    );
    await button(page, TournamentControl.nextTurn).click();
    await expect(status).toHaveText('Now playing: Dev');
    await expect(button(page, TournamentControl.startTurn)).toBeFocused();
    await playTurn(page, first, 1);
    await expect(button(page, TournamentControl.nextMatch)).toBeFocused();
    await button(page, TournamentControl.nextMatch).click();
    await expect(status).toHaveText('Now playing: Bo');
    await playTurn(page, second, 0, 5000);
    await button(page, TournamentControl.nextTurn).click();
    await expect(status).toHaveText('Now playing: Cora');
    await playTurn(page, second, 0, 3000);
    await button(page, TournamentControl.nextMatch).click();
    await expect(page.getByText('Round: Final', { exact: true })).toBeVisible();
    await expect(status).toHaveText('Now playing: Ada Lovelace');
    await playTurn(page, final, 0, 1000);
    await button(page, TournamentControl.nextTurn).click();
    await expect(status).toHaveText('Now playing: Cora');
    await playTurn(page, final, 0, 1000);

    await expect(page.getByText('Champion: Ada Lovelace', { exact: true })).toBeVisible();
    await expect(button(page, TournamentControl.back)).toBeFocused();
    await expect(button(page, TournamentControl.leave)).toHaveCount(0);
    await expect(page.getByText(/^Round:/)).toHaveCount(0);
    expect(await bracket(page)).toEqual([
      ['Semifinal 1', 'Ada Lovelace', '18 moves', '0:02', 'Ada Lovelace'],
      ['Dev', '19 moves', '0:00'],
      ['Semifinal 2', 'Bo', '18 moves', '0:05', 'Cora'],
      ['Cora', '18 moves', '0:03'],
      ['Final', 'Ada Lovelace', '32 moves', '0:01', 'Ada Lovelace'],
      ['Cora', '32 moves', '0:01'],
    ]);
    // Tournament games leave the saved size and bests alone.
    expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(SAVED);
    await button(page, TournamentControl.back).click();
    await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
    await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('10');
    await expect(status).toHaveText('');
    await page.reload();
    await openTournament(page);
    const past = page.getByRole('table', { name: 'Finished tournaments, newest first' });
    await expect(past.locator('tbody tr')).toHaveText(['Ada LovelaceAda Lovelace, Bo, Cora, Dev']);
  },
  {},
  Scrollbars.hidden,
  TestTimeouts.long,
);

test('eight players open with quarterfinals on 4x4 boards in seed order', async ({ page }) => {
  await page.goto(GAME_URL);
  await openTournament(page);
  await enterPlayers(page, ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal']);
  await button(page, TournamentControl.start).click();
  await expect(page.getByText('Round: Quarterfinal', { exact: true })).toBeVisible();
  const rows = await bracket(page);
  // A match's first row starts with the match name, so its player is the second cell.
  const players = rows.map((row) => (row.length === 5 ? row[1] : row[0]));
  expect(players.slice(0, 8)).toEqual(['Ada', 'Hal', 'Dev', 'Emi', 'Cora', 'Finn', 'Bo', 'Gia']);
  expect(rows.filter((row) => row.length === 5).map((row) => row[0])).toEqual([
    'Quarterfinal 1',
    'Quarterfinal 2',
    'Quarterfinal 3',
    'Quarterfinal 4',
    'Semifinal 1',
    'Semifinal 2',
    'Final',
  ]);
  await button(page, TournamentControl.startTurn).click();
  await expect(page.locator('.card')).toHaveCount(16);
  await expect(page.locator('.stats dt')).toHaveText(['Moves:', 'Pairs:', 'Time:']);
});
