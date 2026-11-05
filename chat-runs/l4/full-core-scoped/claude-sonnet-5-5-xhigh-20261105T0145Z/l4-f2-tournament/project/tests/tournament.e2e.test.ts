import { expect, test, TestTimeouts } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import {
  button,
  EIGHT,
  FOUR,
  matchCodes,
  openTournament,
  playMatch,
  startTournament,
} from './tournament-fixture.ts';
import { StatusLabel } from '../src/game/status/status-labels.ts';

const STATUS = '[role="status"]';

test('the Tournament button next to New Game opens a screen with 4 or 8 players', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  const labels = await page.locator('.controls button').allTextContents();
  expect(labels).toEqual([DealControl.newGame, DealControl.tournament, DealControl.restart]);
  await button(page, DealControl.tournament).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Tournament' })).toBeFocused();
  await expect(page.locator('.card')).toHaveCount(0);
  const players = page.getByLabel(TournamentControl.players, { exact: true });
  await expect(players.locator('option')).toHaveText(['4', '8']);
  await expect(page.locator('input[id^="player-"]')).toHaveCount(4);
  await players.selectOption('8');
  for (let position = 1; position <= 8; position += 1)
    await expect(page.getByLabel(`Player ${position}`, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Player 9')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Past tournaments' })).toBeVisible();
  for (const name of [
    TournamentControl.start,
    TournamentControl.exportJson,
    TournamentControl.loadJson,
  ])
    await expect(button(page, name)).toBeVisible();
  await expect(page.getByLabel(TournamentControl.json, { exact: true })).toBeVisible();
});

test('names are normalized, counted in code points and compared without case', async ({
  page,
  gameURL,
}) => {
  await openTournament(page, gameURL);
  const start = button(page, TournamentControl.start);
  const fill = (position: number, name: string) =>
    page.getByLabel(`Player ${position}`, { exact: true }).fill(name);
  for (const [position, name] of ['Ada', 'Bo', 'Cora', 'A'].entries())
    await fill(position + 1, name);
  await start.click();
  await expect(page.locator(STATUS)).toHaveText('Use 2 to 20 characters.');
  await expect(start).toBeFocused();
  await fill(4, '\u{1F600}'.repeat(21));
  await start.click();
  await expect(page.locator(STATUS)).toHaveText('Use 2 to 20 characters.');
  await fill(4, 'ADA');
  await start.click();
  await expect(page.locator(STATUS)).toHaveText('Each name must be different.');
  await expect(page.getByLabel('Player 4', { exact: true })).toHaveValue('ADA');
  await fill(4, '  Dev   Null  ');
  await page.getByLabel('Player 4', { exact: true }).press('Enter');
  await expect(page.getByRole('heading', { level: 2, name: 'Round: Semifinal' })).toBeFocused();
  await expect(page.locator('tbody td', { hasText: /^Dev Null$/ })).toHaveCount(1);
});

test(
  'four players play two semifinals and a final and the champion is named',
  async ({ page, gameURL }) => {
    await openTournament(page, gameURL);
    await startTournament(page, FOUR);
    const heading = (name: string) => page.getByRole('heading', { level: 2, name });
    await expect(heading('Round: Semifinal')).toBeFocused();
    const codes = await matchCodes(page);
    expect(new Set(codes).size).toBe(3);
    expect(codes.map((code) => code.split('-')[1])).toEqual(['6', '6', '8']);
    await expect(page.locator(STATUS)).toHaveText('Now playing: Ada');
    await expect(page.locator('.card')).toHaveCount(0);
    await playMatch(page, codes[0] ?? '', [0, 1]);
    await expect(page.locator(STATUS)).toHaveText('Now playing: Bo');
    await playMatch(page, codes[1] ?? '', [1, 0]);
    await expect(heading('Round: Final')).toBeFocused();
    await expect(page.locator(STATUS)).toHaveText('Now playing: Ada');
    await playMatch(page, codes[2] ?? '', [1, 0], true);
    await expect(page.getByText('Champion: Cora', { exact: true })).toBeVisible();
    await expect(heading('Tournament complete')).toBeFocused();
    await expect(page.getByRole('table', { name: 'Bracket' })).toBeVisible();
    await expect(page.locator('th[scope="col"]')).toHaveText(['Match', 'Player', 'Moves', 'Time']);
    const rows = await page.locator('tbody tr').allInnerTexts();
    expect(rows.map((row) => row.split('\t').slice(0, 2).join(' / '))).toEqual([
      'Semifinal 1 / Ada (winner)',
      'Semifinal 1 / Dev',
      'Semifinal 2 / Bo',
      'Semifinal 2 / Cora (winner)',
      'Final / Ada',
      'Final / Cora (winner)',
    ]);
    const moves = await page.locator('tbody tr td:nth-child(3)').allInnerTexts();
    expect(moves).toEqual(['18', '19', '19', '18', '33', '32']);
    await button(page, TournamentControl.back).click();
    await expect(button(page, DealControl.tournament)).toBeFocused();
    await expect(page.locator('.stats dt', { hasText: StatusLabel.best })).toHaveCount(1);
  },
  {},
  undefined,
  TestTimeouts.long,
);

test(
  'eight players meet one against eight, four against five, three against six, two against seven',
  async ({ page, gameURL }) => {
    await openTournament(page, gameURL);
    await startTournament(page, EIGHT);
    const codes = await matchCodes(page);
    expect(codes.map((code) => code.split('-')[1])).toEqual(['4', '4', '4', '4', '6', '6', '8']);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Round: Quarterfinal' }),
    ).toBeVisible();
    const players = await page.locator('tbody tr td:nth-child(2)').allInnerTexts();
    expect(players.slice(0, 8)).toEqual(['Ada', 'Hal', 'Dev', 'Emi', 'Cora', 'Finn', 'Bo', 'Gia']);
    for (const code of codes.slice(0, 4)) await playMatch(page, code, [0, 1], false);
    await expect(page.getByRole('heading', { level: 2, name: 'Round: Semifinal' })).toBeVisible();
    await expect(page.locator('.match-line')).toHaveText('Match 1 of 2: Ada vs Dev');
  },
  {},
  undefined,
  TestTimeouts.long,
);
