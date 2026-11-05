import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { completedTournament } from '../src/game/tournament/tournament.fixture.ts';
import { encodeTournament } from '../src/game/tournament/format.ts';

test('leaving a tournament restores the paused solo mismatch without advancing it during the event', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  const before = await exportedSnapshot(page);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Tournament', exact: true })).toBeFocused();
  expect(await exportedSnapshot(page)).toEqual(before);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await page.clock.runFor(10_000);
  for (const [index, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').first().click();
  await page.clock.runFor(1300);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  expect(await exportedSnapshot(page)).toEqual(before);
  await page.clock.runFor(599);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

test('completed imports remain available in memory when saving is refused', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'np3:tournaments') throw new DOMException('Full', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  const tournament = completedTournament();
  const setup = { count: 4, names: ['Ada', 'Bo', 'Cora', 'Dev', '', '', '', ''] } as const;
  await page
    .getByLabel('Tournament JSON', { exact: true })
    .fill(encodeTournament(setup, tournament, null));
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByText('Champion: Ada', { exact: true })).toBeVisible();
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'View tournament 1, champion Ada', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('np3:tournaments'))).toBe(null);
});
