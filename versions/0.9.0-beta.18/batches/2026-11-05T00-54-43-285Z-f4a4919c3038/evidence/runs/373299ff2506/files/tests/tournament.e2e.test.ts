import { expect, Scrollbars, test, TestTimeouts } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';
import {
  finishTournamentGame,
  setupTournament,
  tournamentExport,
  TOURNAMENT_NAMES,
} from './tournament-fixture.ts';

for (const players of [4, 8]) {
  test(
    `${players} players share deals, advance winners and keep the completed bracket after reload`,
    async ({ page, gameURL }) => {
      await loadTimedBoard(page, gameURL);
      await setupTournament(page, players);
      await expect(
        page.getByRole('region', { name: 'Bracket', exact: true }).getByRole('article'),
      ).toHaveCount(players - 1);
      const initial = (await tournamentExport(page)).tournament;
      if (!initial) throw new Error('Expected tournament.');
      const matches = players - 1;
      for (let match = 0; match < matches; match++) {
        const code = initial.boardCodes[match];
        if (!code) throw new Error('Expected match deal.');
        for (let slot = 0; slot < 2; slot++) {
          await page.getByRole('button', { name: 'Start turn', exact: true }).click();
          await expect(page.locator('.card').first()).toBeFocused();
          const playing = (await tournamentExport(page)).tournament;
          expect(playing?.game).toMatchObject({
            boardCode: code,
            moves: 0,
            elapsedMs: 0,
            started: false,
          });
          await finishTournamentGame(page, code, slot === 0 ? 1 : 0, slot === 0 ? 1000 : 5000);
          const result = page.getByRole('article', { name: `Match ${match + 1}`, exact: true });
          await expect(
            result
              .getByRole('row')
              .nth(slot + 1)
              .getByRole('cell')
              .first(),
          ).toHaveText(slot === 0 ? '9' : '8');
          await expect(
            result
              .getByRole('row')
              .nth(slot + 1)
              .getByRole('cell')
              .last(),
          ).toHaveText(slot === 0 ? '0:01.800' : '0:05.000');
          if (slot === 0) {
            await expect(page.getByRole('button', { name: 'Next match', exact: true })).toHaveCount(
              0,
            );
            await page.getByRole('button', { name: 'Next turn', exact: true }).click();
            await expect(page.locator('.card')).toHaveCount(0);
          }
        }
        if (match < matches - 1)
          await page.getByRole('button', { name: 'Next match', exact: true }).click();
      }
      const winner = TOURNAMENT_NAMES[players - 1];
      await expect(
        page.getByRole('heading', { name: `Champion: ${winner}`, exact: true }),
      ).toBeVisible();
      const finished = (await tournamentExport(page)).tournament;
      expect(finished?.stage).toBe('complete');
      expect(finished?.results).toHaveLength(matches * 2);
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      await expect(page.locator('.card')).toHaveCount(16);
      await page.reload();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await expect(
        page.getByRole('region', { name: 'Past tournaments', exact: true }).getByRole('button'),
      ).toHaveCount(1);
      const past = page.getByRole('button', { name: new RegExp(`Champion: ${winner}`) });
      await past.click();
      expect((await tournamentExport(page)).tournament).toEqual(finished);
      await expect(
        page.getByRole('heading', { name: `Champion: ${winner}`, exact: true }),
      ).toBeVisible();
      const json = await page.getByLabel('Tournament JSON').inputValue();
      await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
      expect((await tournamentExport(page)).tournament).toEqual(finished);
      await page.getByLabel('Tournament JSON').fill(json);
      await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await expect(
        page.getByRole('region', { name: 'Past tournaments', exact: true }).getByRole('button'),
      ).toHaveCount(1);
    },
    {},
    Scrollbars.hidden,
    TestTimeouts.long,
  );
}
