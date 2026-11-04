import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

async function exportCurrent(page: Page): Promise<Record<string, unknown>> {
  const open = (await page.locator('details').getAttribute('open')) !== null;
  if (open) await page.locator('summary').click();
  return exportedSnapshot(page);
}

test('editing a name preserves the active mismatch, clock and counters', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await name.fill('  Pair ☕  ');
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  await name.fill('😀'.repeat(20));
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect(await exportCurrent(page)).toMatchObject({
    version: 2,
    name: '😀'.repeat(20),
    moves: 1,
    elapsedMs: 200,
    selection: { kind: SelectionKind.mismatch, remainingMs: 600 },
  });
  await page.locator('summary').click();
  await name.fill('');
  const unnamed = await exportCurrent(page);
  expect(unnamed.version).toBe(1);
  expect(unnamed).not.toHaveProperty('name');
  expect(unnamed.selection).toMatchObject({ kind: SelectionKind.mismatch, remainingMs: 600 });
});

test('a name stays editable during an imported pause and resumes the exact interval', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const snapshot = {
    version: 2,
    name: 'Saved pause',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.mismatch, first: 0, second: 1, remainingMs: 300 },
    moves: 1,
    elapsedMs: 500,
    started: true,
  };
  await page
    .getByLabel(ReproductionControl.snapshot, { exact: true })
    .fill(JSON.stringify(snapshot));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('Saved pause');
  await name.fill('Edited while paused');
  await page.locator('.card').nth(3).focus();
  await page.clock.runFor(2000);
  expect(await exportCurrent(page)).toMatchObject({
    version: 2,
    name: 'Edited while paused',
    elapsedMs: 500,
    selection: { kind: SelectionKind.mismatch, remainingMs: 300 },
  });
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await exportCurrent(page)).toMatchObject({ name: 'Edited while paused', elapsedMs: 800 });
});

test('deal resets and reload do not keep a name in saved preferences', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await name.fill('Temporary name');
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Temporary name');
  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Temporary name');
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Temporary name');
  await page.getByLabel(ReproductionControl.board, { exact: true }).fill(EXAMPLE_CODE);
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');

  await name.fill('Do not remember me');
  await page.reload();
  await page.locator('summary').click();
  await expect(page.getByLabel(ReproductionControl.dealName, { exact: true })).toHaveValue('');
  const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  expect(preferences ?? '').not.toContain('Do not remember me');
  const snapshot = await exportCurrent(page);
  expect(snapshot.version).toBe(1);
  expect(snapshot).not.toHaveProperty('name');
});
