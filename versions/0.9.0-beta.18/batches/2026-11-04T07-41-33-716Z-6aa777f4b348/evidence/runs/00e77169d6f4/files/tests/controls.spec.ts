import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { cards, completed, loadBoard, loadSnapshot, tools, win } from './helpers.ts';

test('native controls, exact labels, drafts, errors and retained action focus', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('details')).not.toHaveAttribute('open', '');
  expect(await page.locator('select option').allTextContents()).toEqual(['4x4', '6x6', '8x8', '10x10', '12x12', '14x14', '16x16']);
  for (const name of ['New Game', 'Restart']) {
    const button = page.getByRole('button', { name, exact: true }); await button.click(); await expect(button).toBeFocused();
  }
  await loadBoard(page); await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  const code = page.getByLabel('Board code', { exact: true });
  await expect(code).toHaveAttribute('maxlength', '32');
  await code.fill('draft'); await cards(page).first().click(); await expect(code).toHaveValue('draft');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await expect(cards(page).first()).toHaveAccessibleName(/revealed$/);
  await expect(code).toHaveValue('draft');
  await code.fill('  np1-6-1  '); await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(code).toHaveValue('np1-6-1'); await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await page.getByLabel('Snapshot JSON').fill('{bad');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue('{bad');
  await expect(cards(page)).toHaveCount(36);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue(/"version": 1/);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
});
test('keyboard edges, native tab exit, remembered stop, modifiers and reset focus', async ({ page }) => {
  await page.goto('/'); await loadBoard(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus(); await page.keyboard.press('Tab');
  await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp');
  await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.keyboard.press('Shift+ArrowRight'); await expect(cards(page).nth(5)).toBeFocused();
  await page.keyboard.press('Control+Enter'); await expect(cards(page).nth(5)).toHaveAccessibleName(/closed$/);
  await page.keyboard.press('Tab'); await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(cards(page).nth(5)).toBeFocused();
  await page.keyboard.press('Space'); await expect(cards(page).nth(5)).toHaveAccessibleName(/revealed$/);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(cards(page).first()).toBeFocused();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});
test('hidden identities, right click, hover and cancelled pointer reveal nothing', async ({ page }) => {
  await page.goto('/'); await loadBoard(page);
  const card = cards(page).first();
  await expect(card).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(cards(page).locator('svg')).toHaveCount(0);
  await card.hover(); await card.click({ button: 'right' });
  await card.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
  await card.dispatchEvent('pointercancel', { pointerType: 'touch', isPrimary: true });
  await expect(card).toHaveAccessibleName(/closed$/);
  expect(await card.getAttribute('data-face')).toBeNull();
  await card.click();
  await expect(card).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  await expect(card.locator('svg')).toHaveCount(1);
});
test('complete keyboard accessibility journey and exactly one turn announcement', async ({ page }, testInfo) => {
  await page.goto('/'); await loadBoard(page);
  const live = page.locator('[aria-live="polite"]');
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).focus(); await page.keyboard.press('Tab');
  await page.keyboard.press('Enter'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await expect(live).toHaveText('No match. Cards close after a short pause.');
  const first = await live.locator('span').elementHandle();
  await expect(cards(page).first()).toHaveAccessibleName(/closed$/);
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  expect(await first?.evaluate(element => element.isConnected)).toBe(false);
  await expect(live).toHaveText('No match. Cards close after a short pause.');
  await expect(cards(page).first()).toHaveAccessibleName(/closed$/);
  const closedTree = await page.locator('main').ariaSnapshot();
  await testInfo.attach('closed-board-accessibility.yml', { body: closedTree, contentType: 'text/yaml' });
  await win(page, 4, true);
  await expect(live).toHaveText(/Pair found\. All pairs found in 10 moves and \d+:\d{2}\./);
  const completedTree = await page.locator('main').ariaSnapshot();
  await testInfo.attach('completed-keyboard-accessibility.yml', { body: completedTree, contentType: 'text/yaml' });
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/accessibility-closed.yml', closedTree);
  await writeFile('artifacts/accessibility-completed.yml', completedTree);
  await page.keyboard.press('Tab'); await expect(page.locator('summary')).toBeFocused();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});
test('storage denial and corrupted preferences leave the app playable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Denied'); } });
  });
  await page.goto('/'); await loadBoard(page); await win(page);
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
});
test('completed imports never overwrite existing best and select imported size', async ({ page }) => {
  await page.goto('/'); await loadBoard(page); await win(page);
  await loadSnapshot(page, completed(4, 8));
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await loadSnapshot(page, completed(6));
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await expect(page.locator('.load-status')).toHaveText('Loaded completed snapshot.');
});
test('native completed tap uses the shared card action', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173'); await loadBoard(page);
  await cards(page).nth(0).tap(); await cards(page).nth(11).tap();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await context.close();
});
