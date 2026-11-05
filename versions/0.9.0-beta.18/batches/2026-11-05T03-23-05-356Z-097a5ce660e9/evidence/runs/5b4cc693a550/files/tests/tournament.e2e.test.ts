import { expect, test, TestTimeouts } from './browser-test.ts';
import { generateBoard } from '../src/game/deck.ts';
import { nextMatch, recordResult } from '../src/game/tournament.ts';
import type { TournamentState } from '../src/game/tournament.ts';
import type { Page } from '@playwright/test';

async function solve(page: Page, code: string) {
  const deck = generateBoard(code).deck;
  for (let face = 0; face < deck.length / 2; face++) {
    for (const index of deck
      .map((value, index) => (value === face ? index : -1))
      .filter((index) => index >= 0))
      await page.locator('.card').nth(index).dispatchEvent('click');
  }
}
async function exported(page: Page) {
  await page.getByRole('button', { name: 'Export tournament' }).click();
  return JSON.parse(await page.getByLabel('Tournament JSON').inputValue());
}
test(
  'hands off the same deal, validates imports and protects unfinished work',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    await page.getByLabel('Players', { exact: true }).selectOption('8');
    await expect(page.getByLabel('Player 8', { exact: true })).toBeVisible();
    await page.getByLabel('Players', { exact: true }).selectOption('4');
    for (const [index, name] of ['  Ada ', 'Bea', 'Cal', 'Dee'].entries())
      await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    await expect(page.getByText('Now playing: Ada', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Round: Semifinal')).toBeVisible();
    const first = await exported(page);
    const code: string = first.tournament.matches[0].boardCode;
    await page.getByRole('button', { name: 'Start turn' }).click();
    await expect(page.locator('.card')).toHaveCount(36);
    await solve(page, code);
    await page.getByRole('button', { name: 'Next turn' }).click();
    await expect(page.getByText('Now playing: Dee', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Start turn' }).click();
    const second = await exported(page);
    expect(second.tournament.matches[0].boardCode).toBe(code);
    expect(JSON.parse(second.snapshot).boardCode).toBe(code);
    await page
      .getByLabel('Tournament JSON')
      .fill(
        '{"format":"neon-pairs/tournament","snapshot":null,"tournament":null,"version":1,"extra":0}',
      );
    await page.getByRole('button', { name: 'Load tournament' }).click();
    await expect(page.getByRole('status')).toHaveText('Unknown field: extra.');
    await expect(page.locator('.card')).toHaveCount(36);
    await page.getByRole('button', { name: 'Leave tournament' }).click();
    await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.card')).toHaveCount(36);
    await page.getByLabel('Tournament JSON').fill(JSON.stringify(second));
    await page.getByRole('button', { name: 'Load tournament' }).click();
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.locator('.card').first().click();
    await expect(page.locator('.card.revealed')).toHaveCount(1);
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('keeps tournament play available when storage is blocked', async ({ page, gameURL }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new Error('Storage blocked');
      },
    });
  });
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByText("Progress won't be saved on this device.")).toBeVisible();
  for (const [index, name] of ['Ada', 'Bea', 'Cal', 'Dee'].entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.locator('.card').first().click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
});

test(
  'completes a tournament and retains its bracket without changing solo preferences',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.getByLabel('Size').selectOption('10');
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    let t: TournamentState = { names: ['Ada', 'Bea', 'Cal', 'Dee'], matches: [], phase: 'ready' };
    for (let i = 0; i < 2; i++) {
      t = nextMatch(t, `np1-6-${i + 1}`);
      t = recordResult(t, { moves: 18, elapsedMs: 10 });
      t = recordResult(t, { moves: 19, elapsedMs: 10 });
    }
    t = nextMatch(t, 'np1-8-3');
    t = recordResult(t, { moves: 33, elapsedMs: 10 });
    t = { ...t, phase: 'ready' };
    await page.getByLabel('Tournament JSON').fill(
      JSON.stringify({
        format: 'neon-pairs/tournament',
        snapshot: null,
        tournament: t,
        version: 1,
      }),
    );
    await page.getByRole('button', { name: 'Load tournament' }).click();
    await page.getByRole('button', { name: 'Start turn' }).click();
    await solve(page, 'np1-8-3');
    await expect(page.getByRole('heading', { name: 'Champion: Bea' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Bracket' })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Size')).toHaveValue('10');
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Champion: Bea' }).click();
    await expect(page.getByRole('heading', { name: 'Champion: Bea' })).toBeVisible();
    expect((await exported(page)).tournament.phase).toBe('complete');
  },
  {},
  undefined,
  TestTimeouts.long,
);
