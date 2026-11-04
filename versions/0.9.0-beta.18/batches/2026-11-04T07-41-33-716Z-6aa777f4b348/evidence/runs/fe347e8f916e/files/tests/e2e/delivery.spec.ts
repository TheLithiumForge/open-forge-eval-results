import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { card, exportState, finish, loadBoard, loadSnapshot, nearWin } from './helpers.ts';

test('the single HTML plays directly from disk with networking blocked', async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await loadBoard(page, 'np1-4-42');
  await finish(page, 4);
  expect((await exportState(page)).moves).toBe(8);
  expect(requests.filter((url) => !url.startsWith('file:'))).toEqual([]);
  expect(errors).toEqual([]);
  await context.close();
});
test('served preferences persist size and best but never active progress or unrelated keys', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('unrelated', 'keep'));
  await page.getByLabel('Grid size').selectOption('6');
  await card(page, 0).click();
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(card(page, 0)).toHaveAccessibleName(/closed$/);
  await loadBoard(page, 'np1-8-1');
  await loadBoard(page, 'np1-5-1');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('8');
  expect(await page.evaluate(() => localStorage.getItem('unrelated'))).toBe('keep');
});
test('storage failures leave play, imports, completion and in-memory best available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true,
      get() { throw new Error('Storage denied'); } });
  });
  await page.goto('/');
  await loadSnapshot(page, nearWin());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await card(page, 0).click();
  await card(page, 11).click();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await card(page, 0).click();
  await expect(card(page, 0)).toHaveAccessibleName(/revealed$/);
});
test('hover, cancellation and the normal context menu do not reveal cards; touch uses the same action', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await loadBoard(page);
  await card(page, 0).hover();
  await card(page, 0).dispatchEvent('pointercancel', { pointerType: 'touch' });
  await card(page, 0).click({ button: 'right' });
  await expect(card(page, 0)).toHaveAccessibleName(/closed$/);
  await page.keyboard.press('Escape');
  await card(page, 0).tap();
  await card(page, 11).tap();
  await expect(card(page, 0)).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await context.close();
});
