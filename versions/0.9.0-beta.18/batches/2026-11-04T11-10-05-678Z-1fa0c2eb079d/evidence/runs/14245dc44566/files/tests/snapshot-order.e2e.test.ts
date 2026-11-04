import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

const NAMED_MISMATCH =
  '{"name":" Café ","selection":{"remainingMs":300,"second":1,"first":0,"kind":"mismatch"},"boardCode":"np1-4-1","started":true,"elapsedMs":500,"moves":1,"matched":[],"version":2}';
const UNNAMED_FRESH =
  '{"boardCode":"np1-4-1","started":false,"selection":{"kind":"closed"},"elapsedMs":0,"matched":[],"moves":0,"version":1}';

async function pasteAndLoad(page: Page, text: string): Promise<void> {
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(text);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
}

test('pasted version 2 ignores JSON key order and resumes its named mismatch at the saved time', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await pasteAndLoad(page, NAMED_MISMATCH);
  await expect(page.getByLabel(ReproductionControl.name, { exact: true })).toHaveValue(' Café ');
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.getByLabel(ReproductionControl.name, { exact: true }).fill('Edited while paused');
  await page.clock.runFor(2000);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.locator('summary').click();
  const frozen = await exportedSnapshot(page);
  expect(frozen).toMatchObject({ version: 2, name: 'Edited while paused', elapsedMs: 500 });
  expect(frozen.selection).toMatchObject({ kind: 'mismatch', remainingMs: 300 });
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  const saved = await exportedSnapshot(page);
  expect(saved).toMatchObject({ version: 2, name: 'Edited while paused', elapsedMs: 800 });
});

test('pasted version 1 clears a name and invalid snapshot objects keep the game and draft', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await page.getByLabel(ReproductionControl.name, { exact: true }).fill('Keep me');
  await page.locator('.card').nth(0).click();

  const base = {
    version: 2,
    name: 'Rejected',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'one', index: 0 },
    moves: 0,
    elapsedMs: 1,
    started: true,
  };
  const invalid = [
    { ...base, extra: true },
    { ...base, version: 3 },
    { ...base, name: '' },
    Object.fromEntries(Object.entries(base).filter(([key]) => key !== 'started')),
  ];
  for (const draft of invalid) {
    const text = JSON.stringify(draft);
    if (text === undefined) throw new Error('Expected a serializable snapshot.');
    await pasteAndLoad(page, text);
    await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
    await expect(page.getByLabel(ReproductionControl.snapshot, { exact: true })).toHaveValue(text);
    await expect(page.getByLabel(ReproductionControl.name, { exact: true })).toHaveValue('Keep me');
    await expect(page.locator('.card.revealed')).toHaveCount(1);
  }

  await pasteAndLoad(page, UNNAMED_FRESH);
  await expect(page.getByLabel(ReproductionControl.name, { exact: true })).toHaveValue('');
  await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('4');
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  expect(Object.keys(saved)).toEqual([
    'version',
    'boardCode',
    'matched',
    'selection',
    'moves',
    'elapsedMs',
    'started',
  ]);
});
