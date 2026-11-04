import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

async function loadDraft(page: Page, draft: unknown): Promise<void> {
  await page.locator('summary').click();
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(JSON.stringify(draft));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await page.locator('summary').click();
}

const PENDING = {
  boardCode: EXAMPLE_CODE,
  elapsedMs: 500,
  selection: { remainingMs: 300, second: 1, kind: 'mismatch', first: 0 },
  moves: 1,
  matched: [],
  started: true,
  name: 'Café',
  version: 2,
};

test('reordered named imports pause and Resume restores the remaining mismatch time', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await loadDraft(page, PENDING);
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('Café');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await page.locator('.card').nth(4).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(5)).toBeFocused();
  await page.clock.runFor(2000);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await expect(name).toHaveValue('Café');

  await page.locator('summary').click();
  await name.fill(' paused rename ');
  await page.locator('summary').click();
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await expect(page.locator('.card').nth(5)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

test('a named export can be pasted and loaded with its deal name and progress', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await page.getByLabel(ReproductionControl.dealName, { exact: true }).fill('  Saved 😀  ');
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  expect(saved).toMatchObject({
    version: 2,
    name: '  Saved 😀  ',
    selection: { kind: 'mismatch', remainingMs: 600 },
    moves: 1,
    elapsedMs: 200,
  });

  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await loadDraft(page, saved);
  await expect(page.getByLabel(ReproductionControl.dealName, { exact: true })).toHaveValue(
    '  Saved 😀  ',
  );
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await page.clock.runFor(599);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
});

test('version 1 imports clear names and invalid snapshots keep the paused game and draft', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await page.getByLabel(ReproductionControl.dealName, { exact: true }).fill('old name');
  await page.locator('summary').click();
  await loadDraft(page, {
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { index: 0, kind: 'one' },
    moves: 0,
    elapsedMs: 0,
    started: true,
    version: 1,
  });
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('');
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await page.locator('summary').click();
  await name.fill('keep this name');
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const invalidDrafts = [
    JSON.stringify({ ...PENDING, extra: true }),
    JSON.stringify({ ...PENDING, version: 3 }),
    JSON.stringify({ ...PENDING, name: 'invalid\nname' }),
    JSON.stringify({ ...PENDING, name: 'x'.repeat(41) }),
  ];
  for (const invalidDraft of invalidDrafts) {
    await snapshot.fill(invalidDraft);
    await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
    await expect(snapshot).toHaveValue(invalidDraft);
    await expect(name).toHaveValue('keep this name');
    await expect(page.locator('.card.revealed')).toHaveCount(1);
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
  }
  await page.clock.runFor(2000);
  await expect(page.locator('.card.revealed')).toHaveCount(1);
});

test('a completed named import is static and resuming a named game can set a best score', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await loadDraft(page, {
    version: 2,
    name: 'Complete',
    boardCode: EXAMPLE_CODE,
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 3000,
    started: true,
  });
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('Complete');
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
  const beforeRename = await exportedSnapshot(page);
  await page.locator('summary').click();
  await name.fill('Completed rename');
  await page.locator('summary').click();
  const afterRename = await exportedSnapshot(page);
  expect(afterRename).toMatchObject({ ...beforeRename, name: 'Completed rename' });
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');

  await loadDraft(page, {
    version: 2,
    name: 'Last pair',
    boardCode: EXAMPLE_CODE,
    matched: EXAMPLE_PAIRS.slice(0, -1).flat(),
    selection: { kind: 'one', index: EXAMPLE_PAIRS[7]?.[0] },
    moves: 7,
    elapsedMs: 500,
    started: true,
  });
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  const lastPair = EXAMPLE_PAIRS[7];
  if (!lastPair) throw new Error('Missing final example pair.');
  await page.locator('.card').nth(lastPair[1]).click();
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
});
