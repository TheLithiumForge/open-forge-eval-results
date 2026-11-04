import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const url = pathToFileURL(resolve('dist/index.html')).href;
test('offline keyboard game exposes accessible cards and completes', async ({ page, context }) => {
  await context.route(/^https?:/, route => route.abort());
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Board code').fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board' }).click();
  const first = page.getByRole('button', { name: 'Row 1, column 1, closed' });
  await expect(first).toBeVisible();
  await expect(page.locator('.card svg')).toHaveCount(0);
  await first.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /Row 1, column 1, cyan solid plus, marker top, revealed/ })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Row 1, column 2, closed' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Row 1, column 1, cyan solid plus, marker top, revealed' })).not.toBeFocused();
  const tree = await page.locator('main').ariaSnapshot();
  expect(tree).toContain('Grid size');
  expect(tree).toContain('Row 1, column 1, cyan solid plus, marker top, revealed');
  await page.locator('.card').first().focus();
  let position = 0;
  async function moveTo(target: number) {
    while (Math.floor(position / 4) < Math.floor(target / 4)) { await page.keyboard.press('ArrowDown'); position += 4; }
    while (Math.floor(position / 4) > Math.floor(target / 4)) { await page.keyboard.press('ArrowUp'); position -= 4; }
    while (position % 4 < target % 4) { await page.keyboard.press('ArrowRight'); position++; }
    while (position % 4 > target % 4) { await page.keyboard.press('ArrowLeft'); position--; }
  }
  for (const [a,b] of [[0,11],[1,9],[2,6],[3,7],[4,5],[8,15],[10,14],[12,13]]) {
    if (a === undefined || b === undefined) throw Error('fixture');
    if (a !== 0) { await moveTo(a); await page.keyboard.press('Enter'); }
    await moveTo(b); await page.keyboard.press('Space');
  }
  await expect(page.getByText('All pairs found!', { exact: false })).toBeVisible();
  await expect(page.locator('[aria-live="polite"]')).toContainText('All pairs found in 8 moves');
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.getByText('Moves:', { exact: false })).toContainText('0');
});
test('snapshot import pauses and resume continues a mismatch', async ({ page }) => {
  await page.goto(url); await page.getByText('Reproduce a game').click();
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify({version:1,boardCode:'np1-4-1',matched:[0,11],selection:{kind:'mismatch',first:1,second:2,remainingMs:300},moves:2,elapsedMs:1500,started:true}));
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.locator('.load-status')).toBeVisible();
  await page.waitForTimeout(400); await expect(page.locator('.card.revealed')).toHaveCount(4);
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(2);
});
test('large board stays inside viewport with reachable cards', async ({ page }) => {
  await page.setViewportSize({width:360,height:800}); await page.goto(url);
  await page.getByLabel('Grid size').selectOption('16');
  await expect(page.locator('.card')).toHaveCount(256);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const size = await page.locator('.card').first().boundingBox(); expect(size?.width).toBeGreaterThanOrEqual(44);
  await page.locator('.card').last().focus(); await expect(page.locator('.card').last()).toBeInViewport();
});

test('saved size and best survive a reload on HTTP', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.getByLabel('Grid size').selectOption('6');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Board code').fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board' }).click();
  for (const [a,b] of [[0,11],[1,9],[2,6],[3,7],[4,5],[8,15],[10,14],[12,13]]) {
    if (a === undefined || b === undefined) throw Error('fixture');
    await page.locator('.card').nth(a).click(); await page.locator('.card').nth(b).click();
  }
  await expect(page.locator('.status')).toContainText('Best: 8');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.locator('.status')).toContainText('Best: 8');
});

test('restart cancels a mismatch and preserves focus', async ({ page }) => {
  await page.goto(url); await page.getByText('Reproduce a game').click();
  await page.getByLabel('Board code').fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board' }).click();
  await page.locator('.card').nth(0).click(); await page.locator('.card').nth(1).click();
  const restart = page.getByRole('button', { name: 'Restart' });
  await restart.click(); await expect(restart).toBeFocused();
  await page.locator('.card').nth(2).click();
  await page.waitForTimeout(900);
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.locator('.status')).toContainText('Moves: 0');
});
test('zoom-equivalent viewport keeps controls and large board usable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  const page = await context.newPage(); await page.goto(url);
  await page.getByLabel('Grid size').selectOption('16');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const last = page.locator('.card').last(); await last.focus();
  await expect(last).toBeInViewport(); await page.keyboard.press('Enter');
  await expect(last).toHaveClass(/revealed/);
  await context.close();
});
