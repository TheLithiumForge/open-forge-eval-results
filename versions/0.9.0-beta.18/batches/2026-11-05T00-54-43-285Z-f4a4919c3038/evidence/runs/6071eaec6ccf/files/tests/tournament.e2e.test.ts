import { expect, Scrollbars, test, TestTimeouts } from './browser-test.ts';
import {
  ENTRANTS,
  enterTournament,
  finishTournamentTurn,
  tournamentState,
} from './tournament-fixture.ts';
import { TOURNAMENTS_KEY } from '../src/game/tournament/storage.ts';

for (const count of [4, 8])
  test(
    `${count} players finish a knockout with shared deals, explicit handoffs and saved bracket results`,
    async ({ page, gameURL }, artifacts) => {
      await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
      await page.goto(gameURL);
      await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
      await page.getByLabel('Grid size', { exact: true }).selectOption('10');
      const preferences = await page.evaluate(() =>
        localStorage.getItem('neon-pairs.preferences.v1'),
      );
      await enterTournament(page, count);
      const initial = await tournamentState(page);
      expect(new Set(initial.matches.map((match) => match.boardCode)).size).toBe(count - 1);
      const sizes = count === 4 ? [6, 6, 8] : [4, 4, 4, 4, 6, 6, 8];
      const firstRows = await page.locator('tbody tr td:nth-child(3)').allTextContents();
      expect(firstRows.slice(0, count)).toEqual(
        count === 4
          ? ['Ada', 'Dev', 'Bo', 'Cora']
          : ['Ada', 'Hal', 'Dev', 'Emi', 'Cora', 'Finn', 'Bo', 'Gia'],
      );
      await expect(page.locator('caption')).toHaveText('Tournament bracket');
      await expect(page.locator('thead th[scope="col"]')).toHaveCount(6);
      for (let match = 0; match < count - 1; match++) {
        const code = initial.matches[match]?.boardCode;
        if (!code) throw new Error('Expected a scheduled match.');
        const size = sizes[match] ?? 0;
        for (let turn = 0; turn < 2; turn++) {
          await expect(page.locator('.card')).toHaveCount(0);
          await page.getByRole('button', { name: 'Start turn', exact: true }).click();
          await expect(page.locator('.card.closed')).toHaveCount(size * size);
          const active = await tournamentState(page);
          expect(active.game?.boardCode).toBe(code);
          expect(active.game?.moves).toBe(0);
          expect(active.game?.elapsedMs).toBe(0);
          await expect(page.locator('[aria-live]')).toHaveCount(1);
          await finishTournamentTurn(page, code, count === 4 && match === 0 && turn === 0);
          await expect(page.getByRole('heading', { level: 2 })).toBeFocused();
          if (turn === 0)
            await page.getByRole('button', { name: 'Next turn', exact: true }).click();
        }
        if (match < count - 2)
          await page.getByRole('button', { name: 'Next match', exact: true }).click();
      }
      const champion = count === 4 ? 'Bo' : 'Ada';
      await expect(page.locator('.victory')).toHaveText(`Champion: ${champion}`);
      const completed = await tournamentState(page);
      expect(completed.phase).toBe('complete');
      expect(completed.matches.every((match) => match.results.length === 2)).toBe(true);
      expect(
        await page.getByRole('cell', { name: `${champion} (winner)`, exact: true }).count(),
      ).toBeGreaterThan(0);
      expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(
        preferences,
      );
      const stored = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
        TOURNAMENTS_KEY,
      );
      expect(Object.keys(stored).sort()).toEqual(['items', 'v']);
      expect(stored.v).toBe(3);
      expect(stored.items).toHaveLength(1);
      await page.screenshot({ path: artifacts.outputPath('champion.png'), fullPage: true });
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
      await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
      await page.reload();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      const past = page.getByRole('button', {
        name: `${count} players · Champion: ${champion}`,
        exact: true,
      });
      await expect(past).toBeVisible();
      await past.click();
      expect(await tournamentState(page)).toEqual(completed);
      expect(completed.names).toEqual(ENTRANTS.slice(0, count));
    },
    {},
    Scrollbars.hidden,
    TestTimeouts.long,
  );
