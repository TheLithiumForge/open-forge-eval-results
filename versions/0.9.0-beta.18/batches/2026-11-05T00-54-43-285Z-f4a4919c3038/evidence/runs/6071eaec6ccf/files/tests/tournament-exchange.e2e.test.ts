import { expect, test } from './browser-test.ts';
import { ENTRANTS, enterTournament, tournamentState } from './tournament-fixture.ts';
import { GAME_URL, loadTimedBoard } from './game-fixture.ts';
import { finishedTournament } from '../src/game/tournament/tournament.fixture.ts';
import { encodeTournament } from '../src/game/tournament/format.ts';

test('names validate on start, normalize accepted text and controls fit a phone', async ({
  page,
}, artifacts) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(GAME_URL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  await expect(page.locator('.tournament-names input')).toHaveCount(8);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Use 2 to 20 characters.');
  for (const [index, name] of ENTRANTS.entries())
    await page
      .getByLabel(`Player ${index + 1}`, { exact: true })
      .fill(index === 7 ? ' ADA ' : name);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Each name must be different.');
  await page.getByLabel('Player 8', { exact: true }).fill('  Hal   Smith  ');
  for (const control of await page
    .locator(
      '.tournament button:visible, .tournament input:visible, .tournament select:visible, .tournament textarea:visible',
    )
    .all()) {
    const box = await control.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: artifacts.outputPath('setup-phone.png'), fullPage: true });
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  expect((await tournamentState(page)).names[7]).toBe('Hal Smith');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: artifacts.outputPath('bracket-phone.png'), fullPage: true });
});

test('JSON preserves an active turn, rejects unknown nested fields and confirms replacement or leaving', async ({
  page,
  gameURL,
}) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto(gameURL);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await enterTournament(page);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(123);
  const before = await tournamentState(page);
  const text = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
  await page
    .getByLabel('Tournament JSON', { exact: true })
    .fill(JSON.stringify({ ...JSON.parse(text), extra: 1 }));
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Unknown field: extra.');
  await expect(page.getByLabel('Tournament JSON', { exact: true })).toHaveValue(
    JSON.stringify({ ...JSON.parse(text), extra: 1 }),
  );
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByLabel('Tournament JSON', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Load tournament', exact: true })).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(0);
  await page.clock.runFor(5000);
  expect((await tournamentState(page)).game?.elapsedMs).toBe(before.game?.elapsedMs);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Leave tournament', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
  await page.clock.runFor(1000);
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

test('blocked storage keeps imported finished tournaments in memory through navigation', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  const text = encodeTournament(finishedTournament());
  await page.getByLabel('Tournament JSON', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.locator('.victory')).toHaveText('Champion: Ada');
  await page.getByRole('button', { name: 'Back to game', exact: true }).click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '4 players · Champion: Ada', exact: true }),
  ).toBeVisible();
});

test('opening Tournament from unfinished solo play confirms before replacing the board', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Tournament', exact: true })).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await page.clock.runFor(1000);
  await expect(page.locator('.card')).toHaveCount(0);
  await expect(page.getByLabel('Players', { exact: true })).toHaveValue('4');
});
