import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { SessionNotice } from '../src/game/session/session.ts';
import { NAMED_SNAPSHOT_VERSION, SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { finishBoard, loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

// The published name limit, kept apart from the component that sets it.
const DEAL_NAME_MAX_CHARACTERS = 40;

// Each helper expects the reproduction panel to be open.
async function exported(page: Page): Promise<unknown> {
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  return JSON.parse(
    await page.getByLabel(ReproductionControl.snapshot, { exact: true }).inputValue(),
  );
}

async function load(page: Page, value: Record<string, unknown>): Promise<void> {
  // Sorted keys put version last, like a snapshot formatted by another tool.
  const sorted = Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => (left < right ? -1 : 1)),
  );
  await page
    .getByLabel(ReproductionControl.snapshot, { exact: true })
    .fill(JSON.stringify(sorted, null, 2));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
}

test('a deal name exports as version 2 and returns with paused progress pasted in another field order', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.clock.runFor(1000);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', String(DEAL_NAME_MAX_CHARACTERS));
  await name.fill(' Café ');
  await expect(name).toBeFocused();
  const progress = {
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: SelectionKind.one, index: 2 },
    moves: 0,
    elapsedMs: 1000,
    started: true,
  };
  const named = { version: NAMED_SNAPSHOT_VERSION, name: ' Café ', ...progress };
  expect(await exported(page)).toEqual(named);
  await name.fill('');
  expect(await exported(page)).toEqual({ version: SNAPSHOT_VERSION, ...progress });
  await name.fill('Café');
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
  await load(page, { ...named, name: 'Café' });
  await expect(page.locator('.load-notice')).toHaveText(SessionNotice.loaded);
  await expect(name).toHaveValue('Café');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await name.fill('Renamed while paused');
  await page.clock.runFor(500);
  const resume = page.getByRole('button', { name: ReproductionControl.resume, exact: true });
  await expect(resume).toBeVisible();
  expect(await exported(page)).toEqual({ ...named, name: 'Renamed while paused' });
  await resume.click();
  await page.clock.runFor(250);
  expect(await exported(page)).toEqual({ ...named, name: 'Renamed while paused', elapsedMs: 1250 });
  await load(page, { version: SNAPSHOT_VERSION, ...progress });
  await expect(name).toHaveValue('');
});

test('new deals clear the name and a completed named import stays completed', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  const clears = [
    () => page.getByRole('button', { name: DealControl.restart, exact: true }).click(),
    () => page.getByLabel(DealControl.size, { exact: true }).selectOption('6'),
    () => page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click(),
    () => page.reload(),
  ];
  for (const clear of clears) {
    if (!(await name.isVisible())) await page.locator('summary').click();
    await name.fill('Temporary');
    await clear();
    if (!(await name.isVisible())) await page.locator('summary').click();
    await expect(name).toHaveValue('');
  }
  await page.getByLabel(ReproductionControl.board, { exact: true }).fill(EXAMPLE_CODE);
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await finishBoard(page);
  await name.fill('Done');
  const completed = await exported(page);
  expect(completed).toMatchObject({ version: NAMED_SNAPSHOT_VERSION, name: 'Done' });
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  if (typeof completed !== 'object' || completed === null) throw new Error('Expected a snapshot.');
  await load(page, Object.fromEntries(Object.entries(completed)));
  await expect(page.locator('.load-notice')).toHaveText(SessionNotice.loadedCompleted);
  await expect(name).toHaveValue('Done');
  await expect(page.locator('.card.matched')).toHaveCount(16);
  expect(await page.locator('.victory.celebrate').count()).toBe(0);
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
});
