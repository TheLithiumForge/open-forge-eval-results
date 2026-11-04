import type { CDPSession, Page } from '@playwright/test';

interface Point { x: number; y: number }

export async function swipe(page: Page, client: CDPSession, start: Point, end: Point): Promise<void> {
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
  for (let step = 1; step <= 12; step += 1) {
    const x = start.x + (end.x - start.x) * step / 12;
    const y = start.y + (end.y - start.y) * step / 12;
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
    await page.waitForTimeout(16);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
