import { expect, test } from '@playwright/test';
import { cards, loadBoard } from './journey.ts';

test('16x16 first and last cards are reachable by touch scrolling on a phone', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true,
    viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await loadBoard(page, 'np1-16-1');
  await cards(page).first().tap();
  const scroll = page.locator('.board-scroll');
  await scroll.scrollIntoViewIfNeeded();
  const bounds = await scroll.boundingBox();
  if (!bounds) throw new Error('Missing scroll area.');
  const cdp = await context.newCDPSession(page);
  async function swipe(from: { x: number; y: number }, to: { x: number; y: number }) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
    for (let step = 1; step <= 8; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
        x: from.x + (to.x - from.x) * step / 8,
        y: from.y + (to.y - from.y) * step / 8,
      }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  for (let repeat = 0; repeat < 3; repeat++) {
    await swipe({ x: bounds.x + bounds.width - 32, y: bounds.y + 100 },
      { x: bounds.x + 32, y: bounds.y + 100 });
  }
  await swipe({ x: bounds.x + 100, y: bounds.y + bounds.height - 32 },
    { x: bounds.x + 100, y: bounds.y + 32 });
  await expect.poll(() => scroll.evaluate(element =>
    element.scrollLeft + element.clientWidth >= element.scrollWidth - 1 &&
    element.scrollTop + element.clientHeight >= element.scrollHeight - 1)).toBe(true);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).last().tap();
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await context.close();
});
