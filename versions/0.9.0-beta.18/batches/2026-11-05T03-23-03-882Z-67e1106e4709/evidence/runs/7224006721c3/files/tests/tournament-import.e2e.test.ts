import { expect, test } from './browser-test.ts';
import {
  setupTournament,
  tournamentExport,
  completedTournamentJson,
} from './tournament-fixture.ts';
import { specDeal } from './deal-oracle.ts';
import { loadTimedBoard } from './game-fixture.ts';

test('active tournament JSON validates before replacement and resumes its exact pending mismatch behind Start turn', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await setupTournament(page, 4);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  const firstExport = await tournamentExport(page);
  const code = firstExport.document.run?.event.matches[0]?.boardCode;
  if (!code) throw new Error('Expected a deal.');
  const deck = specDeal(6, Number(code.split('-')[2]));
  const other = deck.findIndex((face) => face !== deck[0]);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(other).click();
  await page.clock.runFor(200);
  const active = await tournamentExport(page);
  const draft = page.getByLabel('Tournament JSON', { exact: true });
  await draft.fill(active.text.replace('"elapsedMs": 200', '"surprise": true, "elapsedMs": 200'));
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Unknown field: surprise.');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect((await tournamentExport(page)).document.run?.game).toEqual(active.document.run?.game);
  await draft.fill(active.text);
  const load = page.getByRole('button', { name: 'Load tournament', exact: true });
  await load.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(load).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await load.click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await expect(page.locator('.card')).toHaveCount(0);
  await page.clock.runFor(5000);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(599);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  const resumed = await tournamentExport(page);
  expect(resumed.document.run?.game?.elapsedMs).toBe(800);
  expect(resumed.document.run?.game?.moves).toBe(1);
});

test('leaving unfinished play confirms with native focus and cancels earlier tournament timers', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('.card').nth(0).click();
  const open = page.getByRole('button', { name: 'Tournament', exact: true });
  await open.click();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await open.click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption('4');
  for (const [index, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  const { document } = await tournamentExport(page);
  const code = document.run?.event.matches[0]?.boardCode;
  if (!code) throw new Error('Expected a deal.');
  const deck = specDeal(6, Number(code.split('-')[2]));
  await page.locator('.card').nth(0).click();
  await page
    .locator('.card')
    .nth(deck.findIndex((face) => face !== deck[0]))
    .click();
  const leave = page.getByRole('button', { name: 'Leave tournament', exact: true });
  await leave.click();
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await expect(leave).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await leave.click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(1000);
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.locator('.stats dd').first()).toHaveText('0');
  expect(await page.evaluate(() => localStorage.getItem('np3:tournaments'))).toBeNull();
});

test('completed imports survive reload and denied storage leaves tournament exchange usable', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Tournament JSON', { exact: true }).fill(completedTournamentJson());
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByText('Champion: Ada', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.locator('.past-tournaments li')).toHaveCount(1);
  await page.evaluate(() => {
    Object.defineProperty(Storage.prototype, 'setItem', {
      value: () => {
        throw new Error('denied');
      },
    });
  });
  await page.getByLabel('Tournament JSON', { exact: true }).fill(completedTournamentJson());
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByText('Champion: Ada', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New tournament', exact: true }).click();
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.past-tournaments li')).toHaveCount(1);
});

test('a denied storage getter shows the saved-record warning without blocking tournament play', async ({
  page,
  context,
  gameURL,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('denied');
      },
    });
  });
  await page.goto(gameURL);
  await setupTournament(page, 4);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').first().click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
});
