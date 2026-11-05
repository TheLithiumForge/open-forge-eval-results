import { expect, test, TestTimeouts } from './browser-test.ts';
import {
  championLine,
  nowPlaying,
  TournamentControl,
  TournamentNotice,
  TournamentText,
  winnerLine,
} from '../src/game/tournament/tournament-labels.ts';
import { offScale } from './spacing-scale.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import {
  button,
  currentDeal,
  FOUR,
  matchRow,
  NAMES,
  openTournament,
  playMatch,
  playTurn,
  startTournament,
} from './tournament-fixture.ts';

test('four players play a knockout on shared deals and the fewest moves win each match', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await startTournament(page, FOUR);
  await expect(page.getByText(nowPlaying('Ann'), { exact: true })).toBeVisible();
  await expect(button(page, TournamentControl.startTurn)).toBeFocused();
  await expect(page.locator('.card')).toHaveCount(0);
  const semifinal = await currentDeal(page);

  await playTurn(page);
  await expect(button(page, TournamentControl.startTurn)).toHaveCount(0);
  await expect(button(page, TournamentControl.nextTurn)).toBeFocused();
  await expect(matchRow(page, 0, 0).locator('td').first()).toHaveText('8');
  await expect(page.getByText(nowPlaying('Ann'), { exact: true })).toBeVisible();
  await button(page, TournamentControl.nextTurn).click();
  await expect(page.getByText(nowPlaying('Ben'), { exact: true })).toBeVisible();
  expect(await currentDeal(page)).toBe(semifinal);
  await expect(page.locator('.card')).toHaveCount(0);
  await playTurn(page, 1);
  await expect(button(page, TournamentControl.nextTurn)).toHaveCount(0);
  await expect(matchRow(page, 0, 1).locator('td').first()).toHaveText('9');
  await expect(page.locator('.match').nth(0)).toContainText(winnerLine('Ann'));
  await expect(page.locator('.match').nth(2)).toContainText(TournamentText.undecided);
  await button(page, TournamentControl.nextMatch).click();

  await expect(page.getByText(nowPlaying('Cy'), { exact: true })).toBeVisible();
  expect(await currentDeal(page)).not.toBe(semifinal);
  await playTurn(page, 2);
  await button(page, TournamentControl.nextTurn).click();
  await playTurn(page);
  await expect(page.locator('.match').nth(1)).toContainText(winnerLine('Dee'));
  await button(page, TournamentControl.nextMatch).click();

  await expect(page.getByText(nowPlaying('Ann'), { exact: true })).toBeVisible();
  await expect(page.locator('.match').nth(2)).toContainText('Dee');
  await playTurn(page);
  await button(page, TournamentControl.nextTurn).click();
  await expect(page.getByText(nowPlaying('Dee'), { exact: true })).toBeVisible();
  await playTurn(page, 1);
  await expect(button(page, TournamentControl.nextMatch)).toHaveCount(0);
  await expect(page.getByText(championLine('Ann'), { exact: true })).toBeVisible();
  await expect(page.locator('.match').nth(2)).toContainText(winnerLine('Ann'));
  await expect(button(page, TournamentControl.leave)).toHaveCount(0);
  await expect(button(page, TournamentControl.back)).toBeFocused();

  await button(page, TournamentControl.back).click();
  await expect(button(page, DealControl.tournament)).toBeFocused();
  await expect(page.locator('.card')).toHaveCount(16);
});

test(
  'eight players need three rounds and seven matches',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await startTournament(page, NAMES);
    await expect(page.locator('.match')).toHaveCount(7);
    await expect(page.getByRole('heading', { name: 'Quarterfinals', level: 4 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Semifinals', level: 4 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Final', level: 4, exact: true })).toBeVisible();
    for (let match = 0; match < 7; match += 1) await playMatch(page, match === 6);
    await expect(page.getByText(championLine('Ann'), { exact: true })).toBeVisible();
    await expect(page.locator('.match').nth(4)).toContainText(winnerLine('Ann'));
    await expect(page.locator('.match').nth(5)).toContainText(winnerLine('Eve'));
    await expect(page.locator('.match').nth(6)).toContainText(winnerLine('Ann'));
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('Players offers 4 or 8 inputs, blank names play under their label and duplicates are refused', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await openTournament(page);
  const players = page.getByLabel(TournamentControl.players, { exact: true });
  await expect(players.locator('option')).toHaveText(['4', '8']);
  await expect(page.getByLabel('Player 4', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Player 5', { exact: true })).toHaveCount(0);
  await players.selectOption('8');
  await expect(page.getByLabel('Player 8', { exact: true })).toBeVisible();
  await page.getByLabel('Player 2', { exact: true }).fill('Ann');
  await page.getByLabel('Player 1', { exact: true }).fill('ann');
  await button(page, TournamentControl.start).click();
  await expect(page.getByRole('status').first()).toHaveText(TournamentNotice.duplicate);
  await expect(button(page, TournamentControl.startTurn)).toHaveCount(0);
  await page.getByLabel('Player 1', { exact: true }).fill('  Zed   Zee ');
  await page.getByLabel('Player 1', { exact: true }).press('Enter');
  await expect(page.getByText(nowPlaying('Zed Zee'), { exact: true })).toBeVisible();
  await expect(page.locator('.match').nth(0)).toContainText('Ann');
  await expect(page.locator('.match').nth(1)).toContainText('Player 3');
});

test('finished tournaments stay in the Past tournaments list after a reload', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await openTournament(page);
  await expect(page.getByText(TournamentText.noPast)).toBeVisible();
  await button(page, TournamentControl.back).click();
  await startTournament(page, FOUR);
  await playMatch(page);
  await playMatch(page);
  await playMatch(page, true);
  await expect(page.getByText(championLine('Ann'), { exact: true })).toBeVisible();
  expect(await offScale(page), 'champion screen spacing').toEqual([]);
  await button(page, TournamentControl.back).click();
  await page.reload();
  await openTournament(page);
  await expect(page.getByRole('heading', { name: TournamentText.past })).toBeVisible();
  expect(await offScale(page), 'past tournaments spacing').toEqual([]);
  await expect(page.locator('.past-list li')).toHaveCount(1);
  await expect(page.getByText(championLine('Ann'), { exact: true })).toBeVisible();
  await expect(page.locator('.past-list li')).toContainText('4 players, 4x4');
  await page.getByRole('button', { name: /View bracket, champion Ann/ }).click();
  await expect(page.getByText(championLine('Ann'), { exact: true })).toBeVisible();
  await expect(page.locator('.match')).toHaveCount(3);
  await button(page, TournamentControl.newTournament).click();
  await expect(button(page, TournamentControl.start)).toBeVisible();
  await expect(page.locator('.past-list li')).toHaveCount(1);
});

test('Leave tournament stops it early and keeps it out of the past list', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await startTournament(page, FOUR);
  await playTurn(page);
  await button(page, TournamentControl.leave).click();
  await expect(button(page, TournamentControl.start)).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(0);
  await expect(page.getByText(TournamentNotice.left)).toBeVisible();
  await expect(page.getByText(TournamentText.noPast)).toBeVisible();
  await page.reload();
  await openTournament(page);
  await expect(page.getByText(TournamentText.noPast)).toBeVisible();
});
