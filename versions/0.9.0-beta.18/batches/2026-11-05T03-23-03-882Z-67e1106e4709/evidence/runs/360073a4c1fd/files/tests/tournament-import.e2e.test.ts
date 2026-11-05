import { expect, test } from './browser-test.ts';
import { decodeTournament } from '../src/game/tournament/format.ts';
import type { Page } from '@playwright/test';

async function click(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name, exact: true }).click();
}
async function setup(page: Page): Promise<void> {
  await click(page, 'Tournament');
  await page.getByLabel('Players', { exact: true }).selectOption('4');
  for (const [index, name] of ['  Ada   Lovelace ', 'Bo', 'Cora', 'Dev'].entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await click(page, 'Start tournament');
}

test('names validate, drafts survive failed loads and every tournament screen exports restorable JSON', async ({
  page,
  gameURL,
}) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto(gameURL);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await click(page, 'Tournament');
  await click(page, 'Start tournament');
  await expect(page.getByRole('status')).toHaveText('Use 2 to 20 characters.');
  for (const [index, name] of ['Ada', 'Bo', 'Cora', 'ADA'].entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await click(page, 'Start tournament');
  await expect(page.getByRole('status')).toHaveText('Each name must be different.');
  await page.getByLabel('Player 4', { exact: true }).fill('Dev');
  await click(page, 'Export tournament');
  const setupDraft = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
  await page.getByLabel('Player 1', { exact: true }).fill('changed');
  await click(page, 'Load tournament');
  await expect(page.getByLabel('Player 1', { exact: true })).toHaveValue('Ada');
  expect(decodeTournament(setupDraft).data?.tournament).toBeNull();
  await click(page, 'Start tournament');
  await expect(page.locator('.tournament-player')).toHaveText('Now playing: Ada');
  await click(page, 'Export tournament');
  const ready = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
  await click(page, 'Start turn');
  await page.locator('.card').first().click();
  await page.clock.runFor(1234);
  await click(page, 'Export tournament');
  const partial = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
  const game = decodeTournament(partial).data?.game;
  expect(game?.selection.kind).toBe('one');
  expect(game?.elapsedMs).toBe(1234);
  const field = page.getByLabel('Tournament JSON', { exact: true });
  await field.fill('{"unexpected":true}');
  await click(page, 'Load tournament');
  await expect(page.getByRole('status')).toHaveText('Unknown field: unexpected.');
  await expect(field).toHaveValue('{"unexpected":true}');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await field.fill(ready);
  await click(page, 'Load tournament');
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await field.fill(partial);
  await click(page, 'Load tournament');
  await click(page, 'Leave');
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Start turn', exact: true })).toBeVisible();
  await page.clock.runFor(5000);
  await click(page, 'Export tournament');
  expect(decodeTournament(await field.inputValue()).data?.game?.elapsedMs).toBe(1234);
  await click(page, 'Start turn');
  await page.clock.runFor(1000);
  await click(page, 'Export tournament');
  expect(decodeTournament(await field.inputValue()).data?.game?.elapsedMs).toBe(2234);
  await click(page, 'Leave tournament');
  await click(page, 'Keep playing');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await click(page, 'Leave tournament');
  await click(page, 'Leave');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await click(page, 'Tournament');
  await expect(page.getByText('No finished tournaments yet.', { exact: true })).toBeVisible();
});

test('tournament entry confirms unfinished solo play and phone controls remain reachable when storage is blocked', async ({
  page,
  gameURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    }),
  );
  await page.goto(gameURL);
  await page.locator('.card').first().click();
  await click(page, 'Tournament');
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await click(page, 'Tournament');
  await click(page, 'Leave');
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  for (const element of await page
    .locator(
      'section.tournament-screen button, section.tournament-screen input, section.tournament-screen select, section.tournament-screen textarea',
    )
    .all()) {
    const bounds = await element.boundingBox();
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await click(page, 'Leave tournament');
  await setup(page);
  await expect(page.locator('.tournament-player')).toHaveText('Now playing: Ada Lovelace');
  await click(page, 'Start turn');
  await page.locator('.card').first().click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
});
