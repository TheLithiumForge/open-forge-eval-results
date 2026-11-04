import { test, expect } from '@playwright/test';
import { loadBoard, openReproduction } from './helpers.ts';

test('keeps board-code drafts through play, rejects invalid input, and trims a successful load', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  const code = page.getByLabel('Board code');
  await code.fill('np1-5-1');
  await page.getByRole('button', { name: 'Row 1, column 1, closed' }).click();
  await expect(code).toHaveValue('np1-5-1');
  await page.getByRole('button', { name: 'Load board' }).click();
  await expect(page.locator('.control-status')).toHaveText('Invalid board code.');
  await expect(code).toHaveValue('np1-5-1');
  await expect(page.getByRole('button', { name: /Row 1, column 1, .*revealed/ })).toBeVisible();
  await expect(page.getByLabel('Grid size')).toHaveValue('4');

  await code.fill('  np1-6-1  ');
  await page.getByRole('button', { name: 'Load board' }).click();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.locator('.control-status')).toHaveText('Loaded board.');
  await expect(code).toHaveValue('np1-6-1');
  await expect(page.locator('.memory-card')).toHaveCount(36);
});

test('exports a readable snapshot without changing play and preserves invalid snapshot drafts', async ({ page }) => {
  const time = new Date('2026-11-04T00:00:00.000Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await page.getByRole('button', { name: 'Row 1, column 1, closed' }).click();
  await page.clock.runFor(1_200);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const textarea = page.getByLabel('Snapshot JSON');
  const exported = await textarea.inputValue();
  expect(exported).toContain('\n');
  const parsed: unknown = JSON.parse(exported);
  expect(parsed).toMatchObject({
    version: 1, boardCode: 'np1-4-1', matched: [],
    selection: { kind: 'one', index: 0 }, moves: 0, elapsedMs: 1_200, started: true,
  });
  await expect(page.getByRole('button', { name: 'Export snapshot' })).toBeFocused();
  await expect(page.locator('.game-summary')).toContainText('Time: 0:01');

  const invalid = '{"version":1,"unknown":true}';
  await textarea.fill(invalid);
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.locator('.control-status')).toHaveText('Invalid snapshot.');
  await expect(textarea).toHaveValue(invalid);
  await expect(page.getByRole('button', { name: 'Row 1, column 1, cyan solid plus, marker top, revealed' })).toBeVisible();
  await expect(page.getByLabel('Snapshot JSON')).toHaveAttribute('maxlength', '65536');
  await expect(page.getByLabel('Board code')).toHaveAttribute('maxlength', '32');
});

test('keeps reproduction controls collapsed initially and retains focus through export', async ({ page }) => {
  await page.goto('/');
  const details = page.locator('details');
  await expect(details).not.toHaveAttribute('open', '');
  await openReproduction(page);
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  await expect(page.getByRole('button', { name: 'Export snapshot' })).toBeFocused();
});
