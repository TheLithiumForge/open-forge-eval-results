import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

// Deliberately use a different field order from the game's export, including its selection.
const PROGRESS = {
  selection: { remainingMs: 300, second: 2, kind: 'mismatch', first: 1 },
  elapsedMs: 1500,
  moves: 2,
  matched: [11, 0],
  boardCode: 'np1-4-1',
  started: true,
  version: 1,
};

async function pasteSnapshot(page: Page, snapshot: Record<string, unknown>): Promise<void> {
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(snapshot));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
}

test('pasted snapshots load in either version with restored names and exact paused progress', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('Replace this name');
  for (const snapshot of [PROGRESS, { ...PROGRESS, name: '  Café 🃏  ', version: 2 }]) {
    await pasteSnapshot(page, snapshot);
    await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
    const savedName = 'name' in snapshot ? snapshot.name : '';
    await expect(name).toHaveValue(savedName);
    await expect(page.locator('.load-notice')).toHaveText(
      'Loaded snapshot. Select Resume to continue.',
    );
    await name.fill('Edited while paused');
    await page.locator('.card').nth(3).click();
    await page.keyboard.press('Enter');
    await page.clock.runFor(1000);
    await page.locator('summary').click();
    expect(await exportedSnapshot(page)).toEqual({
      ...PROGRESS,
      version: 2,
      name: 'Edited while paused',
      matched: [0, 11],
    });
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.locator('.card').nth(3)).toBeFocused();
    await page.clock.runFor(299);
    await expect(page.locator('.card.revealed')).toHaveCount(2);
    await page.clock.runFor(1);
    await expect(page.locator('.card.revealed')).toHaveCount(0);
    await page.locator('summary').click();
  }
});

test('invalid named drafts keep the game, name, pause and draft for correction', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await pasteSnapshot(page, { ...PROGRESS, name: 'Keep this', version: 2 });
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  for (const invalid of [
    { ...PROGRESS, name: '', version: 2 },
    { ...PROGRESS, name: 'a\nb', version: 2 },
    { ...PROGRESS, name: 'x'.repeat(41), version: 2 },
    { ...PROGRESS, name: 'Wrong version' },
    { ...PROGRESS, extra: true },
    { ...PROGRESS, selection: { kind: 'closed', extra: true } },
  ]) {
    await pasteSnapshot(page, invalid);
    await expect(field).toHaveValue(JSON.stringify(invalid));
    await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('Keep this');
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  }
  await page.locator('summary').click();
  await page.clock.runFor(1000);
  expect(await exportedSnapshot(page)).toEqual({
    ...PROGRESS,
    version: 2,
    name: 'Keep this',
    matched: [0, 11],
  });
});

test('completed named imports stay static and editable without recording a best score', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await pasteSnapshot(page, {
    name: 'Finished Café',
    matched: Array.from({ length: 16 }, (_, index) => index),
    boardCode: 'np1-4-1',
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 3000,
    started: true,
    version: 2,
  });
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('Finished Café');
  await name.fill('Renamed finished deal');
  await expect(page.locator('.card.matched')).toHaveCount(16);
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.load-notice')).toHaveText('Loaded completed snapshot.');
  await page.clock.runFor(1000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 2,
    name: 'Renamed finished deal',
    elapsedMs: 3000,
  });
});
