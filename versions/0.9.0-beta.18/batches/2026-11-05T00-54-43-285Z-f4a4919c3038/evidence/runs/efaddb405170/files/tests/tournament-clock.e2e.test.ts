import assert from 'node:assert/strict';
import { expect, test } from './browser-test.ts';
import { enterTournament, tournamentExport } from './tournament-fixture.ts';
import { specDeal } from './deal-oracle.ts';
import { loadTimedBoard } from './game-fixture.ts';

test('tournament exports synchronize active time and restored turns exclude handoff waiting', async ({
  page,
  gameURL,
}) => {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(60_000);
  await page.goto(gameURL);
  await enterTournament(page, 4);
  await page.clock.runFor(5000);
  assert.equal((await tournamentExport(page)).state.game, null);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.clock.runFor(5000);
  const initial = (await tournamentExport(page)).state.game;
  assert.ok(initial);
  assert.equal(initial.elapsedMs, 0);
  const deck = specDeal(initial.size, initial.seed);
  const other = deck.findIndex((face) => face !== deck[0]);
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(1035);
  await page.locator('.card').nth(other).click();
  await page.clock.runFor(330);
  const exported = await tournamentExport(page);
  assert.equal(exported.state.game?.elapsedMs, 1365);
  assert.deepEqual(exported.state.game?.selection, {
    kind: 'mismatch',
    first: 0,
    second: other,
    remainingMs: 470,
  });
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await page.clock.runFor(5000);
  assert.equal((await tournamentExport(page)).state.game?.elapsedMs, 1365);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.clock.runFor(469);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  assert.equal((await tournamentExport(page)).state.game?.elapsedMs, 1835);
});

test('opening a tournament confirms unfinished solo work and Escape preserves the current deal', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('.card').nth(0).click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await page.clock.runFor(5000);
  await page.getByRole('button', { name: 'Back to game', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(page.locator('.stats dd').first()).toHaveText('0');
  await expect(page.locator('.stats dd').nth(2)).toHaveText('0:00');
});
