import { expect, test, TestTimeouts } from './browser-test.ts';
import { loadTimedBoard, exportedSnapshot, PHONE } from './game-fixture.ts';
import {
  openTournament,
  exportedTournament,
  completeTournamentBoard,
} from './tournament-helpers.ts';

for (const count of [4, 8])
  test(
    `${count} players share each match deal, advance winners and keep the champion after reload`,
    async ({ page, gameURL }) => {
      await loadTimedBoard(page, gameURL);
      await openTournament(page, count);
      await expect(page.getByRole('button', { name: 'Start turn', exact: true })).toBeFocused();
      await expect(page.locator('.card')).toHaveCount(0);
      await expect(page.locator('.bracket-match')).toHaveCount(count - 1);
      expect((await exportedTournament(page)).active?.phase).toBe('ready');
      for (let index = 0; index < count - 1; index++) {
        await page.getByRole('button', { name: 'Start turn', exact: true }).click();
        await expect(page.locator('.card').first()).toBeFocused();
        const first = await exportedTournament(page);
        await page.clock.runFor(1000);
        expect((await exportedTournament(page)).active?.game?.elapsedMs).toBe(1000);
        await completeTournamentBoard(page, 1);
        await expect(page.getByRole('button', { name: 'Next turn', exact: true })).toBeFocused();
        await page.clock.runFor(5000);
        await page.getByRole('button', { name: 'Next turn', exact: true }).click();
        await expect(page.locator('.card')).toHaveCount(0);
        await page.getByRole('button', { name: 'Start turn', exact: true }).click();
        const second = await exportedTournament(page);
        expect(second.active?.game).toMatchObject({
          boardCode: first.active?.game?.boardCode,
          deck: first.active?.game?.deck,
          moves: 0,
          elapsedMs: 0,
          matched: [],
        });
        await completeTournamentBoard(page);
        const match = page.getByRole('article', { name: `Match ${index + 1}`, exact: true });
        await expect(match.getByRole('row').nth(1)).toContainText('9');
        await expect(match.getByRole('row').nth(2)).toContainText('8');
        if (index < count - 2) {
          await expect(page.getByRole('button', { name: 'Next match', exact: true })).toBeFocused();
          await page.getByRole('button', { name: 'Next match', exact: true }).click();
        }
      }
      await expect(page.locator('.tournament-champion')).toHaveText(`Champion: Name ${count}`);
      await expect(page.getByRole('button', { name: 'Back to game', exact: true })).toBeFocused();
      const finished = await exportedTournament(page);
      expect(finished.past).toHaveLength(1);
      expect(finished.active?.phase).toBe('complete');
      await page.getByRole('button', { name: 'Back to game', exact: true }).click();
      expect(await exportedSnapshot(page)).toMatchObject({
        moves: 0,
        elapsedMs: 0,
        started: false,
      });
      await page.reload();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
      await expect(page.locator('.past-tournaments li')).toContainText(`Champion: Name ${count}`);
      const archive = await exportedTournament(page);
      expect(archive.past).toEqual(finished.past);
      await page.getByRole('button', { name: 'View tournament', exact: true }).click();
      await expect(page.locator('.tournament-champion')).toHaveText(`Champion: Name ${count}`);
      await expect(page.locator('.bracket-match')).toHaveCount(count - 1);
      await expect(
        page.getByRole('button', { name: 'Load tournament', exact: true }),
      ).toBeVisible();
    },
    {},
    undefined,
    TestTimeouts.long,
  );

test('leaving a tournament restores the solo game and its paused clock without archiving an unfinished run', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(1000);
  const solo = await exportedSnapshot(page);
  await openTournament(page);
  await page.clock.runFor(5000);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(2000);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tournament', exact: true })).toBeFocused();
  expect(await exportedSnapshot(page)).toEqual(solo);
  await page.clock.runFor(1000);
  expect((await exportedSnapshot(page)).elapsedMs).toBe(2000);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.locator('.past-tournaments')).toContainText('No finished tournaments yet.');
});

test('setup and bracket stay within a phone viewport with all eight labelled name fields', async ({
  page,
  gameURL,
}) => {
  await page.setViewportSize(PHONE);
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  for (let index = 1; index <= 8; index++)
    await expect(page.getByLabel(`Player ${index}`, { exact: true })).toBeVisible();
  await page.getByLabel('Player 8', { exact: true }).fill('Remembered name');
  await page.getByLabel('Players', { exact: true }).selectOption('4');
  await expect(page.getByLabel('Player 8', { exact: true })).toHaveCount(0);
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  await expect(page.getByLabel('Player 8', { exact: true })).toHaveValue('Remembered name');
  for (let index = 1; index <= 8; index++)
    await page.getByLabel(`Player ${index}`, { exact: true }).fill('Long player name '.repeat(4));
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    PHONE.width,
  );
  await expect(page.getByRole('button', { name: 'Export tournament', exact: true })).toBeVisible();
});
