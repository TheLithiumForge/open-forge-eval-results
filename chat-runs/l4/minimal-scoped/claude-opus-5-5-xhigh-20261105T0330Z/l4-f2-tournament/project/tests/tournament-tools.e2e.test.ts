import { expect, test } from './browser-test.ts';
import { TournamentLoad } from '../src/game/tournament/format.ts';
import { NO_EXPORT } from '../src/game/tournament/use-tournament.ts';
import { TournamentControl, TournamentText } from '../src/game/tournament/tournament-labels.ts';
import { exportedSnapshot, GAME_URL, loadTimedBoard } from './game-fixture.ts';
import { button, matchCodes, playTurn, startTournament } from './tournament-fixture.ts';

const EIGHT = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];

test('export and load carry a tournament, and refused drafts keep the one on screen', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await startTournament(page, EIGHT);
  const status = page.getByRole('status');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Round: Quarterfinal');
  const [quarterfinals = []] = await matchCodes(page);
  expect(quarterfinals.map((code) => code.split('-')[1])).toEqual(['4', '4', '4', '4']);
  await playTurn(page, quarterfinals[0] ?? '');
  const field = page.getByLabel(TournamentControl.json, { exact: true });
  await button(page, TournamentControl.exportTournament).click();
  const exported = await field.inputValue();
  const notice = page.locator('#tournament-notice');

  await field.fill(exported.replace('"format"', '"notes": "x",\n  "format"'));
  await button(page, TournamentControl.loadTournament).click();
  await expect(notice).toHaveText('Unknown field: notes.');
  await expect(status).toHaveText('Unknown field: notes.');
  await field.fill('{');
  await button(page, TournamentControl.loadTournament).click();
  await expect(notice).toHaveText(TournamentLoad.invalid);
  await expect(field).toHaveValue('{');
  await expect(button(page, TournamentControl.nextTurn)).toBeVisible();

  await field.fill(exported);
  await button(page, TournamentControl.loadTournament).click();
  const dialog = page.getByRole('dialog', { name: TournamentText.leaveTitle });
  await expect(dialog).toBeVisible();
  await expect(button(page, TournamentControl.keepPlaying)).toBeFocused();
  await button(page, TournamentControl.keepPlaying).click();
  await expect(dialog).toBeHidden();
  await expect(button(page, TournamentControl.loadTournament)).toBeFocused();
  await expect(button(page, TournamentControl.nextTurn)).toBeVisible();

  await button(page, TournamentControl.leave).click();
  await expect(button(page, TournamentControl.keepPlaying)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(button(page, TournamentControl.leave)).toBeFocused();
  await button(page, TournamentControl.leave).click();
  await button(page, TournamentControl.confirmLeave).click();
  await expect(page.getByRole('heading', { name: 'Solo game' })).toBeFocused();

  await button(page, TournamentControl.open).click();
  await button(page, TournamentControl.exportTournament).click();
  await expect(notice).toHaveText(NO_EXPORT);
  await field.fill(exported);
  await button(page, TournamentControl.loadTournament).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Round: Quarterfinal' })).toBeFocused();
  await expect(status).toHaveText('Now playing: Hal');
  await expect(notice).toHaveText(TournamentLoad.loaded);
  await expect(button(page, TournamentControl.startTurn)).toBeVisible();
  await expect(page.locator('.bracket tbody tr').first()).toHaveText('Quarterfinal 1Ada80:00');
});

test('the solo game and its mismatch wait while the Tournament screen is open', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(300);
  const before = await exportedSnapshot(page);
  await button(page, TournamentControl.open).click();
  await expect(
    page.getByRole('heading', { name: TournamentText.title, exact: true }),
  ).toBeFocused();
  await page.clock.runFor(5000);
  await button(page, TournamentControl.back).click();
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect(await exportedSnapshot(page)).toEqual(before);
  await page.clock.runFor(499);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

test('blocked storage keeps tournaments in memory and says so where records appear', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await page.goto(GAME_URL);
  await button(page, TournamentControl.open).click();
  const past = page.getByRole('region', { name: TournamentText.past });
  await expect(past.getByText(TournamentText.unsaved, { exact: true })).toBeVisible();
  await expect(past.getByText(TournamentText.noPast, { exact: true })).toBeVisible();
});
