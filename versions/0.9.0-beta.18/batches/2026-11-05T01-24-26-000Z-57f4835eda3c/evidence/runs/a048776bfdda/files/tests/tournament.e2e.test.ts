import { expect, test, TestTimeouts } from './browser-test.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { GAME_URL } from './game-fixture.ts';
import {
  boardCodes,
  EIGHT,
  enterPlayers,
  FOUR,
  openTournament,
  playTurn,
} from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

const CLOCK_START = new Date('2026-01-01T00:00:00Z');
const SAVED = JSON.stringify({ schemaVersion: 1, size: 10, bestMoves: { '4': 12 } });

async function bracketCells(page: Page): Promise<string[][]> {
  const bodies = page.getByRole('table', { name: 'Bracket' }).locator('tbody');
  return Promise.all((await bodies.all()).map((body) => body.locator('td').allTextContents()));
}

async function next(page: Page, label: string, player: string): Promise<void> {
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(`Now playing: ${player}`);
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
}

test(
  'four players play a knockout to a champion while solo size and bests stay saved',
  async ({ page, gameURL }) => {
    await page.clock.install({ time: CLOCK_START });
    await page.goto(gameURL);
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: PREFERENCES_KEY,
      value: SAVED,
    });
    await page.reload();
    await page.clock.pauseAt(new Date(CLOCK_START.getTime() + 60_000));
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
    await openTournament(page);
    await enterPlayers(page, FOUR);
    const status = page.getByRole('status');
    await expect(status).toHaveText('Now playing: Ada');
    await expect(page.getByText('Round: Semifinal', { exact: true })).toBeVisible();
    await expect(page.getByText('Semifinal 1: Ada against Dev', { exact: true })).toBeVisible();
    const [semifinal1 = '', semifinal2 = '', final = ''] = await boardCodes(page);
    // Ada misses once, so Dev wins on moves.
    await playTurn(page, semifinal1, 1);
    await expect(status).toHaveText('Pair found. All pairs found in 19 moves and 0:00.');
    await expect(
      page.getByText('Every pair found in 19 moves and 0:00. Well played.'),
    ).toBeVisible();
    await next(page, 'Next turn', 'Dev');
    await playTurn(page, semifinal1);
    await next(page, 'Next match', 'Bo');
    // Bo and Cora are equal on moves and time, so seed 2 beats seed 3.
    await playTurn(page, semifinal2);
    await next(page, 'Next turn', 'Cora');
    await playTurn(page, semifinal2);
    await next(page, 'Next match', 'Dev');
    await expect(page.getByText('Round: Final', { exact: true })).toBeVisible();
    await playTurn(page, final);
    await expect(page.locator('.stats')).toContainText('Moves: 32');
    await expect(page.locator('.stats')).not.toContainText('Best:');
    await next(page, 'Next turn', 'Bo');
    await playTurn(page, final, 1);
    await expect(page.getByRole('heading', { name: 'Champion: Dev', exact: true })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Leave tournament' })).toHaveCount(0);
    expect(await bracketCells(page)).toEqual([
      ['Semifinal 1', 'Ada', '19 moves', '0:00', 'Dev', 'Dev', '18 moves', '0:00'],
      ['Semifinal 2', 'Bo', '18 moves', '0:00', 'Bo', 'Cora', '18 moves', '0:00'],
      ['Final', 'Dev', '32 moves', '0:00', 'Dev', 'Bo', '33 moves', '0:00'],
    ]);
    const past = page.getByRole('table', { name: 'Past tournaments' });
    await expect(past.locator('tbody tr')).toHaveText(['DevAda, Bo, Cora, Dev']);
    await page.getByRole('button', { name: 'Back to game', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Solo game', exact: true })).toBeFocused();
    await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('10');
    const stored = await page.evaluate(
      (key) => [localStorage.getItem(key), localStorage.getItem('np3:tournaments')],
      PREFERENCES_KEY,
    );
    expect(stored[0], 'tournament games keep the solo size and bests').toBe(SAVED);
    const records: unknown = JSON.parse(stored[1] ?? 'null');
    expect(isJsonObject(records) && Object.keys(records)).toEqual(['v', 'items']);
    expect(isJsonObject(records) && records.v).toBe(3);
    await page.reload();
    await openTournament(page);
    await expect(past.locator('tbody tr')).toHaveText(['DevAda, Bo, Cora, Dev']);
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('eight players open in seed order on distinct deals for every match', async ({ page }) => {
  await page.goto(GAME_URL);
  await openTournament(page);
  await enterPlayers(page, EIGHT);
  await expect(page.getByText('Round: Quarterfinal', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Now playing: Ada');
  const bodies = await page.getByRole('table', { name: 'Bracket' }).locator('tbody').all();
  const players = await Promise.all(
    bodies.map((body) =>
      Promise.all([
        body.locator('tr').nth(0).locator('td').nth(1).textContent(),
        body.locator('tr').nth(1).locator('td').nth(0).textContent(),
      ]),
    ),
  );
  expect(players).toEqual([
    ['Ada', 'Hal'],
    ['Dev', 'Emi'],
    ['Cora', 'Finn'],
    ['Bo', 'Gia'],
    ['To be decided', 'To be decided'],
    ['To be decided', 'To be decided'],
    ['To be decided', 'To be decided'],
  ]);
  const codes = await boardCodes(page);
  expect(codes.map((code) => code.split('-')[1])).toEqual(['4', '4', '4', '4', '6', '6', '8']);
  expect(new Set(codes).size).toBe(7);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await expect(page.locator('.card')).toHaveCount(16);
  await page.keyboard.press('Tab');
  await expect(page.locator('.card').first()).toBeFocused();
});
