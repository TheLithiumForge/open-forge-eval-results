import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

async function loadDraft(page: Page, snapshot: unknown): Promise<void> {
  await page.locator('summary').click();
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(snapshot));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await page.locator('summary').click();
}

test('reordered named progress stays paused while renamed and resumes its saved mismatch time', async ({
  page,
}) => {
  await loadTimedBoard(page);
  // Both the top-level and selection properties differ from the exporter's order.
  const saved = {
    boardCode: 'np1-4-1',
    elapsedMs: 1500,
    selection: { remainingMs: 300, second: 1, first: 0, kind: 'mismatch' },
    matched: [],
    moves: 1,
    started: true,
    name: '  Café  ',
    version: 2,
  };
  await loadDraft(page, saved);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue(saved.name);
  await name.fill('  Paused 😀  ');
  await expect(name).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await page.locator('summary').click();
  await page.locator('.card').nth(2).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(2000);
  expect(await exportedSnapshot(page)).toEqual({ ...saved, name: '  Paused 😀  ' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await exportedSnapshot(page)).toMatchObject({
    name: '  Paused 😀  ',
    elapsedMs: 1800,
    moves: 1,
    selection: { kind: 'closed' },
  });
});

test('a reordered unnamed import clears an existing name and retains the version one format', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await page.getByLabel('Deal name', { exact: true }).fill('Previous deal');
  await page.locator('summary').click();
  const saved = {
    started: true,
    elapsedMs: 900,
    moves: 0,
    selection: { index: 2, kind: 'one' },
    matched: [],
    boardCode: 'np1-6-1',
    version: 1,
  };
  await loadDraft(page, saved);
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await page.locator('summary').click();
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(saved);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
});

test('failed named snapshot and board loads preserve progress, name, pause and correction drafts', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const saved = {
    version: 2,
    name: 'Keep this game',
    boardCode: 'np1-4-1',
    matched: [2, 6],
    selection: { kind: 'one', index: 0 },
    moves: 1,
    elapsedMs: 1200,
    started: true,
  };
  await loadDraft(page, saved);
  await page.locator('summary').click();
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  const invalid = JSON.stringify({ ...saved, boardCode: 'np1-6-1', name: 'Bad\nname' });
  await draft.fill(invalid);
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(draft).toHaveValue(invalid);
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue(saved.name);
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
  const code = page.getByLabel('Board code', { exact: true });
  await code.fill('bad');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(code).toHaveValue('bad');
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue(saved.name);
  await expect(page.locator('.load-notice')).toHaveText('Invalid board code.');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.locator('summary').click();
  await page.clock.runFor(2000);
  expect(await exportedSnapshot(page)).toEqual(saved);
});
