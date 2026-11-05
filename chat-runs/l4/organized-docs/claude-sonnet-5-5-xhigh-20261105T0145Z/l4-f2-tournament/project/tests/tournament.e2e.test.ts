import { expect, test, TestTimeouts } from './browser-test.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import {
  boardCodes,
  button,
  fillNames,
  openGame,
  openTournament,
  playTurn,
  startTournament,
} from './tournament-fixture.ts';

test(
  'four players play a knockout on the same deal twice and the champion is saved',
  async ({ page, gameURL }) => {
    await openGame(page, gameURL);
    await page.getByLabel(DealControl.size, { exact: true }).selectOption('10');
    const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
    expect(preferences).toContain('"size":10');
    const buttons = page.locator('.controls button');
    await expect(buttons).toHaveText(['New Game', 'Tournament', 'Restart']);
    await openTournament(page);
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    await expect(page.locator('.card')).toHaveCount(0);

    await startTournament(page, ['  Ada ', 'Bo', 'Cora', 'Dev']);
    const codes = await boardCodes(page);
    expect(codes.map((code) => code.split('-')[1])).toEqual(['6', '6', '8']);
    expect(new Set(codes).size).toBe(3);
    await expect(page.getByText('Round: Semifinal', { exact: true })).toBeVisible();
    await expect(page.getByText('Now playing: Ada', { exact: true })).toBeVisible();
    await expect(page.locator('.card')).toHaveCount(0);
    await expect(page.locator('[role="status"], [aria-live]')).toHaveCount(1);

    // Ada against Dev: both play the first deal, and Dev spends one miss.
    await button(page, TournamentControl.startTurn).click();
    await expect(page.locator('.card').first()).toBeFocused();
    await playTurn(page, codes[0] ?? '');
    await expect(button(page, TournamentControl.startTurn)).toHaveCount(0);
    await button(page, TournamentControl.nextTurn).click();
    await expect(button(page, TournamentControl.startTurn)).toBeFocused();
    await expect(page.locator('.card')).toHaveCount(0);
    await expect(page.getByText('Now playing: Dev', { exact: true })).toBeVisible();
    await button(page, TournamentControl.startTurn).click();
    await playTurn(page, codes[0] ?? '', { miss: true });
    await expect(page.getByRole('status')).toContainText('Ada wins the match.');
    await button(page, TournamentControl.nextMatch).click();

    // Bo against Cora ends level on moves, so the lower time wins over the better seed.
    await expect(page.getByText('Now playing: Bo', { exact: true })).toBeVisible();
    await button(page, TournamentControl.startTurn).click();
    await playTurn(page, codes[1] ?? '', { waitMs: 2000 });
    await button(page, TournamentControl.nextTurn).click();
    await button(page, TournamentControl.startTurn).click();
    await playTurn(page, codes[1] ?? '', { waitMs: 1000 });
    await button(page, TournamentControl.nextMatch).click();

    const bracket = page.getByRole('table', { name: 'Bracket', exact: true });
    await expect(bracket.getByRole('columnheader')).toHaveText([
      'Round',
      'Match',
      'Player',
      'Moves',
      'Time',
      'Result',
    ]);
    await expect(bracket.getByRole('row', { name: /Dev 19 0:00 Eliminated/ })).toBeVisible();
    await expect(bracket.getByRole('row', { name: /Cora 18 0:01 Winner/ })).toBeVisible();

    // Equal moves and equal time go to the higher seed.
    await expect(page.getByText('Round: Final', { exact: true })).toBeVisible();
    await expect(page.getByText('Now playing: Ada', { exact: true })).toBeVisible();
    await button(page, TournamentControl.startTurn).click();
    await playTurn(page, codes[2] ?? '');
    await button(page, TournamentControl.nextTurn).click();
    await expect(page.getByText('Now playing: Cora', { exact: true })).toBeVisible();
    await button(page, TournamentControl.startTurn).click();
    await playTurn(page, codes[2] ?? '');
    await expect(page.getByText('Champion: Ada', { exact: true })).toBeVisible();
    await expect(button(page, TournamentControl.nextMatch)).toHaveCount(0);
    await expect(button(page, TournamentControl.leave)).toHaveCount(0);

    const stored = await page.evaluate(() => localStorage.getItem('np3:tournaments'));
    expect(Object.keys(JSON.parse(stored ?? '{}'))).toEqual(['v', 'items']);
    await page.reload();
    await openTournament(page);
    const past = page.getByRole('table', { name: 'Finished tournaments, newest first' });
    await expect(past.getByRole('row', { name: /Ada Cora 4/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Past tournaments' })).toBeVisible();

    // The saved size and the best scores belong to ordinary games only.
    expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(
      preferences,
    );
    await button(page, TournamentControl.back).click();
    await expect(button(page, DealControl.tournament)).toBeFocused();
    await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('10');
    await expect(page.locator('.stats > div').nth(3)).toHaveText('Best: none');
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('eight players open 1 against 8, 4 against 5, 3 against 6 and 2 against 7 on 4x4', async ({
  page,
  gameURL,
}) => {
  await openGame(page, gameURL);
  await openTournament(page);
  await expect(page.getByLabel('Player 5', { exact: true })).toHaveCount(0);
  await fillNames(page, ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal']);
  await expect(page.getByLabel('Player 8', { exact: true })).toBeVisible();
  await button(page, TournamentControl.start).click();
  const codes = await boardCodes(page);
  expect(codes.map((code) => code.split('-')[1])).toEqual(['4', '4', '4', '4', '6', '6', '8']);
  const bracket = page.getByRole('table', { name: 'Bracket', exact: true });
  const players = await bracket.locator('tbody th').allTextContents();
  expect(players.slice(0, 8)).toEqual(['Ada', 'Hal', 'Dev', 'Emi', 'Cora', 'Finn', 'Bo', 'Gia']);
  expect(players.slice(8)).toEqual(Array(6).fill('To be decided'));
  await expect(page.getByText('Round: Quarterfinal', { exact: true })).toBeVisible();
  await button(page, TournamentControl.startTurn).click();
  await expect(page.locator('.card')).toHaveCount(16);
  await button(page, TournamentControl.leave).click();
  await button(page, 'Keep playing').click();
  await expect(page.getByText('Now playing: Ada', { exact: true })).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(16);
});
