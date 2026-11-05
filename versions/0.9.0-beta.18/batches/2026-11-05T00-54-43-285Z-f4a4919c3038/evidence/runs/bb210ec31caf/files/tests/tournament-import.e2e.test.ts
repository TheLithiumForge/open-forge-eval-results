import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { enterTournament, tournamentExport } from './tournament-support.ts';
import { isJsonObject, parseJson } from '../src/game/saved-format.ts';

test('a live import preserves the deal and progress, waits for Start turn and confirms replacements', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await enterTournament(page);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').first().click();
  await page.clock.runFor(1250);
  const original = await tournamentExport(page);
  const draft = page.getByLabel('Tournament JSON', { exact: true });
  const malformed = parseJson(original.text);
  if (!isJsonObject(malformed)) throw new Error('Expected a tournament export.');
  malformed.extra = true;
  await draft.fill(JSON.stringify(malformed));
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Unknown field: extra.');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await draft.fill(original.text);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Load tournament', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await expect(page.locator('.card')).toHaveCount(0);
  await page.clock.runFor(10_000);
  const restored = await tournamentExport(page);
  expect(restored.game).toEqual(original.game);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.clock.runFor(250);
  expect((await tournamentExport(page)).game.elapsedMs).toBe(original.game.elapsedMs + 250);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
});

test('blocked storage shows its notice while tournaments remain playable and exportable', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage denied');
      },
    }),
  );
  await loadTimedBoard(page, gameURL);
  await enterTournament(page, 8);
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').first().click();
  const exported = await tournamentExport(page);
  expect(exported.game.started).toBe(true);
  await expect(page.locator('[aria-live]')).toHaveCount(1);
});

test('returning from Tournament continues the ordinary game without charging handoff time', async ({
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
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await page.clock.runFor(10_000);
  await page.getByRole('button', { name: 'Back to game', exact: true }).click();
  expect(await exportedSnapshot(page)).toEqual(before);
  await page.clock.runFor(599);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});
