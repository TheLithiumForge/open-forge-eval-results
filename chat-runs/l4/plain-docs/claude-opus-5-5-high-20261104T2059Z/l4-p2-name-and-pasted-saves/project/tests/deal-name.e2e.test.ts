import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { NAMED_SNAPSHOT_VERSION, SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

const NAME = ' Café night ';
const REMAINING_MS = 300;
const PENDING = {
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: SelectionKind.mismatch, first: 0, second: 1, remainingMs: REMAINING_MS },
  moves: 1,
  elapsedMs: 500,
  started: true,
};

// Export opens and closes the reproduction panel itself, so other steps reopen it first.
async function dealName(page: Page) {
  if ((await page.locator('details').getAttribute('open')) === null)
    await page.locator('summary').click();
  return page.getByLabel(ReproductionControl.dealName, { exact: true });
}

async function exported(page: Page): Promise<Record<string, unknown>> {
  if ((await page.locator('details').getAttribute('open')) !== null)
    await page.locator('summary').click();
  return exportedSnapshot(page);
}

async function paste(page: Page, text: string): Promise<void> {
  await dealName(page);
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(text);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
}

test('a deal name exports as version 2 without changing the game and clears on a new deal', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await expect(await dealName(page)).toHaveValue('');
  await expect(await dealName(page)).toHaveAttribute('maxlength', '40');
  await page.locator('.card').nth(2).click();
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(200);
  const before = await exported(page);
  expect(before.version).toBe(SNAPSHOT_VERSION);
  expect(before).not.toHaveProperty('name');
  await (await dealName(page)).fill(NAME);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect(await exported(page)).toEqual({ ...before, version: NAMED_SNAPSHOT_VERSION, name: NAME });
  await (await dealName(page)).fill('');
  expect(await exported(page)).toEqual(before);
  const clears = [
    () => page.getByRole('button', { name: DealControl.newGame, exact: true }).click(),
    () => page.getByRole('button', { name: DealControl.restart, exact: true }).click(),
    () => page.getByLabel(DealControl.size, { exact: true }).selectOption('6'),
    () => page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click(),
    () => page.reload(),
  ];
  for (const clear of clears) {
    await (await dealName(page)).fill(NAME);
    await clear();
    await expect(await dealName(page)).toHaveValue('');
  }
});

test('a pasted named snapshot restores its name paused and a version 1 import clears it', async ({
  page,
}) => {
  await loadTimedBoard(page);
  // Hand-written or pasted snapshots can list their keys in another order and use CRLF lines.
  const named = { name: NAME, ...PENDING, version: NAMED_SNAPSHOT_VERSION };
  await paste(page, JSON.stringify(named, null, 2).replaceAll('\n', '\r\n'));
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await expect(await dealName(page)).toHaveValue(NAME);
  await (await dealName(page)).fill('Renamed while paused');
  const resume = page.getByRole('button', { name: ReproductionControl.resume, exact: true });
  await expect(resume).toBeVisible();
  await page.clock.runFor(1000);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await resume.click();
  await page.clock.runFor(REMAINING_MS);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await exported(page)).toMatchObject({
    version: NAMED_SNAPSHOT_VERSION,
    name: 'Renamed while paused',
    elapsedMs: PENDING.elapsedMs + REMAINING_MS,
  });
  await paste(page, JSON.stringify({ ...PENDING, version: SNAPSHOT_VERSION }));
  await expect(await dealName(page)).toHaveValue('');
  await paste(page, JSON.stringify({ ...named, name: '' }));
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
});
