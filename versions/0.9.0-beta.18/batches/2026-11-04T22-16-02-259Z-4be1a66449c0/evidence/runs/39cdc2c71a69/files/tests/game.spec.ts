import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
test('offline file, keyboard, snapshot and complete accessibility journey', async ({ page, context }) => {
  await context.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
  expect(await page.locator('main').ariaSnapshot()).toContain('combobox "Grid size"');
  expect(await page.locator('main').ariaSnapshot()).toContain('button "New Game"');
  const first = page.getByRole('button', {name:'Row 1, column 1, closed'});
  await expect(first).toBeVisible(); await expect(first.locator('svg')).toHaveCount(0);
  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Board code').fill('np1-4-1'); await page.getByRole('button', {name:'Load board'}).click();
  await expect(page.getByRole('button', {name:'Load board'})).toBeFocused();
  await first.focus(); await page.keyboard.press('ArrowRight'); await expect(page.getByRole('button', {name:'Row 1, column 2, closed'})).toBeFocused();
  await first.click(); await page.getByRole('button', {name:'Row 3, column 4, closed'}).click();
  await expect(page.getByText('Pair found. 1 pair matched.')).toHaveCount(1);
  await page.getByRole('button', {name:'Export snapshot'}).click();
  await page.getByRole('button', {name:'Load snapshot'}).click();
  await expect(page.getByText('Loaded snapshot. Select Resume to continue.').first()).toBeVisible();
  await page.getByRole('button', {name:'Resume'}).click(); await expect(page.getByRole('button', {name:/Row 1, column 1, .* matched/})).toBeFocused();
  for (const [a,b] of [[1,9],[2,6],[3,7],[4,5],[8,15],[10,14],[12,13]] as const) {
    for (const i of [a,b]) { const row = Math.floor(i / 4) + 1, col = i % 4 + 1; await page.getByRole('button', {name:`Row ${row}, column ${col}, closed`}).focus(); await page.keyboard.press('Enter'); }
  }
  await expect(page.getByText('All pairs found!', {exact:false}).first()).toBeVisible();
  expect(await page.locator('main').ariaSnapshot()).toContain('All pairs found!');
  await expect(page.getByText(/Pair found. All pairs found in 8 moves/)).toHaveCount(1);
  await expect(page.getByRole('button', {name:/Row 1, column 1, .* matched/})).toHaveAttribute('aria-disabled','true');
});
test('served preferences and large board remain usable', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173'); await page.getByLabel('Grid size').selectOption('16');
  await page.reload(); await expect(page.getByLabel('Grid size')).toHaveValue('16');
  await expect(page.locator('.card')).toHaveCount(256); await page.setViewportSize({width:360,height:800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.card').last().focus(); await expect(page.locator('.card').last()).toBeFocused();
});
test('replacement cancels a mismatch and snapshot loading preserves best scores', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Board code').fill('np1-4-1'); await page.getByRole('button', {name:'Load board'}).click();
  await page.getByRole('button', {name:'Row 1, column 1, closed'}).click();
  await page.getByRole('button', {name:'Row 1, column 2, closed'}).click();
  await page.getByRole('button', {name:'Restart'}).click();
  await page.getByRole('button', {name:'Row 1, column 3, closed'}).click();
  await page.waitForTimeout(900);
  await expect(page.getByRole('button', {name:/Row 1, column 3, .* revealed/})).toBeVisible();
  const completed = {version:1,boardCode:'np1-4-1',matched:Array.from({length:16}, (_,i)=>i),selection:{kind:'closed'},moves:8,elapsedMs:2000,started:true};
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify(completed));
  await page.getByRole('button', {name:'Load snapshot'}).click();
  await expect(page.getByText('Loaded completed snapshot.').first()).toBeVisible();
  await expect(page.getByRole('button', {name:'Resume'})).toHaveCount(0);
  await expect(page.getByText('Best:')).toContainText('none');
  await expect(page.locator('.win')).not.toHaveClass(/celebrate/);
});
test('imported mismatch remains paused until resume', async ({page}) => {
  await page.goto('http://127.0.0.1:4173'); await page.getByText('Reproduce a game').click();
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify({version:1,boardCode:'np1-4-1',matched:[0,11],selection:{kind:'mismatch',first:1,second:2,remainingMs:300},moves:2,elapsedMs:1500,started:true}));
  await page.getByRole('button', {name:'Load snapshot'}).click(); await page.waitForTimeout(400);
  await expect(page.getByRole('button', {name:/Row 1, column 2, .* revealed/})).toBeVisible();
  await page.getByRole('button', {name:'Row 1, column 4, closed'}).click();
  await expect(page.getByRole('button', {name:'Row 1, column 4, closed'})).toBeVisible();
  await page.getByRole('button', {name:'Resume'}).click();
  await expect(page.getByRole('button', {name:'Row 1, column 2, closed'})).toBeVisible();
});
