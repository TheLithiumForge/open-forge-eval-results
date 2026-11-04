import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { NAMED_SNAPSHOT_VERSION, SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

// The published name limit, kept apart from the component that sets it.
const DEAL_NAME_MAX_CHARACTERS = 40;
const CAFE = 'Café';
const MISMATCH_LEFT_MS = 300;

async function loadDraft(page: Page, text: string): Promise<void> {
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(text);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
}

test('a named game exports version 2 and its name comes back with the paused progress', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', String(DEAL_NAME_MAX_CHARACTERS));
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(500);
  await name.fill(` ${CAFE} `);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  expect(saved).toMatchObject({ version: NAMED_SNAPSHOT_VERSION, name: ` ${CAFE} `, moves: 1 });
  await page.clock.runFor(MISMATCH_LEFT_MS);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await page.locator('summary').click();
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
  // A pasted snapshot may list its fields in another order.
  const pasted = Object.fromEntries(Object.entries(saved).reverse());
  await loadDraft(page, JSON.stringify(pasted, null, 4));
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await expect(name).toHaveValue(` ${CAFE} `);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await name.fill('Renamed while paused');
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  const remaining = saved.selection;
  if (!remaining || typeof remaining !== 'object' || !('remainingMs' in remaining))
    throw new Error('Expected a pending mismatch.');
  await page.clock.runFor(Number(remaining.remainingMs) - 1);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await name.fill('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: SNAPSHOT_VERSION });
});

test('a completed named import stays static and every new deal or unnamed import clears the name', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await loadDraft(
    page,
    JSON.stringify({
      started: true,
      elapsedMs: 500,
      moves: EXAMPLE_PAIRS.length,
      selection: { kind: SelectionKind.closed },
      matched: EXAMPLE_PAIRS.flat(),
      boardCode: EXAMPLE_CODE,
      name: CAFE,
      version: NAMED_SNAPSHOT_VERSION,
    }),
  );
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(name).toHaveValue(CAFE);
  expect(await page.locator('.victory.celebrate').count()).toBe(0);
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  const unnamed = {
    version: SNAPSHOT_VERSION,
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.one, index: 2 },
    moves: 0,
    elapsedMs: 0,
    started: true,
  };
  await loadDraft(page, JSON.stringify(unnamed));
  await expect(name).toHaveValue('');
  for (const clear of [
    () => page.getByRole('button', { name: DealControl.newGame, exact: true }).click(),
    () => page.getByRole('button', { name: DealControl.restart, exact: true }).click(),
    () => page.getByLabel(DealControl.size, { exact: true }).selectOption('6'),
    () => page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click(),
    () => page.reload(),
  ]) {
    await page.locator('details').evaluate((element) => element.setAttribute('open', ''));
    await name.fill(CAFE);
    await clear();
    await page.locator('details').evaluate((element) => element.setAttribute('open', ''));
    await expect(name).toHaveValue('');
  }
});
