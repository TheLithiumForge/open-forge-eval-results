import { expect, test } from './browser-test.ts';
import { TournamentControl } from '../src/game/tournament/labels.ts';
import { GAME_URL, loadFixedBoard } from './game-fixture.ts';
import {
  button,
  enterPlayers,
  exportedTournament,
  FINISHED,
  LOADABLE,
  openTournament,
  PLAYERS,
} from './tournament-fixture.ts';

test('leaving unfinished work asks first, keeps playing on Escape and leaves on request', async ({
  page,
}) => {
  await loadFixedBoard(page);
  await page.locator('.card').nth(0).click();
  const tournament = button(page, TournamentControl.open);
  await tournament.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveText(/Leave this game\?/);
  await expect(button(page, TournamentControl.keepPlaying)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(tournament).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await tournament.click();
  await button(page, TournamentControl.confirmLeave).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await enterPlayers(page, PLAYERS);
  await button(page, TournamentControl.start).click();
  await button(page, TournamentControl.leave).click();
  await expect(dialog).toHaveText(/Leave this tournament\?/);
  await button(page, TournamentControl.keepPlaying).click();
  await expect(button(page, TournamentControl.leave)).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Now playing: Ada');
  await button(page, TournamentControl.leave).click();
  await button(page, TournamentControl.confirmLeave).click();
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
  await expect(page.locator('.card')).toHaveCount(16);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

test('names are checked by length and repeat in the group before a tournament starts', async ({
  page,
}) => {
  await page.goto(GAME_URL);
  await openTournament(page);
  const status = page.getByRole('status');
  const start = button(page, TournamentControl.start);
  await enterPlayers(page, ['Ada', 'Bo', '  C  ', 'Dev']);
  await start.click();
  await expect(status).toHaveText('Use 2 to 20 characters.');
  await expect(page.getByLabel('Player 3', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await enterPlayers(page, ['Ada', 'Bo', 'Cora', 'A'.repeat(21)]);
  await start.click();
  await expect(status).toHaveText('Use 2 to 20 characters.');
  await enterPlayers(page, ['Mira', 'Bo', 'Cora', ' MIRA']);
  await start.click();
  await expect(status).toHaveText('Each name must be different.');
  await expect(page.getByLabel('Player 4', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(start).toBeFocused();
  await page.getByLabel(TournamentControl.players, { exact: true }).selectOption('8');
  await expect(page.getByLabel(/^Player \d$/)).toHaveCount(8);
  await page.getByLabel(TournamentControl.players, { exact: true }).selectOption('4');
  await expect(page.getByLabel('Player 4', { exact: true })).toHaveValue(' MIRA');
  await page.getByLabel('Player 4', { exact: true }).fill('Dev');
  await page.getByLabel('Player 4', { exact: true }).press('Enter');
  await expect(status).toHaveText('Now playing: Mira');
});

test('tournament JSON exports, rejects unknown fields and loads progress or a finished event', async ({
  page,
}) => {
  await page.goto(GAME_URL);
  await openTournament(page);
  const status = page.getByRole('status');
  const field = page.getByLabel(TournamentControl.json, { exact: true });
  const load = button(page, TournamentControl.loadTournament);
  await button(page, TournamentControl.exportTournament).click();
  await expect(status).toHaveText('No tournament to export.');
  const extra = { ...LOADABLE, matches: [{ ...LOADABLE.matches[0], seat: 1 }], note: 'x' };
  await field.fill(JSON.stringify(extra));
  await load.click();
  await expect(status).toHaveText('Unknown field: seat.');
  await expect(field).toHaveValue(JSON.stringify(extra));
  await field.fill('{"format":"neon-pairs/tournament","version":1}');
  await load.click();
  await expect(status).toHaveText('Invalid tournament.');
  await field.fill(JSON.stringify(LOADABLE));
  await load.click();
  await expect(status).toHaveText('Loaded tournament. Now playing: Dev.');
  await expect(load).toBeFocused();
  await expect(page.getByText('Round: Semifinal', { exact: true })).toBeVisible();
  expect(await exportedTournament(page)).toEqual(LOADABLE);
  await field.fill(JSON.stringify(FINISHED));
  await load.click();
  await expect(page.getByText(/Load another tournament\?/)).toBeVisible();
  await button(page, TournamentControl.keepPlaying).click();
  await expect(status).toHaveText('Loaded tournament. Now playing: Dev.');
  await load.click();
  await button(page, TournamentControl.confirmLeave).click();
  await expect(status).toHaveText('Loaded completed tournament.');
  await expect(page.getByText('Champion: Ada', { exact: true })).toBeVisible();
  await expect(button(page, TournamentControl.leave)).toHaveCount(0);
  await button(page, TournamentControl.back).click();
  await openTournament(page);
  await expect(page.getByText('No finished tournaments yet.', { exact: true })).toBeVisible();
});

test('blocked storage keeps the tournament playable and says progress is not saved', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage is blocked.', 'SecurityError');
      },
    });
  });
  await page.goto(GAME_URL);
  await openTournament(page);
  await expect(
    page
      .getByRole('region', { name: 'Past tournaments' })
      .getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  await enterPlayers(page, PLAYERS);
  await button(page, TournamentControl.start).click();
  await expect(page.getByRole('status')).toHaveText('Now playing: Ada');
});

test('tournament controls are full-size targets at phone width and results are captioned tables', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(GAME_URL);
  const measure = async () => {
    const controls = page.locator('main button, main select, main input, main textarea');
    for (const control of await controls.all()) {
      if (!(await control.isVisible())) continue;
      const box = await control.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    await expect(page.locator('[aria-live]')).toHaveCount(1);
  };
  await openTournament(page);
  await measure();
  await page.getByLabel(TournamentControl.players, { exact: true }).selectOption('8');
  await enterPlayers(page, ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal']);
  await button(page, TournamentControl.start).click();
  await measure();
  const table = page.getByRole('table', { name: 'Bracket' });
  await expect(table.locator('th[scope="col"]')).toHaveText([
    'Match',
    'Player',
    'Moves',
    'Time',
    'Winner',
  ]);
  await button(page, TournamentControl.leave).click();
  await measure();
});
