import type { CDPSession, Page } from '@playwright/test';

export async function swipeBoard(page: Page, cdp: CDPSession, axis: 'horizontal' | 'vertical', direction: number): Promise<void> {
  const points = await page.locator('.board-scroll').evaluate((element, gesture) => {
    const rect = element.getBoundingClientRect();
    const left = Math.max(12, rect.left);
    const right = Math.min(innerWidth - 12, rect.right);
    const top = Math.max(12, rect.top);
    const bottom = Math.min(innerHeight - 12, rect.bottom);
    const horizontal = gesture.axis === 'horizontal';
    const start = gesture.direction > 0 ? 0.2 : 0.8;
    const end = gesture.direction > 0 ? 0.8 : 0.2;
    return { x: left + (right - left) * (horizontal ? start : 0.5),
      y: top + (bottom - top) * (horizontal ? 0.5 : start),
      endX: left + (right - left) * (horizontal ? end : 0.5),
      endY: top + (bottom - top) * (horizontal ? 0.5 : end) };
  }, { axis, direction });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points.x, y: points.y, id: 1 }] });
  for (let step = 1; step <= 12; step++) {
    const x = points.x + (points.endX - points.x) * step / 12;
    const y = points.y + (points.endY - points.y) * step / 12;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(100);
}
