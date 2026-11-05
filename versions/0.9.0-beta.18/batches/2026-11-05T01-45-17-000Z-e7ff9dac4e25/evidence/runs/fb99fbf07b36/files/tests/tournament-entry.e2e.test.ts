import { expect, test } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import {
  EIGHT_PLAYERS,
  boardCodes,
  button,
  fillNames,
  loadPausedGame,
  openTournament,
  startTournament,
} from './tournament-fixture.ts';

test('the Tournament screen opens on its heading with a player count and one labelled field each', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  const newGame = await button(page, DealControl.newGame);
  const open = await button(page, DealControl.tournament);
  const [a, b] = [await newGame.boundingBox(), await open.boundingBox()];
  expect(Math.abs((a?.y ?? 0) - (b?.y ?? 99))).toBeLessThan(2);
  await open.click();
  await expect(page.getByRole('heading', { name: 'Tournament', level: 2 })).toBeFocused();
  await expect(page.getByLabel('Player 1', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Player 4', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Player 5', { exact: true })).toHaveCount(0);
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  await expect(page.getByLabel('Player 8', { exact: true })).toBeVisible();
  for (const label of ['Export tournament', 'Load tournament', 'Back to game'])
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  await expect(page.getByLabel('Tournament JSON', { exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Past tournaments' })).toContainText(
    'No finished tournaments yet.',
  );
  await (await button(page, TournamentControl.back)).click();
  await expect(page.getByRole('heading', { name: 'Game', level: 2 })).toBeFocused();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
});

test('names are cleaned, counted in code points and must differ', async ({ page, gameURL }) => {
  await page.goto(gameURL);
  await openTournament(page);
  const start = page.getByRole('button', { name: TournamentControl.start, exact: true });
  const status = page.getByRole('status');
  await fillNames(page, ['Ada', 'B', 'Cora', 'Dev']);
  await start.click();
  await expect(status).toHaveText('Use 2 to 20 characters.');
  await expect(page.getByLabel('Player 2', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByLabel('Player 1', { exact: true })).not.toHaveAttribute('aria-invalid');
  await fillNames(page, ['Ada', 'Bo', 'Cora', 'x'.repeat(21)]);
  await start.click();
  await expect(status).toHaveText('Use 2 to 20 characters.');
  await fillNames(page, ['Ada', 'Bo', 'Cora', 'ada']);
  await start.click();
  await expect(status).toHaveText('Each name must be different.');
  await expect(page.getByLabel('Player 4', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByRole('table', { name: 'Bracket' })).toHaveCount(0);
  await fillNames(page, ['  Ada   Lovelace ', 'Bo', 'Cora', '\u{1F600}'.repeat(20)]);
  await start.click();
  await expect(page.getByRole('status')).toContainText('Now playing: Ada Lovelace');
  const names = await page
    .getByRole('table', { name: 'Bracket' })
    .locator('td.name')
    .allTextContents();
  expect(names.slice(0, 4)).toEqual(['Ada Lovelace', '\u{1F600}'.repeat(20), 'Bo', 'Cora']);
});

test('eight entrants meet in seed order and open on 4x4 quarterfinals', async ({
  page,
  gameURL,
}) => {
  await loadPausedGame(page, gameURL);
  await openTournament(page);
  await startTournament(page, EIGHT_PLAYERS);
  await expect(page.getByText('Round: Quarterfinal', { exact: true })).toBeVisible();
  const names = await page
    .getByRole('table', { name: 'Bracket' })
    .locator('td.name')
    .allTextContents();
  expect(names).toEqual([
    ...['Ada', 'Hal', 'Dev', 'Emi', 'Cora', 'Finn', 'Bo', 'Gia'],
    ...Array<string>(6).fill('To be decided'),
  ]);
  const codes = await boardCodes(page);
  expect(codes.map((code) => code.split('-')[1])).toEqual(['4', '4', '4', '4', '6', '6', '8']);
  expect(new Set(codes).size).toBe(7);
  await (await button(page, TournamentControl.startTurn)).click();
  await expect(page.locator('.card')).toHaveCount(16);
});
