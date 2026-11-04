import { expect, test } from '@playwright/test';
import { card, loadBoard } from './helpers.ts';

test('touch gestures reach both ends of a 16x16 phone board', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/');
  await loadBoard(page, 'np1-16-1');
  await page.locator('.board-scroll').scrollIntoViewIfNeeded();
  const bounds = await page.locator('.board-scroll').boundingBox();
  if (!bounds) throw new Error('Missing board');
  const cdp = await context.newCDPSession(page);
  const center = { x: bounds.x + bounds.width / 2, y: Math.min(600, bounds.y + bounds.height / 2) };
  const swipe = async (dx: number, dy: number) => {
    const x = center.x - dx / 2;
    const y = center.y - dy / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 10; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove',
        touchPoints: [{ x: x + dx * step / 10, y: y + dy * step / 10 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  for (let step = 0; step < 4; step += 1) await swipe(-200, 0);
  for (let step = 0; step < 4; step += 1) await swipe(0, -200);
  await expect.poll(() => page.locator('.board-scroll').evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect.poll(() => page.locator('.board-scroll').evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await card(page, 255).tap();
  await expect(card(page, 255)).toHaveAccessibleName(/revealed$/);
  for (let step = 0; step < 4; step += 1) await swipe(200, 0);
  for (let step = 0; step < 4; step += 1) await swipe(0, 200);
  await expect.poll(() => page.locator('.board-scroll').evaluate((element) => element.scrollLeft)).toBe(0);
  await expect.poll(() => page.locator('.board-scroll').evaluate((element) => element.scrollTop)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
