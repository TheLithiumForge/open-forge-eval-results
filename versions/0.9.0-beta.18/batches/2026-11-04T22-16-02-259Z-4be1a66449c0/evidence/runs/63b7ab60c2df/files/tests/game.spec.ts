import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const deck = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
async function loadBoard(page: import('@playwright/test').Page) { await page.getByText('Reproduce a game').click(); await page.getByLabel('Board code').fill('np1-4-1'); await page.getByRole('button', { name: 'Load board' }).click(); }
test('offline file, keyboard journey, accessible names and completion', async ({ page, context }) => {
  await context.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());
  await page.goto(pathToFileURL(resolve('dist/index.html')).href); await loadBoard(page);
  const cards = page.locator('.card'); await expect(cards).toHaveCount(16); await expect(cards.first()).toHaveAccessibleName('Row 1, column 1, closed'); await expect(cards.first().locator('svg')).toHaveCount(0);
  await cards.first().focus(); await page.keyboard.press('Enter'); await expect(cards.first()).toHaveAccessibleName(/cyan solid plus, marker top/);
  await page.keyboard.press('ArrowRight'); await expect(cards.nth(1)).toBeFocused(); await page.keyboard.press('ArrowLeft'); await expect(cards.first()).toBeFocused();
  await cards.nth(11).click(); await expect(page.getByText('Pair found. 1 pair matched.')).toBeAttached(); await expect(cards.first()).toHaveAttribute('aria-disabled', 'true');
  for (let face = 0; face < 8; face++) { if (face === 6) continue; const indices = deck.flatMap((n, i) => n === face ? [i] : []); await cards.nth(indices[0]!).click(); await cards.nth(indices[1]!).click(); }
  await expect(page.getByText('All pairs found!', { exact: false }).first()).toBeVisible(); await expect(page.getByText('Moves: 8')).toBeVisible(); await expect(page.locator('[aria-live="polite"]')).toContainText('All pairs found in 8 moves');
});
test('snapshot pause, resume, invalid input and persistence over HTTP', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173'); await loadBoard(page);
  const snapshot = { version: 1, boardCode: 'np1-4-1', matched: [0,11], selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 }, moves: 2, elapsedMs: 1500, started: true };
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify(snapshot)); await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.locator('.load-status')).toBeVisible(); await page.waitForTimeout(400); await expect(page.locator('.card.revealed')).toHaveCount(4);
  await page.getByRole('button', { name: 'Resume' }).click(); await expect(page.locator('.card.revealed')).toHaveCount(2); await expect(page.locator('.card').first()).toBeFocused();
  await page.getByLabel('Board code').fill('bad'); await page.getByRole('button', { name: 'Load board' }).click(); await expect(page.locator('.load-status')).toBeVisible(); await expect(page.getByText('Moves: 2')).toBeVisible();
  await page.getByLabel('Grid size').selectOption('6'); await page.reload(); await expect(page.getByLabel('Grid size')).toHaveValue('6');
});
test('large board stays within viewport and uses scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 }); await page.goto('http://127.0.0.1:4173'); await page.getByLabel('Grid size').selectOption('16');
  await expect(page.locator('.card')).toHaveCount(256); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const card = page.locator('.card').last(); await card.focus(); const box = await card.boundingBox(); expect(box?.width).toBeGreaterThanOrEqual(44);
});
test('keyboard accessibility journey and persisted best', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173'); await loadBoard(page);
  const cards = page.locator('.card');
  const before = await page.locator('main').ariaSnapshot();
  expect(before).toContain('combobox "Grid size"'); expect(before).toContain('button "New Game"'); expect(before).toContain('button "Row 1, column 1, closed"');
  await cards.first().focus(); let current = 0;
  async function navigate(index: number) {
    while (Math.floor(current / 4) < Math.floor(index / 4)) { await page.keyboard.press('ArrowDown'); current += 4; }
    while (Math.floor(current / 4) > Math.floor(index / 4)) { await page.keyboard.press('ArrowUp'); current -= 4; }
    while (current % 4 < index % 4) { await page.keyboard.press('ArrowRight'); current++; }
    while (current % 4 > index % 4) { await page.keyboard.press('ArrowLeft'); current--; }
    await page.keyboard.press('Enter');
  }
  await navigate(0); expect(await cards.first().ariaSnapshot()).toContain('cyan solid plus, marker top, revealed');
  await navigate(11); expect(await page.locator('[aria-live="polite"]').ariaSnapshot()).toContain('Pair found. 1 pair matched.');
  for (let face = 0; face < 8; face++) { if (face === 6) continue; const indices = deck.flatMap((n, i) => n === face ? [i] : []); await navigate(indices[0]!); await navigate(indices[1]!); }
  expect(await page.locator('main').ariaSnapshot()).toContain('All pairs found!'); await expect(page.getByText('Best: 8')).toBeVisible();
  await page.keyboard.press('Tab'); await expect(cards.nth(current)).not.toBeFocused();
  await page.reload(); await expect(page.getByText('Best: 8')).toBeVisible();
  await page.getByRole('button', { name: 'New Game' }).focus(); await page.keyboard.press('Enter'); await expect(page.getByText('Moves: 0')).toBeVisible();
});
test('completed snapshot does not write a best or animate', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173'); await page.evaluate(() => localStorage.setItem('neon-pairs-bests', JSON.stringify({ 4: 20 }))); await page.reload(); await loadBoard(page);
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: Array.from({ length: 16 }, (_, i) => i), selection: { kind: 'closed' }, moves: 8, elapsedMs: 10000, started: true }));
  await page.getByRole('button', { name: 'Load snapshot' }).click(); await expect(page.locator('.load-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByText('Best: 20')).toBeVisible(); await expect(page.locator('.win')).not.toHaveClass(/celebrate/); await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await page.reload(); await expect(page.getByText('Best: 20')).toBeVisible();
});
test('mismatch pauses while hidden and restart invalidates its pending time', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173'); await loadBoard(page); const cards = page.locator('.card');
  await cards.nth(0).click(); await cards.nth(1).click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(900); await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await cards.nth(0).click(); await cards.nth(1).click(); await page.getByRole('button', { name: 'Restart' }).click(); await cards.nth(2).click();
  await page.waitForTimeout(900); await expect(cards.nth(2)).toHaveAccessibleName(/revealed/); await expect(page.getByText('Moves: 0')).toBeVisible();
});
for (const viewport of [{ width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test(`large board remains usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto('http://127.0.0.1:4173'); await page.getByLabel('Grid size').selectOption('16');
    const last = page.locator('.card').last(); await last.focus();
    const geometry = await last.evaluate(element => { const card = element.getBoundingClientRect(); const scroller = element.closest('.board-scroll')?.getBoundingClientRect(); return { card: { left: card.left, right: card.right, top: card.top, bottom: card.bottom, width: card.width }, scroller: scroller ? { left: scroller.left, right: scroller.right, top: scroller.top, bottom: scroller.bottom } : null, pageWidth: document.documentElement.scrollWidth }; });
    expect(geometry.pageWidth).toBeLessThanOrEqual(viewport.width); expect(geometry.card.width).toBeGreaterThanOrEqual(44); expect(geometry.scroller).not.toBeNull();
    if (geometry.scroller) { expect(geometry.card.left - geometry.scroller.left).toBeGreaterThanOrEqual(5); expect(geometry.scroller.right - geometry.card.right).toBeGreaterThanOrEqual(5); expect(geometry.card.top - geometry.scroller.top).toBeGreaterThanOrEqual(5); expect(geometry.scroller.bottom - geometry.card.bottom).toBeGreaterThanOrEqual(5); }
  });
}
