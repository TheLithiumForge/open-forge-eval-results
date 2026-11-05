import { expect, test, TestTimeouts } from './browser-test.ts';
import {
  startTournament,
  exportTournament,
  solveTournamentTurn,
  checkTournamentTargets,
} from './tournament-fixture.ts';
import { TOURNAMENTS_KEY } from '../src/game/tournament/storage.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { encodeTournament } from '../src/game/tournament/format.ts';

for (const count of [4, 8])
  test(
    `${count} players finish shared deals, advance a bracket and reload their champion`,
    async ({ page, gameURL }, artifacts) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.clock.install();
      await page.goto(gameURL);
      await page.getByLabel('Grid size', { exact: true }).selectOption('10');
      const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
      await startTournament(page, count);
      await checkTournamentTargets(page);
      const initial = await exportTournament(page);
      if (!('deals' in initial)) throw new Error('Expected a tournament.');
      expect(new Set(initial.deals).size).toBe(count - 1);
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      for (let turn = 0; turn < (count - 1) * 2; turn++) {
        await expect(page.locator('.card')).toHaveCount(0);
        const round =
          count === 8 && turn < 8 ? 'Quarterfinal' : turn < (count - 2) * 2 ? 'Semifinal' : 'Final';
        await expect(page.getByText(`Round: ${round}`, { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Start turn', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
        const code = initial.deals[Math.floor(turn / 2)];
        if (!code) throw new Error('Missing match deal.');
        await solveTournamentTurn(page, code);
        if (turn < (count - 1) * 2 - 1)
          await page
            .getByRole('button', { name: turn % 2 ? 'Next match' : 'Next turn', exact: true })
            .click();
      }
      await expect(page.locator('.victory')).toHaveText('Champion: Ada');
      await expect(
        page.getByRole('heading', { name: 'Tournament complete', exact: true }),
      ).toBeFocused();
      await expect(page.locator('table caption')).toHaveText('Tournament bracket');
      await expect(page.locator('table th[scope="col"]')).toHaveCount(5);
      await expect(page.locator('table tbody tr')).toHaveCount((count - 1) * 2);
      await expect(page.locator('[aria-live]')).toHaveCount(1);
      expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(
        preferences,
      );
      const finished = await exportTournament(page);
      if (!('results' in finished)) throw new Error('Expected completed results.');
      expect(finished.results.length).toBe((count - 1) * 2);
      const stored = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
        TOURNAMENTS_KEY,
      );
      expect(stored.v).toBe(3);
      expect(stored.items.length).toBe(1);
      await checkTournamentTargets(page);
      await page.screenshot({ path: artifacts.outputPath('champion.png'), fullPage: true });
      await page.getByRole('button', { name: 'New tournament', exact: true }).click();
      await page.getByLabel('Tournament JSON', { exact: true }).fill(encodeTournament(finished));
      await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
      await expect(page.locator('.victory')).toHaveText('Champion: Ada');
      await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
      await expect(page.locator('.tournament-history li')).toHaveCount(1);
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
      await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
      await page.reload();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await expect(page.locator('.tournament-history li')).toHaveCount(1);
      await page.locator('.tournament-history button').click();
      await expect(page.locator('.victory')).toHaveText('Champion: Ada');
      expect(await exportTournament(page)).toEqual(finished);
    },
    {},
    undefined,
    TestTimeouts.long,
  );
