import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
const pairs = [[0,11],[1,9],[2,6],[3,7],[4,5],[8,15],[10,14],[12,13]];
async function loadBoard(page: import('@playwright/test').Page) {
  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Board code').fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board' }).click();
}
test('offline file, keyboard play and accessibility journey', async ({ page }) => {
  await page.route(/^https?:/, route => route.abort());
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
  await loadBoard(page);
  const cards = page.locator('.card');
  await expect(cards).toHaveCount(16);
  await expect(cards.first()).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(cards.first().locator('svg')).toHaveCount(0);
  await cards.first().focus();
  await page.keyboard.press('Enter');
  await expect(cards.first()).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(cards.first()).toBeFocused();
  let current = 0;
  const visit = async (target: number) => {
    while (Math.floor(current / 4) < Math.floor(target / 4)) { await page.keyboard.press('ArrowDown'); current += 4; }
    while (Math.floor(current / 4) > Math.floor(target / 4)) { await page.keyboard.press('ArrowUp'); current -= 4; }
    while (current % 4 < target % 4) { await page.keyboard.press('ArrowRight'); current++; }
    while (current % 4 > target % 4) { await page.keyboard.press('ArrowLeft'); current--; }
    await page.keyboard.press('Enter');
  };
  const evidence = ['# Chromium accessibility tree evidence', '', 'Initial revealed card:', '```yaml', await page.locator('main').ariaSnapshot(), '```'];
  await visit(11);
  await expect(page.getByRole('status')).toHaveText('Pair found. 1 pair matched.');
  await expect(cards.first()).toHaveAttribute('aria-disabled', 'true');
  evidence.push('', 'First match:', '```yaml', await page.locator('main').ariaSnapshot(), '```');
  for (const [a,b] of pairs.slice(1)) { await visit(a!); await visit(b!); }
  await expect(page.getByText('All pairs found!', { exact: false })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('All pairs found in 8 moves');
  evidence.push('', 'Completed game:', '```yaml', await page.locator('main').ariaSnapshot(), '```');
  writeFileSync('docs/accessibility-evidence.md', evidence.join('\n') + '\n');
  await cards.first().focus(); await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game')).toBeFocused();
  await page.getByRole('button', { name: 'New Game' }).click();
  await expect(page.getByText('Moves: 0')).toBeVisible();
});
test('snapshots, pause, focus, errors and saved records on HTTP', async ({ page }) => {
  await page.goto('/'); await loadBoard(page);
  const cards = page.locator('.card');
  await cards.nth(0).click(); await cards.nth(1).click();
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const snapshot = await page.getByLabel('Snapshot JSON').inputValue();
  expect(JSON.parse(snapshot).selection.kind).toBe('mismatch');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.locator('.status').getByText('Loaded snapshot. Select Resume to continue.')).toBeVisible();
  await cards.nth(2).click(); await expect(page.getByText('Moves: 1')).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(cards.nth(2)).toBeFocused();
  await expect(cards.nth(0)).toHaveAccessibleName('Row 1, column 1, closed', { timeout: 2000 });
  await page.getByLabel('Board code').fill('bad');
  await page.getByRole('button', { name: 'Load board' }).click();
  await expect(page.locator('.status').getByText('Invalid board code.')).toBeVisible();
  await expect(page.getByLabel('Board code')).toHaveValue('bad');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  for (const [a,b] of pairs) { await cards.nth(a!).click(); await cards.nth(b!).click(); }
  await expect(page.getByText('Best: 8')).toBeVisible();
  await page.reload(); await expect(page.getByText('Best: 8')).toBeVisible();
  await page.getByLabel('Grid size').selectOption('6'); await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
});
for (const viewport of [{width:360,height:800},{width:1280,height:800},{width:640,height:400}]) {
  test(`large board and focus at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto('/');
    await page.getByLabel('Grid size').selectOption('16');
    const cards = page.locator('.card'); await expect(cards).toHaveCount(256);
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
    expect((await cards.first().boundingBox())?.width).toBeGreaterThanOrEqual(44);
    await cards.last().focus();
    await expect(cards.last()).toBeFocused();
    const within = await cards.last().evaluate(el => { const card = el.getBoundingClientRect(), board = el.closest('.board-scroll')!.getBoundingClientRect(); return card.left - 5 >= board.left && card.right + 5 <= board.right && card.top - 5 >= board.top && card.bottom + 5 <= board.bottom; });
    expect(within).toBe(true);
  });
}
test('visibility pauses a mismatch and restart invalidates its old timeout', async ({ page }) => {
  await page.goto('/'); await loadBoard(page);
  const cards = page.locator('.card');
  await cards.nth(0).click(); await cards.nth(1).click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(900);
  await expect(cards.nth(0)).toHaveAccessibleName(/revealed/);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(cards.nth(0)).toHaveAccessibleName(/closed/, { timeout: 1500 });
  await cards.nth(0).click(); await cards.nth(1).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await cards.nth(2).click(); await page.waitForTimeout(900);
  await expect(cards.nth(2)).toHaveAccessibleName(/revealed/);
  await expect(page.getByText('Moves: 0')).toBeVisible();
});
test('completed snapshot is static and does not save a best', async ({ page }) => {
  await page.goto('/'); await loadBoard(page);
  const completed = { version:1, boardCode:'np1-4-1', matched:Array.from({length:16}, (_, i) => i), selection:{kind:'closed'}, moves:8, elapsedMs:2000, started:true };
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify(completed));
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.locator('.status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.win')).toBeVisible();
  await expect(page.locator('.win')).not.toHaveClass(/celebrate/);
  await expect(page.getByRole('button', { name:'Resume' })).toHaveCount(0);
  await expect(page.getByText('Best: none')).toBeVisible();
  await page.reload(); await expect(page.getByText('Best: none')).toBeVisible();
});
