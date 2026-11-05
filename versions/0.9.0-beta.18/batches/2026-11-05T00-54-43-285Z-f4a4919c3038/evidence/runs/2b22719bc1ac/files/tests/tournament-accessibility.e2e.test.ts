import { writeFile } from 'node:fs/promises';
import { expect, test, TestTimeouts } from './browser-test.ts';
import { enterTournament, finishTournamentTurn, tournamentExport } from './tournament-fixture.ts';

test(
  'tournament screens expose one live region, table headers and phone control targets',
  async ({ page, gameURL }, artifacts) => {
    await page.goto(gameURL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    const setup = await page.locator('main').ariaSnapshot();
    for (const control of await page
      .locator('.tournament button, .tournament select, .tournament input, .tournament textarea')
      .all()) {
      const bounds = await control.boundingBox();
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByLabel('Players', { exact: true }).selectOption('8');
    await expect(page.getByLabel('Player 8', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back to game', exact: true }).click();
    await enterTournament(page, 8);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Tournament', exact: true }),
    ).toBeFocused();
    await expect(page.getByRole('status')).toHaveText('Now playing: Name 1');
    await expect(page.locator('[aria-live]')).toHaveCount(1);
    await expect(page.locator('th[scope="col"]')).toHaveCount(6);
    const waiting = await page.locator('main').ariaSnapshot();
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await page.locator('.card').first().click();
    await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
    const dialog = await page.locator('dialog').ariaSnapshot();
    await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Leave tournament', exact: true })).toBeFocused();
    await expect(page.locator('.card.revealed')).toHaveCount(1);
    const data = await tournamentExport(page);
    expect(data.tournament?.matches[0]?.players).toEqual([0, 7]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await writeFile(
      artifacts.outputPath('tournament-accessibility.json'),
      JSON.stringify({ setup, waiting, dialog, screenReader: null }, null, 2),
    );
    await page.screenshot({ path: artifacts.outputPath('tournament-phone.png'), fullPage: true });
  },
  { viewport: { width: 390, height: 844 } },
);

test(
  'blocked tournament storage keeps play available and explains missing persistence',
  async ({ page, gameURL }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('blocked');
        },
      });
    });
    await page.goto(gameURL);
    await enterTournament(page, 4);
    await expect(
      page.getByText("Progress won't be saved on this device.", { exact: true }),
    ).toBeVisible();
    for (let match = 0; match < 3; match += 1) {
      const state = (await tournamentExport(page)).tournament;
      const code = state?.matches[match]?.boardCode;
      if (!code) throw new Error('Expected a match deal.');
      await finishTournamentTurn(page, code);
      await page.getByRole('button', { name: 'Next turn', exact: true }).click();
      await finishTournamentTurn(page, code);
      if (match < 2) await page.getByRole('button', { name: 'Next match', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Back to game', exact: true }).click();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.locator('.past-tournaments button')).toHaveCount(1);
    await expect(
      page.getByText("Progress won't be saved on this device.", { exact: true }),
    ).toBeVisible();
  },
  {},
  undefined,
  TestTimeouts.long,
);
