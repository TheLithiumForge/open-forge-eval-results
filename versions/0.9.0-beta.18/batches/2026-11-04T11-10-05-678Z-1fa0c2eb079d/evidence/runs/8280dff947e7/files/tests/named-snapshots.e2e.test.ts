import { expect, test } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import type { Page } from '@playwright/test';

async function exportDraft(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const value: unknown = JSON.parse(
    await page.getByLabel('Snapshot JSON', { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected snapshot fields.');
  return value;
}

async function loadDraft(page: Page, value: unknown): Promise<void> {
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(value));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

const PENDING = {
  selection: { remainingMs: 300, second: 1, first: 0, kind: 'mismatch' },
  started: true,
  elapsedMs: 500,
  moves: 1,
  matched: [],
  boardCode: 'np1-4-1',
};

test('pasted legacy and named snapshots accept reordered fields and preserve paused progress', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('Previous name');
  await loadDraft(page, { ...PENDING, version: 1 });
  await expect(name).toHaveValue('');
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await loadDraft(page, { name: '  Café 😀  ', ...PENDING, version: 2 });
  await expect(name).toHaveValue('  Café 😀  ');
  const before = await exportDraft(page);
  await name.fill('Renamed while paused');
  await page.locator('.card').nth(3).click();
  await page.keyboard.press('Enter');
  await page.clock.runFor(2000);
  expect(await exportDraft(page)).toEqual({ ...before, name: 'Renamed while paused' });
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  const resume = page.getByRole('button', { name: 'Resume', exact: true });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await exportDraft(page)).toMatchObject({ name: 'Renamed while paused', elapsedMs: 800 });
});

test('invalid named drafts retain the current name, paused game and entered JSON', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await loadDraft(page, { ...PENDING, name: 'Keep me', version: 2 });
  const before = await exportDraft(page);
  for (const invalid of [
    { ...before, extra: true },
    { ...before, name: '' },
    { ...before, name: 'line\nbreak' },
    { ...before, name: 'x'.repeat(41) },
    { ...before, version: 1 },
  ]) {
    await loadDraft(page, invalid);
    await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue(
      JSON.stringify(invalid),
    );
    await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
    await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('Keep me');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    expect(await exportDraft(page)).toEqual(before);
  }
  await page.getByLabel('Board code', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Invalid board code.');
  expect(await exportDraft(page)).toEqual(before);
});

test('completed named imports stay static while a resumed named win records its best', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const complete = {
    name: 'Imported win',
    boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 3000,
    started: true,
    version: 2,
  };
  await loadDraft(page, complete);
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.getByLabel('Deal name', { exact: true }).fill('Completed rename');
  await page.clock.runFor(2000);
  expect(await exportDraft(page)).toEqual({ ...complete, name: 'Completed rename' });
  await loadDraft(page, {
    ...complete,
    name: 'Finish this one',
    matched: EXAMPLE_PAIRS.slice(0, -1).flat(),
    moves: 7,
  });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  const finalPair = EXAMPLE_PAIRS.at(-1);
  if (!finalPair) throw new Error('Expected the final pair.');
  for (const index of finalPair) await page.locator('.card').nth(index).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  expect((await exportDraft(page)).name).toBe('Finish this one');
  await page.reload();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
});
