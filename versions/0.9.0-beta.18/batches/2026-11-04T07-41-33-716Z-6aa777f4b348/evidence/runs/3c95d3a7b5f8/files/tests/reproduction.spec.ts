import { expect, test } from '@playwright/test';
import { cards, endingSnapshot, exported, frozenPage, loadBoard, loadSnapshot, live, tools } from './support.ts';

test('has exact native tools and retains drafts and focus on invalid loads', async ({ page }) => {
  await frozenPage(page);
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.locator('select option')).toHaveText(['4x4', '6x6', '8x8', '10x10', '12x12', '14x14', '16x16']);
  await tools(page);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveAttribute('maxlength', '65536');
  await loadBoard(page, '  np1-4-1  ');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await page.getByLabel('Board code', { exact: true }).fill('np1-6-19');
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-6-19');
  await page.getByLabel('Board code', { exact: true }).fill('np1-04-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(live(page)).toHaveText('Invalid board code.');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-04-1');
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toHaveValue('4');
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await loadSnapshot(page, '{"version":1}');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await expect(live(page)).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue('{"version":1}');
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
});

test('exports whole active milliseconds without pausing and restores pending progress paused', async ({ page }) => {
  await frozenPage(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(250);
  const pending = await exported(page);
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  expect(pending.elapsedMs).toBe(250);
  expect(pending.selection).toMatchObject({ kind: 'mismatch', remainingMs: 550 });
  const text = await page.getByLabel('Snapshot JSON', { exact: true }).inputValue();
  await page.clock.runFor(100);
  expect((await exported(page)).elapsedMs).toBe(350);
  await loadSnapshot(page, text);
  await expect(live(page)).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await cards(page).nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await cards(page).nth(6).click({ force: true });
  await page.clock.runFor(5000);
  expect(await exported(page)).toEqual(pending);
  await cards(page).nth(5).focus();
  let resumeFocus = '';
  page.on('console', (message) => {
    if (message.text().startsWith('RESUME_FOCUS:')) resumeFocus = message.text().slice(13);
  });
  await page.getByRole('button', { name: 'Resume', exact: true }).evaluate((button) => {
    new MutationObserver(() => {
      if (!button.isConnected) console.info(`RESUME_FOCUS:${document.activeElement?.getAttribute('data-position')}`);
    }).observe(button.parentElement ?? button, { childList: true });
  });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(5)).toBeFocused();
  await expect.poll(() => resumeFocus).toBe('5');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(549);
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await page.keyboard.press('Enter');
  await expect(cards(page).nth(5)).toHaveAccessibleName(/revealed$/);
  await expect(page.locator('.card--revealed')).toHaveCount(1);
});

test('completed imports are static and do not write a best score', async ({ page }) => {
  await page.goto('/');
  await loadSnapshot(page, endingSnapshot(8, true));
  await expect(live(page)).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await expect(page.locator('.win-banner')).not.toHaveClass(/celebrate/);
  expect(await page.locator('.win-banner').evaluate((node) => node.getAnimations().length)).toBe(0);
  await page.reload();
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await expect(page.locator('.win-banner')).toHaveCount(0);
});

test('continues to victory at both display caps', async ({ page }) => {
  await frozenPage(page);
  await loadSnapshot(page, endingSnapshot(999999, false, 4, 359999999));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(10000);
  await cards(page).nth(2).click();
  await cards(page).nth(6).click();
  await expect(page.getByText('Moves: 999999', { exact: true })).toBeVisible();
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible();
  await expect(live(page)).toHaveText('Pair found. All pairs found in 999999 moves and 5999:59.');
  await expect(page.getByRole('region', { name: 'Game complete' })).toBeVisible();
});
