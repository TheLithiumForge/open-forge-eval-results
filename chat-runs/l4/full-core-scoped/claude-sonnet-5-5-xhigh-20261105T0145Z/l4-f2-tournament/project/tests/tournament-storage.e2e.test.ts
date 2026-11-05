import { expect, test, TestTimeouts } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { toRecord } from '../src/game/tournament/format.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { BLOCKED_NOTICE, TOURNAMENTS_KEY } from '../src/game/tournament/storage.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import {
  button,
  finishedTournament,
  FOUR,
  openTournament,
  playFourPlayers,
  seedStorage,
  startTournament,
} from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

const SAVED_PREFERENCES = JSON.stringify({
  schemaVersion: 1,
  size: 10,
  bestMoves: { '4': 12, '6': 30, '8': 60 },
});

function stored(page: Page, key: string): Promise<string | null> {
  return page.evaluate((name) => window.localStorage.getItem(name), key);
}

test(
  'a finished tournament stays in Past tournaments, only the newest ten are kept and the saved size and bests do not change',
  async ({ page, gameURL }) => {
    const old = Array.from({ length: 10 }, (_, index) =>
      finishedTournament(`Old ${index + 1}`, index + 1),
    );
    await seedStorage(page, PREFERENCES_KEY, SAVED_PREFERENCES);
    await seedStorage(page, TOURNAMENTS_KEY, JSON.stringify({ items: old.map(toRecord), v: 3 }));
    await openTournament(page, gameURL);
    await expect(page.locator('.past li')).toHaveCount(10);
    await expect(page.locator('.past li').first()).toContainText('Champion: Old 1');
    await startTournament(page, FOUR);
    await playFourPlayers(page);
    await expect(page.getByText('Champion: Cora', { exact: true })).toBeVisible();
    await button(page, TournamentControl.back).click();
    await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('10');
    await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
    expect(await stored(page, PREFERENCES_KEY)).toBe(SAVED_PREFERENCES);

    const saved = JSON.parse((await stored(page, TOURNAMENTS_KEY)) ?? 'null');
    expect(Object.keys(saved).sort()).toEqual(['items', 'v']);
    expect(saved.v).toBe(3);
    expect(saved.items).toHaveLength(10);
    expect(saved.items[0].players).toEqual(['Ada', 'Bo', 'Cora', 'Dev']);
    expect(saved.items[9].players[0]).toBe('Old 9');

    await page.reload();
    await button(page, DealControl.tournament).click();
    const items = page.locator('.past li');
    await expect(items).toHaveCount(10);
    await expect(items.first()).toContainText('Champion: Cora');
    await expect(items.first()).toContainText('4 players');
    await expect(items.last()).toContainText('Champion: Old 9');
    await expect(page.getByText(BLOCKED_NOTICE)).toHaveCount(0);
    expect(await stored(page, PREFERENCES_KEY)).toBe(SAVED_PREFERENCES);
  },
  {},
  undefined,
  TestTimeouts.long,
);

test(
  'blocked browser storage keeps the tournament in memory and says progress will not be saved',
  async ({ page, gameURL }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('denied', 'SecurityError');
        },
      });
    });
    await openTournament(page, gameURL);
    await expect(page.getByText(BLOCKED_NOTICE, { exact: true })).toBeVisible();
    await startTournament(page, FOUR);
    await playFourPlayers(page);
    await expect(page.getByText('Champion: Cora', { exact: true })).toBeVisible();
    await button(page, TournamentControl.back).click();
    await button(page, DealControl.tournament).click();
    await expect(page.locator('.past li')).toHaveCount(1);
    await expect(page.locator('.past li')).toContainText('Champion: Cora');
    await expect(page.getByText(BLOCKED_NOTICE, { exact: true })).toBeVisible();
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('unreadable saved tournaments read as empty and wait for the next save', async ({
  page,
  gameURL,
}) => {
  await seedStorage(page, TOURNAMENTS_KEY, '{"items":[{"players":[]}],"v":3}');
  await openTournament(page, gameURL);
  await expect(page.getByText('No past tournaments yet.')).toBeVisible();
  await expect(page.getByText(BLOCKED_NOTICE)).toHaveCount(0);
  expect(await stored(page, TOURNAMENTS_KEY)).toBe('{"items":[{"players":[]}],"v":3}');
});
