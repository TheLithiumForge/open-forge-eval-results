import { expect, test } from '@playwright/test';

const BASE = 'http://127.0.0.1:4173';

function card(page: import('@playwright/test').Page, index: number, size: number) {
  const row = Math.floor(index / size) + 1;
  const column = index % size + 1;
  return page.getByRole('button', { name: new RegExp(`^Row ${row}, column ${column}, `) });
}

test('large boards fit the stated viewports and remain keyboard reachable at zoom', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
  await page.goto(BASE);
  await page.getByLabel('Grid size').selectOption('16');
  const first = page.locator('.board-grid > button').first();
  const last = page.locator('.board-grid > button').last();
  const mobile = await page.evaluate<{ width: number; contentWidth: number } | null>(`(() => {
    const area = document.querySelector('.board-scroll');
    return area ? { width: area.clientWidth, contentWidth: area.scrollWidth } : null;
  })()`);
  if (!mobile) throw new Error('The mobile board scroll area is missing.');
  expect(mobile.contentWidth).toBeGreaterThan(mobile.width);
  expect((await first.boundingBox())?.width).toBeGreaterThanOrEqual(44);
  await first.focus();
  for (let step = 0; step < 15; step += 1) await page.keyboard.press('ArrowDown');
  for (let step = 0; step < 15; step += 1) await page.keyboard.press('ArrowRight');
  await expect(last).toBeFocused();
  const bounds = await page.evaluate<{ left: number; right: number; top: number; bottom: number; area: { left: number; right: number; top: number; bottom: number } } | null>(`(() => {
    const target = document.querySelector('.board-grid > button:last-child');
    const area = document.querySelector('.board-scroll');
    if (!target || !area) return null;
    const cardRect = target.getBoundingClientRect();
    const areaRect = area.getBoundingClientRect();
    return { left: cardRect.left - 5, right: cardRect.right + 5, top: cardRect.top - 5, bottom: cardRect.bottom + 5, area: areaRect.toJSON() };
  })()`);
  if (!bounds) throw new Error('The focused card or board scroll area is missing.');
  expect(bounds.left).toBeGreaterThanOrEqual(bounds.area.left);
  expect(bounds.right).toBeLessThanOrEqual(bounds.area.right);
  expect(bounds.top).toBeGreaterThanOrEqual(bounds.area.top);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.area.bottom);
  await last.click();
  expect(await page.evaluate<number>(`document.querySelector('.board-scroll')?.scrollLeft ?? 0`)).toBeGreaterThan(0);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('.board-grid > button')).toHaveCount(256);
  expect(await page.evaluate<number>('document.documentElement.scrollWidth')).toBeLessThanOrEqual(1280);
  expect((await first.boundingBox())?.width).toBeLessThanOrEqual(88);
  await page.close();

  const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  const zoom = await context.newPage();
  await zoom.goto(BASE);
  expect(await zoom.evaluate<number>('window.devicePixelRatio')).toBe(2);
  await zoom.getByText('Reproduce a game').click();
  const completed = JSON.stringify({ version: 1, boardCode: 'np1-4-1', matched: Array.from({ length: 16 }, (_, index) => index), selection: { kind: 'closed' }, moves: 8, elapsedMs: 9000, started: true });
  await zoom.getByLabel('Snapshot JSON').fill(completed);
  await zoom.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(zoom.getByRole('heading', { name: 'Beautifully done.' })).toBeVisible();
  await zoom.getByRole('button', { name: 'New Game' }).click();
  await zoom.locator('.board-grid > button').first().click();
  await expect(card(zoom, 0, 4)).toHaveAttribute('aria-label', /revealed/);
  await zoom.keyboard.press('ArrowRight');
  await expect(card(zoom, 1, 4)).toBeFocused();
  await zoom.keyboard.press('Space');
  await expect(zoom.getByText('Moves: 1')).toBeVisible();
  await zoom.getByLabel('Grid size').selectOption('16');
  const metrics = await zoom.evaluate<{ width: number; contentWidth: number } | null>(`(() => {
    const area = document.querySelector('.board-scroll');
    return area ? { width: area.clientWidth, contentWidth: area.scrollWidth } : null;
  })()`);
  if (!metrics) throw new Error('The zoomed board scroll area is missing.');
  expect(metrics.contentWidth).toBeGreaterThan(metrics.width);
  expect(await zoom.evaluate<number>('document.documentElement.scrollWidth')).toBeLessThanOrEqual(640);
  await expect(zoom.getByRole('button', { name: 'New Game' })).toBeVisible();
  const zoomFirst = zoom.locator('.board-grid > button').first();
  const zoomLast = zoom.locator('.board-grid > button').last();
  await zoomFirst.focus();
  for (let step = 0; step < 15; step += 1) await zoom.keyboard.press('ArrowDown');
  for (let step = 0; step < 15; step += 1) await zoom.keyboard.press('ArrowRight');
  await expect(zoomLast).toBeFocused();
  await zoomLast.click();
  await expect(card(zoom, 255, 16)).toHaveAttribute('aria-label', /revealed/);
  await context.close();
});
