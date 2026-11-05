import { expect, test } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { finishTournamentGame, setupTournament, tournamentExport } from './tournament-fixture.ts';

test('an active tournament resumes its exact game only after Start turn and rejects invalid loads', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await setupTournament(page);
  const initial = (await tournamentExport(page)).tournament;
  const code = initial?.boardCodes[0];
  if (!code) throw new Error('Expected match deal.');
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').first().click();
  await page.clock.runFor(1200);
  const exported = await tournamentExport(page);
  const json = await page.getByLabel('Tournament JSON').inputValue();
  expect(exported.tournament?.game).toMatchObject({
    elapsedMs: 1200,
    moves: 0,
    selection: { kind: 'one', index: 0 },
  });
  await page.getByLabel('Tournament JSON').fill('{');
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.locator('#tournament-notice')).toHaveText('Invalid tournament JSON.');
  expect((await tournamentExport(page)).tournament).toEqual(exported.tournament);
  await page.getByLabel('Tournament JSON').fill(json);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Now playing: Ada', exact: true })).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(0);
  await page.clock.runFor(5000);
  expect((await tournamentExport(page)).tournament).toEqual(exported.tournament);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.clock.runFor(300);
  expect((await tournamentExport(page)).tournament?.game?.elapsedMs).toBe(1500);
  await finishTournamentGame(page, code);
  const handoff = (await tournamentExport(page)).tournament;
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  expect((await tournamentExport(page)).tournament).toEqual(handoff);
  await page.getByRole('button', { name: 'Next turn', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Now playing: Bo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next turn', exact: true })).toBeVisible();
});

test('setup exports names and player count, and leaving discards an unfinished tournament', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByLabel('Players', { exact: true }).locator('option')).toHaveText([
    '4',
    '8',
  ]);
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  for (let index = 1; index <= 8; index++)
    await expect(page.getByLabel(`Player ${index}`, { exact: true })).toBeVisible();
  await page.getByLabel('Player 8', { exact: true }).fill('Last player');
  const setup = await tournamentExport(page);
  expect(setup.setup.size).toBe(6);
  await page.getByLabel('Players', { exact: true }).selectOption('4');
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByLabel('Players', { exact: true })).toHaveValue('8');
  await expect(page.getByLabel('Player 8', { exact: true })).toHaveValue('Last player');
  expect(await tournamentExport(page)).toEqual(setup);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Back to game', exact: true }).click();
  await page.getByLabel('Grid size', { exact: true }).selectOption('4');
  await setupTournament(page);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').first().click();
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(16);
  await page.clock.runFor(2000);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Past tournaments', exact: true })).toContainText(
    'No finished tournaments yet.',
  );
});
