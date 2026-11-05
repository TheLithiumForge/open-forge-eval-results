import { expect, test, TestTimeouts } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { enterTournament, finishTournamentTurn, tournamentExport } from './tournament-support.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { TOURNAMENTS_KEY } from '../src/game/tournament/storage.ts';

for (const count of [4, 8]) {
  test(
    `${count} players complete a seeded knockout and find saved results after reload`,
    async ({ page, gameURL }, artifacts) => {
      await loadTimedBoard(page, gameURL);
      await page.getByLabel('Grid size', { exact: true }).selectOption('10');
      const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
      await enterTournament(page, count);
      const opening = await tournamentExport(page);
      const pairs = opening.tournament.matches.slice(0, count / 2).map((match) => match.players);
      expect(pairs).toEqual(
        count === 4
          ? [
              [0, 3],
              [1, 2],
            ]
          : [
              [0, 7],
              [3, 4],
              [2, 5],
              [1, 6],
            ],
      );
      expect(new Set(opening.tournament.matches.map((match) => match.boardCode)).size).toBe(
        count - 1,
      );
      await expect(page.locator('.card')).toHaveCount(0);
      for (let match = 0; match < count - 1; match += 1) {
        const first = await finishTournamentTurn(page);
        await expect(page.getByRole('button', { name: 'Next turn', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Next turn', exact: true }).click();
        const second = await finishTournamentTurn(page, true);
        expect(second).toBe(first);
        if (match < count - 2) {
          await page.getByRole('button', { name: 'Next match', exact: true }).click();
          await expect(
            page.getByRole('heading', { name: 'Tournament', exact: true }),
          ).toBeFocused();
        }
      }
      await expect(page.locator('.victory')).toHaveText('Champion: Ada');
      await expect(page.getByRole('status')).toContainText('Champion: Ada');
      const finished = await tournamentExport(page);
      expect(finished.tournament.matches.every((match) => match.winner !== null)).toBe(true);
      await expect(page.getByRole('table', { name: 'Tournament bracket' })).toBeVisible();
      expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(
        preferences,
      );
      const stored = await page.evaluate((key) => localStorage.getItem(key), TOURNAMENTS_KEY);
      expect(stored).toContain('"v":3');
      await page.screenshot({ path: artifacts.outputPath('champion.png'), fullPage: true });
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
      await page.reload();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await page
        .getByRole('button', { name: `${count} players · Champion: Ada`, exact: true })
        .click();
      await expect(page.locator('.victory')).toHaveText('Champion: Ada');
      expect((await tournamentExport(page)).text).toBe(finished.text);
    },
    {},
    undefined,
    TestTimeouts.long,
  );
}

test('names validate normalized length and case-insensitive duplicates at phone width', async ({
  page,
  gameURL,
}, artifacts) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loadTimedBoard(page, gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Use 2 to 20 characters.');
  for (const [index, name] of ['  Cafe\u0301   Ada ', 'Bo', 'Cora', 'CAFÉ ADA'].entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Each name must be different.');
  const targets = await page
    .locator('.tournament button, .tournament input, .tournament select, .tournament textarea')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return [box.width, box.height];
      }),
    );
  for (const [width, height] of targets) {
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  }
  await page.getByLabel('Player 4', { exact: true }).fill('😀'.repeat(20));
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(
    page.locator('.tournament').getByText('Now playing: Café Ada', { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: artifacts.outputPath('phone-handoff.png'), fullPage: true });
});
