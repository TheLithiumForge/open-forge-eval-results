import { expect, test } from './browser-test.ts';
import { GAME_URL } from './game-fixture.ts';
import {
  playerLabel,
  TournamentControl,
  TournamentNotice,
} from '../src/game/tournament/tournament-labels.ts';
import { button, enterPlayers, exportedTournament, openTournament } from './tournament-fixture.ts';

test('the setup draft round trips and invalid tournament text changes nothing', async ({
  page,
}) => {
  await page.goto(GAME_URL);
  await openTournament(page);
  await enterPlayers(page, ['Ann', 'Ben', '', '']);
  expect(await exportedTournament(page)).toEqual({
    version: 1,
    players: ['Ann', 'Ben', '', ''],
    matches: [],
    stage: 'setup',
    game: null,
  });
  await enterPlayers(page, ['Zed', 'Ben', 'Cy', 'Di', 'Ed', 'Flo', 'Gus', 'Hal']);
  const load = button(page, TournamentControl.loadTournament);
  await load.click();
  await expect(load).toBeFocused();
  await expect(page.getByLabel(TournamentControl.players, { exact: true })).toHaveValue('4');
  await expect(page.getByLabel(playerLabel(0), { exact: true })).toHaveValue('Ann');
  const json = page.getByLabel(TournamentControl.json, { exact: true });
  await json.fill('{');
  await load.click();
  await expect(page.locator('.tournament-notice')).toHaveText(TournamentNotice.invalid);
  await expect(json).toHaveValue('{');
  await expect(page.getByLabel(playerLabel(1), { exact: true })).toHaveValue('Ben');
});
