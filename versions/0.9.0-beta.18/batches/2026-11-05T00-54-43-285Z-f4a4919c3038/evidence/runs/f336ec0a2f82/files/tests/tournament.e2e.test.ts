import { expect, test, TestTimeouts, Scrollbars } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';
import {
  exportedTournament,
  startNamedTournament,
  tournamentDeal,
  loadTournamentDraft,
} from './tournament-helpers.ts';

for (const count of [4, 8]) {
  test(
    `${count} named players play identical match deals through a saved champion`,
    async ({ page, gameURL }, artifacts) => {
      await loadTimedBoard(page, gameURL);
      await page.getByRole('button', { name: 'New Game', exact: true }).focus();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Tournament', exact: true })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
      expect((await exportedTournament(page)).tournament).toBeNull();
      await page.screenshot({ path: artifacts.outputPath('setup.png'), fullPage: true });
      await startNamedTournament(page, count);
      await page.screenshot({ path: artifacts.outputPath('bracket.png'), fullPage: true });
      await expect(page.getByRole('article')).toHaveCount(count - 1);
      for (let index = 0; index < count - 1; index++) {
        const ready = (await exportedTournament(page)).tournament;
        if (!ready) throw new Error('Expected a bracket.');
        const match = ready.matches[index];
        if (!match) throw new Error('Expected a match.');
        const deal = tournamentDeal(match.boardCode);
        for (const slot of [0, 1]) {
          const player = match.players[slot];
          if (player == null) throw new Error('Expected a player.');
          await expect(
            page.getByRole('heading', {
              name: `Now playing: ${ready.players[player]}`,
              exact: true,
            }),
          ).toBeVisible();
          await expect(page.locator('.card')).toHaveCount(0);
          await page.clock.runFor(5000);
          await page.getByRole('button', { name: 'Start turn', exact: true }).click();
          await expect(page.locator('.card.closed')).toHaveCount(16);
          if (slot === 0) {
            await page.locator('.card').nth(0).click();
            await page.locator('.card').nth(deal.mismatch).click();
            await page.clock.runFor(800);
          }
          for (const [pairIndex, pair] of deal.pairs.entries()) {
            for (const [cardIndex, card] of pair.entries()) {
              await page.locator('.card').nth(card).click({ force: true });
              if (pairIndex === 0 && cardIndex === 0)
                await page.clock.runFor(slot === 0 ? 1200 : 4000);
            }
          }
          const scored = (await exportedTournament(page)).tournament;
          expect(scored?.matches[index]?.results[slot]).toEqual({
            moves: slot === 0 ? 9 : 8,
            elapsedMs: slot === 0 ? 2000 : 4000,
          });
          const bracketMatch = page.getByRole('article', {
            name: `Match ${index + 1}`,
            exact: true,
          });
          await expect(bracketMatch).toContainText(
            slot === 0 ? '9 moves · 0:02' : '8 moves · 0:04',
          );
          if (slot === 0) {
            await expect(page.getByRole('button', { name: 'Next match', exact: true })).toHaveCount(
              0,
            );
            await page.getByRole('button', { name: 'Next turn', exact: true }).click();
          } else {
            await expect(bracketMatch).toContainText(
              `Winner: ${ready.players[match.players[1] ?? -1]}`,
            );
            if (index < count - 2)
              await page.getByRole('button', { name: 'Next match', exact: true }).click();
          }
        }
      }
      await expect(
        page.getByRole('heading', { name: `Champion: Name ${count}`, exact: true }),
      ).toBeVisible();
      await page.screenshot({ path: artifacts.outputPath('champion.png'), fullPage: true });
      await expect(page.getByRole('button', { name: 'Leave tournament', exact: true })).toHaveCount(
        0,
      );
      const finished = await exportedTournament(page);
      expect(finished.pastTournaments).toHaveLength(1);
      await loadTournamentDraft(page, finished);
      await page.getByRole('button', { name: 'New tournament', exact: true }).click();
      await expect(page.locator('.past-tournaments li')).toHaveCount(1);
      await page.reload();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await expect(page.locator('.past-tournaments li')).toHaveCount(1);
      await expect(page.locator('.past-tournaments')).toContainText(`Champion: Name ${count}`);
      await page.getByRole('button', { name: 'View tournament', exact: true }).click();
      expect((await exportedTournament(page)).tournament).toEqual(finished.tournament);
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
    },
    {},
    Scrollbars.hidden,
    // Eight entrants play fourteen complete games, including every handoff and a history reload.
    count === 8 ? TestTimeouts.long * 2 : TestTimeouts.long,
  );
}
