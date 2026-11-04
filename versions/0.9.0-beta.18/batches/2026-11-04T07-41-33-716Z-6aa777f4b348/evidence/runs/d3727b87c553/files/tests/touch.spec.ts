import { expect, test } from '@playwright/test';
import type { CDPSession } from '@playwright/test';
import { cards, loadBoard } from './gameDriver.ts';

async function swipe(client: CDPSession, x: number, y: number, dx: number, dy: number) {
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 10; step += 1) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * step / 10, y: y + dy * step / 10 }] });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('native taps and touch scrolling reach both ends of a large phone board', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/');
  await loadBoard(page, 'np1-16-1');
  await cards(page).nth(0).tap();
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await page.locator('.board-scroll').scrollIntoViewIfNeeded();
  const client = await context.newCDPSession(page);
  const box = await page.locator('.board-scroll').boundingBox();
  if (!box) throw new Error('Missing scroll area');
  const y = Math.max(300, Math.min(box.y + 400, 650));
  for (let pass = 0; pass < 3; pass += 1) await swipe(client, 280, y, -240, 0);
  for (let pass = 0; pass < 2; pass += 1) await swipe(client, 180, y, 0, -240);
  const offsets = await page.locator('.board-scroll').evaluate((element) => ({ x: element.scrollLeft, y: element.scrollTop }));
  expect(offsets.x).toBeGreaterThan(0);
  expect(offsets.y).toBeGreaterThan(0);
  await expect(cards(page).nth(255)).toBeInViewport();
  await cards(page).nth(255).tap();
  const returned = await page.locator('.board-scroll').boundingBox();
  if (!returned) throw new Error('Missing returned scroll area');
  const middle = Math.max(50, Math.min(returned.y + returned.height / 2, 650));
  const top = Math.max(24, returned.y + 24);
  for (let pass = 0; pass < 4; pass += 1) await swipe(client, 40, middle, 240, 0);
  for (let pass = 0; pass < 3; pass += 1) await swipe(client, 180, top, 0, 240);
  await expect(cards(page).nth(0)).toBeInViewport();
  await context.close();
});
