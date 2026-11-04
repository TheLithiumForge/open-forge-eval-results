import { expect, test } from '@playwright/test';
import { cards, loadBoard } from './helpers.ts';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } });

test('completed taps activate once and large boards scroll to their final card', async ({ page, context }) => {
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).tap();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(11).tap();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await loadBoard(page, 'np1-16-1');
  await page.locator('.board-scroll').scrollIntoViewIfNeeded();
  const area = await page.locator('.board-scroll').boundingBox();
  if (!area) throw new Error('Missing board bounds');
  const client = await context.newCDPSession(page);
  for (let swipe = 0; swipe < 4; swipe++) {
    const startX = area.x + area.width - 32;
    const startY = Math.min(area.y + area.height - 32, 740);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: startY }] });
    for (let step = 1; step <= 6; step++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
        x: startX - step * 32, y: startY - step * 32 }] });
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await expect.poll(() => page.locator('.board-scroll').evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
  await cards(page).last().tap();
  await expect(cards(page).last()).toHaveAccessibleName(/revealed$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
