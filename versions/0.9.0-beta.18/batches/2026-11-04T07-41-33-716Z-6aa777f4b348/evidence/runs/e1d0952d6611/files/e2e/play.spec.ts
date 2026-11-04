import { expect, test } from '@playwright/test';
import { card, loadBoard, pairsFor, pauseClock } from './helpers.ts';

test('valid board loads are deterministic and invalid drafts leave play unchanged', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toHaveValue('4');
  await expect(page.locator('.reproduce-panel')).not.toHaveAttribute('open', '');
  await loadBoard(page, ' np1-4-1 ');
  await expect(page.locator('.board-code-current')).toContainText('np1-4-1');
  await card(page, 0).focus();
  await page.keyboard.press('Enter');
  await expect(card(page, 0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-01');
  await page.getByRole('button', { name: 'Load board' }).click();
  await expect(page.locator('.reproduction-status')).toHaveText('Invalid board code.');
  await expect(card(page, 0)).toHaveAccessibleName(/cyan solid plus, marker top, revealed/);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-01');
});

test('repeated selection, match and repeated misses follow the active 800ms boundary', async ({ page }) => {
  await pauseClock(page);
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await card(page, 0).focus();
  await page.keyboard.press('Enter');
  await card(page, 0).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await page.clock.runFor(73);
  await card(page, 11).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Pair found. 1 pair matched.');
  await card(page, 1).focus();
  await page.keyboard.press('Enter');
  await card(page, 2).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[aria-live="polite"]')).toHaveText('No match. Cards close after a short pause.');
  await card(page, 3).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await page.clock.runFor(799);
  await expect(card(page, 1)).toHaveAccessibleName(/revealed/);
  await page.clock.runFor(1);
  await expect(card(page, 1)).toHaveAccessibleName('Row 1, column 2, closed');
  await expect(page.locator('[aria-live="polite"]')).toHaveText('No match. Cards close after a short pause.');
});

test('Restart and New Game discard staggered old mismatch deadlines', async ({ page }) => {
  await pauseClock(page);
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await card(page, 0).focus();
  await page.keyboard.press('Enter');
  await card(page, 1).focus();
  await page.keyboard.press('Enter');
  await page.clock.runFor(73);
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await card(page, 2).focus();
  await page.keyboard.press('Enter');
  await card(page, 3).focus();
  await page.keyboard.press('Enter');
  await expect(card(page, 2)).toHaveAccessibleName(/revealed/);
  await page.clock.runFor(726);
  await expect(card(page, 2)).toHaveAccessibleName(/revealed/);
  await page.clock.runFor(1);
  await expect(card(page, 2)).toHaveAccessibleName(/revealed/);
  await page.clock.runFor(72);
  await expect(card(page, 2)).toHaveAccessibleName(/revealed/);
  await page.clock.runFor(1);
  await expect(card(page, 2)).toHaveAccessibleName(/closed/);
  const code = await page.locator('.board-code-current').innerText();
  await card(page, 4).focus();
  await page.keyboard.press('Enter');
  await card(page, 6).focus();
  await page.keyboard.press('Enter');
  await page.clock.runFor(73);
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(page.locator('.board-code-current')).not.toHaveText(code);
  await card(page, 0).focus();
  await page.keyboard.press('Enter');
  await card(page, 1).focus();
  await page.keyboard.press('Enter');
  await page.clock.runFor(726);
  await expect(card(page, 0)).toHaveAccessibleName(/revealed/);
  await page.clock.runFor(1);
  await expect(card(page, 0)).toHaveAccessibleName(/revealed/);
  await page.clock.runFor(72);
  await expect(card(page, 0)).toHaveAccessibleName(/revealed/);
  await page.clock.runFor(1);
  await expect(card(page, 0)).toHaveAccessibleName(/closed/);
});

test('every supported grid can be completed from a reproducible board code', async ({ page }) => {
  await page.goto('/');
  for (const side of [4, 6, 8, 10, 12, 14, 16]) {
    await loadBoard(page, `np1-${side}-1`);
    const pairs = pairsFor(`np1-${side}-1`);
    for (const [first, second] of pairs.values()) {
      await card(page, first).dispatchEvent('click');
      await card(page, second).dispatchEvent('click');
    }
    await expect(page.getByRole('region', { name: 'Game complete' })).toContainText('All pairs found!');
    await expect(page.getByText(`Pairs: ${side * side / 2}/${side * side / 2}`, { exact: true })).toBeVisible();
  }
});
