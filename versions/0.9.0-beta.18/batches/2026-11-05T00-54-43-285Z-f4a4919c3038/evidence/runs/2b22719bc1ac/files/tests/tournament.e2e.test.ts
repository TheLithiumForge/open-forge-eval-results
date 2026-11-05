import assert from 'node:assert/strict';
import { expect, test, TestTimeouts } from './browser-test.ts';
import { enterTournament, finishTournamentTurn, tournamentExport } from './tournament-fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { TOURNAMENTS_KEY } from '../src/game/tournament/storage.ts';
import { TournamentPhase } from '../src/game/tournament/rules.ts';

for (const count of [4, 8])
  test(
    `finishes a ${count} player tournament and restores its bracket after reload`,
    async ({ page, gameURL }) => {
      await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
      await page.goto(gameURL);
      await page.getByLabel('Grid size', { exact: true }).selectOption('10');
      const before = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
      await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
      await enterTournament(page, count);
      const opening = (await tournamentExport(page)).tournament;
      assert.ok(opening);
      expect(opening.matches.slice(0, count / 2).map((match) => match.players)).toEqual(
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
      expect(new Set(opening.matches.map((match) => match.boardCode)).size).toBe(count - 1);
      for (let matchIndex = 0; matchIndex < count - 1; matchIndex += 1) {
        const state = (await tournamentExport(page)).tournament;
        assert.ok(state);
        const match = state.matches[matchIndex];
        assert.ok(match);
        for (let turn = 0; turn < 2; turn += 1) {
          const player = match.players[turn];
          assert.ok(player !== undefined);
          await expect(page.locator('.now-playing')).toHaveText(
            `Now playing: ${state.players[player]}`,
          );
          await finishTournamentTurn(page, match.boardCode, matchIndex === 0 && turn === 0);
          if (turn === 0) {
            await expect(
              page.getByRole('button', { name: 'Next turn', exact: true }),
            ).toBeVisible();
            await page.getByRole('button', { name: 'Next turn', exact: true }).click();
          }
        }
        if (matchIndex < count - 2)
          await page.getByRole('button', { name: 'Next match', exact: true }).click();
      }
      await expect(page.locator('.champion')).toHaveText('Champion: Name 1');
      const final = (await tournamentExport(page)).tournament;
      assert.ok(final);
      expect(final.phase).toBe(TournamentPhase.complete);
      expect(
        final.matches.every((match) => match.results.length === 2 && match.winner !== null),
      ).toBe(true);
      await expect(page.locator('table caption')).toHaveText('Tournament bracket');
      expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(before);
      const envelope = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
        TOURNAMENTS_KEY,
      );
      expect(Object.keys(envelope).sort()).toEqual(['items', 'v']);
      expect(envelope.v).toBe(3);
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
      await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
      await page.reload();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await page.locator('.past-tournaments button').click();
      expect((await tournamentExport(page)).tournament).toEqual(final);
      await expect(page.getByRole('status')).toHaveCount(1);
    },
    { viewport: { width: 390, height: 844 } },
    undefined,
    TestTimeouts.long,
  );
