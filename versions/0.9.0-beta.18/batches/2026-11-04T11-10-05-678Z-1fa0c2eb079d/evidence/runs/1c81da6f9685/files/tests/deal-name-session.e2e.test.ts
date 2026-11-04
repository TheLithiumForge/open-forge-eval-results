import { expect, test } from './browser-test.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

function withVersionLast(snapshot: Record<string, unknown>): string {
  const { version, ...fields } = snapshot;
  return JSON.stringify({ ...fields, version });
}

async function loadDraft(page: Page, text: string): Promise<void> {
  const details = page.locator('details');
  if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(text);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
}

test('a renamed paused mismatch preserves its timeout and Resume focus', async ({ page }) => {
  await loadTimedBoard(page);
  await loadDraft(
    page,
    withVersionLast({
      name: 'Pending deal',
      boardCode: EXAMPLE_CODE,
      matched: [],
      selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 300 },
      moves: 1,
      elapsedMs: 500,
      started: true,
      version: 2,
    }),
  );
  const details = page.locator('details');
  await details.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('Pending deal');
  await page.locator('.card').nth(2).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.card.revealed')).toHaveCount(2);

  await details.locator('summary').click();
  await name.fill('Renamed while paused');
  await details.locator('summary').click();
  const paused = await exportedSnapshot(page);
  expect(paused).toMatchObject({
    version: 2,
    name: 'Renamed while paused',
    elapsedMs: 500,
    selection: { kind: 'mismatch', remainingMs: 300 },
  });
  await page.clock.runFor(2000);
  expect(await exportedSnapshot(page)).toEqual(paused);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

test('a completed named import keeps the saved best static and allows editing', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, '{"schemaVersion":1,"size":4,"bestMoves":{"4":10}}');
  }, PREFERENCES_KEY);
  await loadTimedBoard(page, gameURL);
  await loadDraft(
    page,
    withVersionLast({
      name: 'Completed deal',
      boardCode: EXAMPLE_CODE,
      matched: EXAMPLE_PAIRS.flat(),
      selection: { kind: 'closed' },
      moves: 8,
      elapsedMs: 500,
      started: true,
      version: 2,
    }),
  );
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('Completed deal');
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('10');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await name.fill('Edited after winning');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: 'Edited after winning' });
  await page.clock.runFor(1000);
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('10');
});

test('resuming a named unfinished import records its best after a later win', async ({ page }) => {
  const finalPair = EXAMPLE_PAIRS[EXAMPLE_PAIRS.length - 1];
  if (!finalPair || finalPair[0] === undefined || finalPair[1] === undefined)
    throw new Error('Missing final pair.');
  await loadTimedBoard(page);
  await loadDraft(
    page,
    withVersionLast({
      name: 'Last pair',
      boardCode: EXAMPLE_CODE,
      matched: EXAMPLE_PAIRS.slice(0, -1).flat(),
      selection: { kind: 'one', index: finalPair[0] },
      moves: EXAMPLE_PAIRS.length - 1,
      elapsedMs: 500,
      started: true,
      version: 2,
    }),
  );
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('Last pair');
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('.card').nth(finalPair[1]).click();
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('Last pair');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: 'Last pair', moves: 8 });
});

test('deal names stay out of preferences and clear on reload and deal replacement', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  const details = page.locator('details');
  await details.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  await name.fill('Only in memory');
  const savedPreferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  expect(savedPreferences).toBe(preferences);
  await page.reload();
  await details.locator('summary').click();
  await expect(name).toHaveValue('');

  await name.fill('New game');
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Restart');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Size change');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Board code');
  await page.getByLabel('Board code', { exact: true }).fill(EXAMPLE_CODE);
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
});
