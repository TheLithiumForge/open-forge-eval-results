import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { button, enterPlayers, FOUR, openTournament } from './tournament-fixture.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';

test('the solo game waits, with its clock stopped, while the tournament screen is shown', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(2000);
  await openTournament(page);
  await expect(page.locator('.card')).toHaveCount(0);
  await enterPlayers(page, FOUR);
  await button(page, TournamentControl.start).click();
  await button(page, TournamentControl.startTurn).click();
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(10_000);
  await expect(page.locator('.stats')).toContainText('0:10');
  await button(page, TournamentControl.leave).click();
  await button(page, TournamentControl.confirmLeave).click();
  await button(page, TournamentControl.back).click();
  await expect(page.getByRole('heading', { name: 'Solo game', exact: true })).toBeFocused();
  const snapshot = await exportedSnapshot(page);
  expect(snapshot.elapsedMs).toBe(2000);
  expect(snapshot.selection).toEqual({ kind: SelectionKind.one, index: 0 });
  await page.clock.runFor(1000);
  expect((await exportedSnapshot(page)).elapsedMs).toBe(3000);
});
