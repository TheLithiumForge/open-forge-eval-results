import { expect, test, TestTimeouts, Scrollbars } from './browser-test.ts';
import {
  startBrowserTournament,
  solveTournamentDeal,
  tournamentCodes,
  tournamentText,
} from './tournament-fixture.ts';

for (const count of [4, 8] as const)
  test(
    `${count} players complete a knockout and can reopen its saved bracket after reload`,
    async ({ page, gameURL }) => {
      await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
      await page.addInitScript(() => {
        localStorage.setItem(
          'neon-pairs.preferences.v1',
          JSON.stringify({ schemaVersion: 1, size: 10, bestMoves: { '4': 12, '6': 24 } }),
        );
      });
      await page.goto(gameURL);
      await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
      const preferences = await page.evaluate(() =>
        localStorage.getItem('neon-pairs.preferences.v1'),
      );
      await startBrowserTournament(page, count);
      const codes = await tournamentCodes(page);
      expect(new Set(codes).size).toBe(count - 1);
      const names =
        count === 4
          ? ['Ada', 'Dev', 'Bo', 'Cora', 'Ada', 'Bo']
          : [
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
      const sizes = count === 4 ? [6, 6, 8] : [4, 4, 4, 4, 6, 6, 8];
      for (const [match, code] of codes.entries()) {
        const size = sizes[match] ?? 0;
        expect(code).toMatch(new RegExp(`^np1-${size}-`));
        for (let turn = 0; turn < 2; turn += 1) {
          await expect(
            page.getByText(`Now playing: ${names[match * 2 + turn]}`, { exact: true }),
          ).toBeVisible();
          await expect(page.locator('.card')).toHaveCount(0);
          await page.clock.runFor(5000);
          await page.getByRole('button', { name: 'Start turn', exact: true }).click();
          await expect(page.locator('.card')).toHaveCount(size ** 2);
          await expect(page.locator('.card svg')).toHaveCount(0);
          await expect(page.getByRole('status')).toHaveText(
            `Now playing: ${names[match * 2 + turn]}`,
          );
          await expect(page.locator('[aria-live]')).toHaveCount(1);
          await solveTournamentDeal(page, code);
          await expect(
            page.getByRole('heading', { name: 'Tournament', exact: true }),
          ).toBeFocused();
          if (turn === 0)
            await page.getByRole('button', { name: 'Next turn', exact: true }).click();
        }
        if (match < codes.length - 1)
          await page.getByRole('button', { name: 'Next match', exact: true }).click();
      }
      await expect(page.getByText('Champion: Ada', { exact: true })).toBeVisible();
      const table = page.getByRole('table', { name: 'Tournament bracket', exact: true });
      await expect(table.locator('th[scope="col"]')).toHaveCount(6);
      await expect(table.locator('tbody tr')).toHaveCount((count - 1) * 2);
      await expect(table.getByText('0:00', { exact: true })).toHaveCount((count - 1) * 2);
      expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(
        preferences,
      );
      const completed = await tournamentText(page);
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
      await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
      await page.reload();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Past tournaments', exact: true }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'View tournament 1, champion Ada', exact: true })
        .click();
      expect(await tournamentText(page)).toBe(completed);
    },
    {},
    Scrollbars.hidden,
    TestTimeouts.long,
  );
