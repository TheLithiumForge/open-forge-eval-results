import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { completedTournament } from '../src/game/tournament/tournament.fixture.ts';
import {
  exportedTournament,
  loadTournamentDraft,
  startNamedTournament,
  tournamentDeal,
} from './tournament-helpers.ts';

test('tournament imports pause exact game progress and leaving resumes the solo game', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Player 1', { exact: true }).fill('Remembered');
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  await expect(page.getByLabel('Player 8', { exact: true })).toBeVisible();
  await page.getByLabel('Players', { exact: true }).selectOption('4');
  await expect(page.getByLabel('Player 1', { exact: true })).toHaveValue('Remembered');
  await startNamedTournament(page, 4);
  const ready = await exportedTournament(page);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(1234);
  const inProgress = await exportedTournament(page);
  await page.getByLabel('Tournament JSON', { exact: true }).fill('{');
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('status').last()).toHaveText('Invalid tournament JSON.');
  await page.clock.runFor(766);
  const continuing = (await exportedTournament(page)).tournament?.snapshot;
  expect(continuing && JSON.parse(continuing)).toMatchObject({ elapsedMs: 2000 });
  await loadTournamentDraft(page, inProgress);
  await expect(page.locator('.card')).toHaveCount(0);
  await page.clock.runFor(5000);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  const resumed = (await exportedTournament(page)).tournament?.snapshot;
  expect(resumed && JSON.parse(resumed)).toMatchObject({ elapsedMs: 1234 });
  await loadTournamentDraft(page, ready);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  const code = ready.tournament?.matches[0]?.boardCode;
  if (!code) throw new Error('Expected a deal.');
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(tournamentDeal(code).mismatch).click();
  await page.clock.runFor(300);
  const mismatch = await exportedTournament(page);
  await loadTournamentDraft(page, mismatch);
  await page.clock.runFor(10_000);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.clock.runFor(499);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(599);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  expect(await exportedSnapshot(page)).toMatchObject({
    elapsedMs: 800,
    moves: 1,
    selection: { kind: 'closed' },
  });
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.locator('.past-tournaments')).toContainText('No past tournaments yet.');
});

test('tournament controls fit a phone and completed imports remain exportable when storage is blocked', async ({
  page,
  gameURL,
}, artifacts) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await startNamedTournament(page, 8);
  await page.screenshot({ path: artifacts.outputPath('phone.png'), fullPage: true });
  await expect(page.getByRole('article')).toHaveCount(7);
  const width = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    window: innerWidth,
  }));
  expect(width.page).toBeLessThanOrEqual(width.window);
  await loadTournamentDraft(page, {
    version: 1,
    tournament: completedTournament(8),
    pastTournaments: [],
  });
  await expect(page.getByRole('heading', { name: /^Champion:/ })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Export');
  const exported = await exportedTournament(page);
  expect(exported.pastTournaments).toHaveLength(1);
  expect(exported.tournament?.phase).toBe('complete');
});

test('tournaments use the chosen grid size and a large board scrolls inside a phone', async ({
  page,
  gameURL,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(gameURL);
  await page.getByLabel('Grid size', { exact: true }).selectOption('16');
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.locator('.tournament-setup')).toContainText('16x16 cards');
  await page.getByLabel('Player 1', { exact: true }).fill('   ');
  for (const index of [2, 3, 4])
    await page.getByLabel(`Player ${index}`, { exact: true }).fill(`Name ${index}`);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter a name for every player.');
  await startNamedTournament(page, 4);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(256);
  const layout = await page.locator('.board-viewport').evaluate((board) => ({
    pageWidth: document.documentElement.scrollWidth,
    screenWidth: innerWidth,
    width: board.clientWidth,
    contentWidth: board.scrollWidth,
  }));
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.screenWidth);
  expect(layout.contentWidth).toBeGreaterThan(layout.width);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('16');
});
