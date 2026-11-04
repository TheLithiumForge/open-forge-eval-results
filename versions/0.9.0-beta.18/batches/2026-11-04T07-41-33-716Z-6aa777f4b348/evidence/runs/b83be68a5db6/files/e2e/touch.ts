import type { BrowserContext, Page } from '@playwright/test';

export async function touchScrollToEnd(page: Page, context: BrowserContext) {
  const board = page.locator('.board-scroll');
  await board.scrollIntoViewIfNeeded();
  const client = await context.newCDPSession(page);
  const bounds = await board.boundingBox();
  if (!bounds) throw new Error('Missing touch scroll area');
  // Separate real touch swipes respect Chromium's directional scroll locking.
  for (const axis of ['x', 'y']) {
    for (let swipe = 0; swipe < 10; swipe++) {
      const done = await board.evaluate((node, direction) => direction === 'x'
        ? node.scrollLeft >= node.scrollWidth - node.clientWidth - 1
        : node.scrollTop >= node.scrollHeight - node.clientHeight - 1, axis);
      if (done) break;
      const start = { x: bounds.x + bounds.width * (axis === 'x' ? 0.85 : 0.5),
        y: bounds.y + bounds.height * (axis === 'y' ? 0.85 : 0.5), id: 1 };
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
      for (let step = 1; step <= 8; step++) {
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...start,
          x: start.x - (axis === 'x' ? bounds.width * 0.7 * step / 8 : 0),
          y: start.y - (axis === 'y' ? bounds.height * 0.7 * step / 8 : 0) }] });
      }
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(50);
    }
  }
  await client.detach();
}
