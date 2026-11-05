import { expect, test, TestTimeouts } from './browser-test.ts';
import { setupTournament, tournamentExport, finishTournamentTurn } from './tournament-fixture.ts';
import { GAME_URL } from './game-fixture.ts';

test(
  'eight players complete every seeded round on shared deals and retain their bracket after reload',
  async ({ page, gameURL }, artifacts) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.goto(gameURL);
    const preferences = { schemaVersion: 1, size: 10, bestMoves: { '4': 12, '6': 24, '8': 40 } };
    await page.evaluate(
      (value) => localStorage.setItem('neon-pairs.preferences.v1', JSON.stringify(value)),
      preferences,
    );
    await page.reload();
    await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
    await setupTournament(page, 8);
    await expect(page.getByRole('table')).toHaveCount(1);
    await expect(page.locator('th[scope="col"]')).toHaveCount(9);
    await expect(page.locator('[aria-live]')).toHaveCount(1);
    const players = [
      'Ada',
      'Hal',
      'Dev',
      'Emi',
      'Cora',
      'Finn',
      'Bo',
      'Gia',
      'Ada',
      'Dev',
      'Cora',
      'Bo',
      'Ada',
      'Bo',
    ];
    const codes: string[] = [];
    for (let turn = 0; turn < players.length; turn += 1) {
      await expect(page.getByText(`Now playing: ${players[turn]}`, { exact: true })).toBeVisible();
      await expect(
        page.getByText(`Round: ${turn < 8 ? 'Quarterfinal' : turn < 12 ? 'Semifinal' : 'Final'}`, {
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator('.card')).toHaveCount(0);
      codes.push(await finishTournamentTurn(page));
      if (turn === players.length - 1) break;
      const next = turn % 2 === 0 ? 'Next turn' : 'Next match';
      await page.getByRole('button', { name: next, exact: true }).click();
      await page.clock.runFor(3000);
    }
    for (let index = 0; index < codes.length; index += 2)
      expect(codes[index]).toBe(codes[index + 1]);
    expect(new Set(codes).size).toBe(7);
    await expect(page.getByText('Champion: Ada', { exact: true })).toBeVisible();
    const completed = await tournamentExport(page);
    expect(completed.document.run?.event.matches.map((match) => match.results.length)).toEqual([
      2, 2, 2, 2, 2, 2, 2,
    ]);
    const saved = await page.evaluate(() => ({
      preferences: JSON.parse(localStorage.getItem('neon-pairs.preferences.v1') ?? ''),
      tournaments: JSON.parse(localStorage.getItem('np3:tournaments') ?? ''),
    }));
    expect(saved.preferences).toEqual(preferences);
    expect(Object.keys(saved.tournaments).sort()).toEqual(['items', 'v']);
    expect(saved.tournaments.v).toBe(3);
    await page.screenshot({ path: artifacts.outputPath('champion.png'), fullPage: true });
    await page.getByRole('button', { name: 'Back to game', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.locator('.past-tournaments li')).toHaveCount(1);
    await page.getByRole('button', { name: 'View tournament 1', exact: true }).click();
    expect((await tournamentExport(page)).document.run?.event).toEqual(
      completed.document.run?.event,
    );
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('tournament setup validates names and all new controls fit a phone while running offline', async ({
  page,
}, artifacts) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(/^https?:/, (route) => route.abort());
  await page.goto(GAME_URL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Use 2 to 20 characters.');
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  await expect(page.locator('.tournament-names input')).toHaveCount(8);
  for (let index = 0; index < 8; index += 1)
    await page
      .getByLabel(`Player ${index + 1}`, { exact: true })
      .fill(
        index === 7 ? 'ada' : (['  Ada  ', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia'][index] ?? ''),
      );
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Each name must be different.');
  await page.getByLabel('Player 8', { exact: true }).fill('Ha\u006c');
  for (const control of await page
    .locator('.tournament button, .tournament input, .tournament select, .tournament textarea')
    .all()) {
    const box = await control.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  expect((await tournamentExport(page)).document.run?.event.players[0]).toBe('Ada');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: artifacts.outputPath('phone-bracket.png'), fullPage: true });
});
