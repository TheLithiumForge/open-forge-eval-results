import { expect, test } from './browser-test.ts';
import { startTournament, exportTournament, checkTournamentTargets } from './tournament-fixture.ts';
import { encodeTournament } from '../src/game/tournament/format.ts';
import { tournamentFixture } from '../src/game/tournament/tournament.fixture.ts';
import { TournamentPhase } from '../src/game/tournament/rules.ts';
import { activateCard } from '../src/game/game.ts';
import { loadTimedBoard, exportedSnapshot } from './game-fixture.ts';

test('name validation, setup exchange and failed imports preserve editable state', async ({
  page,
  gameURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Use 2 to 20 characters.');
  for (const [index, name] of [' Ada ', 'Bo', 'Cora', 'ada'].entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Each name must be different.');
  const setup = await exportTournament(page);
  await page.getByLabel('Tournament JSON', { exact: true }).fill(encodeTournament(setup));
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByLabel('Player 1', { exact: true })).toHaveValue(' Ada ');
  const invalid = JSON.stringify({
    format: 'neon-pairs/tournament',
    version: 1,
    state: { kind: 'setup', names: [] },
    extra: true,
  });
  await page.getByLabel('Tournament JSON', { exact: true }).fill(invalid);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Unknown field: extra.');
  await expect(page.getByLabel('Tournament JSON', { exact: true })).toHaveValue(invalid);
  await expect(page.getByLabel('Player 1', { exact: true })).toHaveValue(' Ada ');
  await checkTournamentTargets(page);
});

test('unfinished imports wait for Start turn and leaving uses a native cancellable dialog', async ({
  page,
  gameURL,
}) => {
  await page.clock.install();
  await page.goto(gameURL);
  await startTournament(page, 4);
  const initial = tournamentFixture();
  const imported = {
    ...initial,
    phase: TournamentPhase.playing,
    game: {
      ...activateCard(initial.game, 0),
      elapsedMs: 1200,
    },
  };
  await page.getByLabel('Tournament JSON', { exact: true }).fill(encodeTournament(imported));
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start turn', exact: true })).toBeVisible();
  await page.clock.runFor(5000);
  const paused = await exportTournament(page);
  if (!('game' in paused)) throw new Error('Expected imported progress.');
  expect(paused.game.elapsedMs).toBe(1200);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByLabel('Tournament JSON', { exact: true }).fill('{');
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Invalid tournament.');
  await expect(page.getByLabel('Tournament JSON', { exact: true })).toHaveValue('{');
  await expect(page.locator('dialog')).not.toBeVisible();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Leave tournament', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
  await page.clock.runFor(2000);
  await expect(page.locator('.stats dd').nth(0)).toHaveText('0');
});

test('entering tournament confirms unfinished solo play and excludes time spent on its screens', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').first().click();
  await page.clock.runFor(1013);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Tournament', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await page.clock.runFor(5000);
  await page.getByRole('button', { name: 'Back to game', exact: true }).click();
  expect((await exportedSnapshot(page)).elapsedMs).toBe(1013);
});

test('blocked storage keeps tournament play and exchange available with a visible history notice', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage denied');
      },
    }),
  );
  await page.goto(gameURL);
  await startTournament(page, 8);
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  expect('deals' in (await exportTournament(page))).toBe(true);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').first().click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
});
