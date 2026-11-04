import { expect, test } from '@playwright/test';
import { card, loadBoard, openReproduction } from './helpers.ts';

test('loading, exporting and restarting preserve their control focus and reset or retain drafts correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('4');
  await openReproduction(page);
  const code = page.getByLabel('Board code', { exact: true });
  expect(await code.getAttribute('maxlength')).toBe('32');
  await code.fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board' }).click();
  await expect(page.getByRole('button', { name: 'Load board' })).toBeFocused();
  await code.fill('not-a-board-code');
  await card(page, 0).click();
  await expect(code).toHaveValue('not-a-board-code');
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.getByRole('button', { name: 'Restart' })).toBeFocused();
  await expect(code).toHaveValue('np1-4-1');

  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  expect(await draft.getAttribute('maxlength')).toBe('65536');
  await card(page, 0).click();
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  await expect(draft).toHaveValue(/"version": 1/);
  const exported = await draft.inputValue();
  await draft.fill('{');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await expect(page.locator('.reproduction-status')).toHaveText('Invalid snapshot.');
  await expect(draft).toHaveValue('{');
  await expect(card(page, 0)).toHaveAccessibleName(/revealed/);
  await draft.fill(exported);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await expect(page.locator('.reproduction-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(card(page, 0)).toHaveAccessibleName(/revealed/);
});

test('size changes preserve their select focus and reset a working deal', async ({ page }) => {
  await page.goto('/');
  const size = page.getByRole('combobox', { name: 'Grid size', exact: true });
  await size.focus();
  await page.keyboard.press('ArrowDown');
  await expect(size).toHaveValue('6');
  await expect(size).toBeFocused();
  await expect(page.getByText('Pairs: 0/18', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});
