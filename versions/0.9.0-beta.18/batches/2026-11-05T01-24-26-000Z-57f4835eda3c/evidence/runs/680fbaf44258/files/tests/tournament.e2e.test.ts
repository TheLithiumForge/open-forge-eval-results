import { expect, Scrollbars, test, TestTimeouts } from './browser-test.ts';
import { parseBoardCode } from '../src/game/deck.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { GAME_URL } from './game-fixture.ts';
import { PAST_TOURNAMENTS_KEY } from '../src/game/tournament/tournament-storage.ts';
import {
  championLine,
  nowPlaying,
  playerLabel,
  TournamentControl,
  TournamentNotice,
} from '../src/game/tournament/tournament-labels.ts';
import {
  button,
  dealExampleBoards,
  enterPlayers,
  exportedTournament,
  FOUR_PLAYERS,
  loadTournament,
  matchRows,
  openTournament,
  playTurn,
} from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

async function finishTurn(page: Page, misses: number, pairMs: number, next: string) {
  await playTurn(page, misses, pairMs);
  await expect(button(page, next)).toBeFocused();
}

test(
  'a four-player knockout plays one deal per match and keeps its champion after reload',
  async ({ page, gameURL }) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.goto(gameURL);
    await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
    await expect(page.locator('.controls button')).toHaveText([
      DealControl.newGame,
      DealControl.tournament,
      DealControl.restart,
    ]);
    await openTournament(page);
    const players = page.getByLabel(TournamentControl.players, { exact: true });
    await expect(players).toHaveValue('4');
    await expect(players.locator('option')).toHaveText(['4', '8']);
    await expect(page.getByLabel(playerLabel(4), { exact: true })).toHaveCount(0);
    await enterPlayers(page, FOUR_PLAYERS);
    await button(page, TournamentControl.start).click();
    await expect(page.getByRole('heading', { name: nowPlaying('Ann') })).toBeVisible();
    await expect(button(page, TournamentControl.startTurn)).toBeFocused();
    const started = await exportedTournament(page);
    expect(started).toMatchObject({
      version: 1,
      players: FOUR_PLAYERS,
      stage: 'ready',
      game: null,
    });
    expect(started.matches).toHaveLength(3);
    for (const match of Array.isArray(started.matches) ? started.matches : [])
      expect(parseBoardCode(String(match.boardCode))?.size).toBe(4);
    await dealExampleBoards(page);
    await expect(page.locator('.tournament-notice')).toHaveText(TournamentNotice.loaded);

    await finishTurn(page, 0, 375, TournamentControl.nextTurn);
    await expect(page.locator('.stats > div')).toHaveCount(3);
    await expect(page.locator('.tournament-notice')).toHaveText(
      "Ann's turn is over. Ben plays the same deal next.",
    );
    await button(page, TournamentControl.nextTurn).click();
    await expect(page.getByRole('heading', { name: nowPlaying('Ben') })).toBeVisible();
    await expect(page.locator('.card')).toHaveCount(0);
    await button(page, TournamentControl.startTurn).click();
    await page.locator('.card').nth(2).click();
    const benTurn = await exportedTournament(page);
    const firstDeal = Array.isArray(benTurn.matches) ? benTurn.matches[0] : null;
    expect(benTurn).toMatchObject({ stage: 'playing', game: { boardCode: firstDeal.boardCode } });
    await button(page, TournamentControl.leave).click();
    await openTournament(page);
    await loadTournament(page, benTurn);
    await expect(page.getByRole('heading', { name: nowPlaying('Ben') })).toBeVisible();
    await button(page, TournamentControl.startTurn).click();
    await expect(page.locator('.card.revealed')).toHaveCount(1);
    await page.clock.runFor(400);
    await page.locator('.card').nth(6).click();
    await page.locator('.card').nth(0).click();
    await page.locator('.card').nth(1).click();
    await page.clock.runFor(800);
    for (const [first, second] of EXAMPLE_PAIRS.slice(1)) {
      await page.locator('.card').nth(first).click();
      await page.clock.runFor(400);
      await page.locator('.card').nth(second).click();
    }
    await expect(button(page, TournamentControl.nextMatch)).toBeFocused();
    await expect(page.locator('.tournament-notice')).toHaveText('Ann wins match 1.');
    expect(await matchRows(page, 0)).toEqual(['Ann | 8 | 0:03', 'Ben | 9 | 0:04', 'Winner: Ann']);
    expect(await matchRows(page, 2)).toEqual([
      'Ann | – | –',
      'Winner of match 2 | – | –',
      'Winner: to be decided',
    ]);

    await button(page, TournamentControl.nextMatch).click();
    await expect(page.getByRole('heading', { name: nowPlaying('Cy') })).toBeVisible();
    await finishTurn(page, 0, 625, TournamentControl.nextTurn);
    await button(page, TournamentControl.nextTurn).click();
    await finishTurn(page, 0, 250, TournamentControl.nextMatch);
    expect(await matchRows(page, 1)).toEqual(['Cy | 8 | 0:05', 'Di | 8 | 0:02', 'Winner: Di']);
    await button(page, TournamentControl.nextMatch).click();
    await expect(page.getByRole('heading', { name: nowPlaying('Ann') })).toBeVisible();
    await finishTurn(page, 2, 250, TournamentControl.nextTurn);
    await button(page, TournamentControl.nextTurn).click();
    await playTurn(page, 1, 250);
    const champion = page.getByRole('heading', { name: championLine('Di') });
    await expect(champion).toBeFocused();
    await expect(button(page, TournamentControl.leave)).toHaveCount(0);
    expect(await matchRows(page, 2)).toEqual(['Ann | 10 | 0:03', 'Di | 9 | 0:02', 'Winner: Di']);
    expect(await exportedTournament(page)).toMatchObject({ stage: 'ended', game: null });
    await button(page, TournamentControl.back).click();
    await expect(button(page, DealControl.tournament)).toBeFocused();
    await expect(page.locator('.stats dd').nth(3)).toHaveText('none');

    await page.reload();
    await openTournament(page);
    const past = page.locator('.past-tournaments li');
    await expect(past).toHaveCount(1);
    await expect(past).toHaveText(`${championLine('Di')} Ann, Ben, Cy, Di, 4x4`);
    expect(await page.evaluate((key) => localStorage.getItem(key), PAST_TOURNAMENTS_KEY)).toContain(
      '"Di"',
    );
  },
  {},
  Scrollbars.hidden,
  TestTimeouts.long,
);

test('eight players need distinct names and Leave tournament stops without a past entry', async ({
  page,
}) => {
  await page.goto(GAME_URL);
  await openTournament(page);
  await page.getByLabel(TournamentControl.players, { exact: true }).selectOption('8');
  for (let seat = 0; seat < 8; seat += 1)
    await expect(page.getByLabel(playerLabel(seat), { exact: true })).toBeVisible();
  await button(page, TournamentControl.start).click();
  await expect(page.locator('.tournament-notice')).toHaveText(TournamentNotice.missingName);
  await expect(page.getByLabel(playerLabel(0), { exact: true })).toBeFocused();
  const names = ['Ann', 'Ben', 'Cy', 'Di', 'ann', 'Flo', 'Gus', 'Hal'];
  await enterPlayers(page, names);
  await button(page, TournamentControl.start).click();
  await expect(page.locator('.tournament-notice')).toHaveText(TournamentNotice.duplicateName);
  await expect(page.getByLabel(playerLabel(4), { exact: true })).toBeFocused();
  await page.getByLabel(playerLabel(4), { exact: true }).fill('  Ed  ');
  await button(page, TournamentControl.start).click();
  await expect(page.getByRole('heading', { name: nowPlaying('Ann') })).toBeVisible();
  await expect(page.locator('.bracket h4')).toHaveText(['Quarterfinals', 'Semifinals', 'Final']);
  await expect(page.locator('.match')).toHaveCount(7);
  expect(await matchRows(page, 2)).toEqual(['Ed | – | –', 'Flo | – | –', 'Winner: to be decided']);
  expect(await matchRows(page, 6)).toEqual([
    'Winner of match 5 | – | –',
    'Winner of match 6 | – | –',
    'Winner: to be decided',
  ]);
  await button(page, TournamentControl.startTurn).click();
  await page.locator('.card').first().click();
  await button(page, TournamentControl.leave).click();
  await expect(button(page, DealControl.tournament)).toBeFocused();
  await expect(page.locator('.card')).toHaveCount(16);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await openTournament(page);
  await expect(page.getByLabel(playerLabel(0), { exact: true })).toHaveValue('');
  await expect(page.locator('.past-tournaments')).toContainText(TournamentNotice.noPast);
});
