import { expect, test } from '@playwright/test';
import type { CDPSession } from '@playwright/test';
import { loadBoard } from './helpers.ts';

test('a touch swipe scrolls in both directions to the last 16 by 16 phone card', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await loadBoard(page, 'np1-16-1');
    const areaLocator = page.locator('.board-scroll-area');
    await areaLocator.scrollIntoViewIfNeeded();
    const area = await areaLocator.boundingBox();
    if (area === null) throw new Error('Scroll area is not visible');
    const session = await context.newCDPSession(page);
    const viewport = page.viewportSize();
    if (viewport === null) throw new Error('Touch viewport is not available');
    const startY = Math.min(area.y + 200, viewport.height - 40);
    for (let count = 0; count < 2; count += 1) {
      await touchSwipe(session, area.x + area.width / 2, startY, 0, -180);
    }
    for (let count = 0; count < 3; count += 1) {
      const currentArea = await areaLocator.boundingBox();
      if (currentArea === null) throw new Error('Scroll area is no longer visible');
      const x = Math.min(currentArea.x + currentArea.width - 24, viewport.width - 30);
      const y = Math.min(currentArea.y + 150, viewport.height - 30);
      await touchSwipe(session, x, y, -180, 0);
    }
    await session.detach();
    const scroll = await areaLocator.evaluate((element) => ({ top: element.scrollTop, left: element.scrollLeft }));
    expect(scroll.top).toBeGreaterThan(0);
    expect(scroll.left).toBeGreaterThan(0);
    const lastCard = page.locator('.board-card').nth(255);
    await expect(lastCard).toBeInViewport();
    await lastCard.tap();
    await expect(lastCard).toHaveAttribute('data-state', 'revealed');
  } finally {
    await context.close();
  }
});

async function touchSwipe(
  session: CDPSession,
  startX: number,
  startY: number,
  deltaX: number,
  deltaY: number
): Promise<void> {
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: startY }] });
  for (let step = 1; step <= 8; step += 1) {
    const progress = step / 8;
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: startX + deltaX * progress, y: startY + deltaY * progress }]
    });
    await new Promise<void>((resolveWait) => setTimeout(resolveWait, 16));
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
