import assert from 'node:assert/strict';
import { test, expect, TestTimeouts } from './browser-test.ts';
import {
  enterTournament,
  finishTournamentBoard,
  tournamentDeal,
  tournamentExport,
  expectTournamentLayout,
} from './tournament-helpers.ts';
import { isJsonObject } from '../src/game/saved-format.ts';

for (const count of [4, 8])
  test(
    `${count} players complete a tournament and revisit its bracket after reload`,
    async ({ page, gameURL }, artifacts) => {
      await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
      await page.goto(gameURL);
      await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
      await page.getByLabel('Grid size', { exact: true }).selectOption('10');
      const preferences = await page.evaluate(() =>
        localStorage.getItem('neon-pairs.preferences.v1'),
      );
      await enterTournament(page, count);
      await expectTournamentLayout(page);
      await expect(
        page.locator('.tournament-turn').getByText('Now playing: Ada', { exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('status')).toHaveCount(1);
      await expect(page.locator('.card')).toHaveCount(0);
      const codes = new Set<string>();
      for (let match = 0; match < count - 1; match += 1) {
        await page.getByRole('button', { name: 'Start turn', exact: true }).click();
        const { code, deck } = await tournamentDeal(page);
        assert.ok(!codes.has(code));
        codes.add(code);
        await expect(page.locator('.card')).toHaveCount(deck.length);
        await expectTournamentLayout(page);
        await finishTournamentBoard(page, deck);
        await page.getByRole('button', { name: 'Next turn', exact: true }).click();
        await expect(page.locator('.card')).toHaveCount(0);
        await page.getByRole('button', { name: 'Start turn', exact: true }).click();
        assert.equal((await tournamentDeal(page)).code, code);
        await expect(page.locator('.card.matched')).toHaveCount(0);
        await finishTournamentBoard(page, deck);
        if (match < count - 2)
          await page.getByRole('button', { name: 'Next match', exact: true }).click();
      }
      await expect(page.getByRole('heading', { name: 'Champion: Ada', exact: true })).toBeFocused();
      const document = await tournamentExport(page);
      assert.equal(document.format, 'neon-pairs/tournament');
      assert.ok(isJsonObject(document.tournament) && Array.isArray(document.tournament.matches));
      assert.equal(document.tournament.matches.length, count - 1);
      await expect(page.getByRole('table', { name: 'Tournament bracket' })).toBeVisible();
      await expect(page.locator('th[scope="col"]')).toHaveCount(6);
      assert.equal(
        await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1')),
        preferences,
      );
      await page.screenshot({ path: artifacts.outputPath('champion.png'), fullPage: true });
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
      await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
      await page.reload();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Past tournaments', exact: true }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: `${count} players — Champion: Ada`, exact: true })
        .click();
      assert.deepEqual(await tournamentExport(page), document);
    },
    { viewport: { width: 390, height: 844 } },
    undefined,
    TestTimeouts.long,
  );
