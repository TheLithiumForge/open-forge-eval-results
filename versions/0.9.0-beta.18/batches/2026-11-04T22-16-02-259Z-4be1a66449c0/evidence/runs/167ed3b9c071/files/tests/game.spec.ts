import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
test('offline file supports a keyboard game and reproduction', async ({ page, context }) => {
  await context.route(/^https?:/, route => route.abort());
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs.' })).toBeVisible();
  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Board code').fill('np1-4-1'); await page.getByRole('button',{name:'Load board'}).click();
  const cards = page.locator('.card'); await expect(cards).toHaveCount(16);
  await expect(cards.nth(0)).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(cards.nth(0)).toMatchAriaSnapshot('- button "Row 1, column 1, closed"');
  await expect(page.getByLabel('Grid size')).toHaveRole('combobox'); await expect(page.getByRole('button', {name:'New Game'})).toBeVisible();
  await cards.nth(0).focus(); await page.keyboard.press('ArrowRight'); await expect(cards.nth(1)).toBeFocused();
  for (const [a,b] of [[0,11],[1,9],[2,6],[3,7],[4,5],[8,15],[10,14],[12,13]]) { if (a === undefined || b === undefined) throw new Error(); await cards.nth(a).focus(); await page.keyboard.press('Enter'); await cards.nth(b).focus(); await page.keyboard.press('Space'); }
  await expect(page.getByText('All pairs found!',{exact:true})).toBeVisible();
  await expect(cards.nth(0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, matched');
  await expect(page.locator('[aria-live=polite]')).toContainText('Pair found. All pairs found in 8 moves');
  await expect(page.getByText('8 moves and', {exact:false}).first()).toBeVisible();
  await page.getByRole('button',{name:'Export snapshot'}).click(); await expect(page.getByLabel('Snapshot JSON')).toContainText('"version": 1');
});
test('saved size and paused snapshot on HTTP', async ({ page }) => {
  await page.goto('/'); await page.getByLabel('Grid size').selectOption('6'); await page.reload(); await expect(page.getByLabel('Grid size')).toHaveValue('6');
  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Snapshot JSON').fill('{"version":1,"boardCode":"np1-4-1","matched":[0,11],"selection":{"kind":"mismatch","first":1,"second":2,"remainingMs":300},"moves":2,"elapsedMs":1500,"started":true}');
  await page.getByRole('button',{name:'Load snapshot'}).click(); await expect(page.getByText('Loaded snapshot. Select Resume to continue.').first()).toBeVisible();
  await page.waitForTimeout(400); await expect(page.locator('.card.revealed')).toHaveCount(4);
  await page.getByRole('button',{name:'Resume'}).click(); await expect(page.locator('.card.revealed')).toHaveCount(2);
});

test('large boards remain scrollable with keyboard focus', async ({ page }) => {
  for (const viewport of [{width:360,height:800},{width:1280,height:800},{width:640,height:400}]) {
    await page.setViewportSize(viewport); await page.goto('/'); await page.getByLabel('Grid size').selectOption('16');
    const cards = page.locator('.card'); await expect(cards).toHaveCount(256);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await cards.first().boundingBox(); expect(bounds?.width).toBeGreaterThanOrEqual(44);
    await cards.first().focus(); for (let i=0;i<15;i++) await page.keyboard.press('ArrowDown'); for (let i=0;i<15;i++) await page.keyboard.press('ArrowRight');
    await expect(cards.last()).toBeFocused();
  }
});
