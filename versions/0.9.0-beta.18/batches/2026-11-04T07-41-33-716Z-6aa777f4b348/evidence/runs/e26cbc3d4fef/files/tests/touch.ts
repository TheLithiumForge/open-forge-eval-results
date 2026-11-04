import type { CDPSession, Page } from '@playwright/test';

export async function swipe(page: Page, client: CDPSession,
  from: readonly [number, number], to: readonly [number, number]): Promise<void> {
  const points = (x: number, y: number) => [{ x, y, id: 1, radiusX: 1, radiusY: 1, force: 1 }];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(from[0], from[1]) });
  for (let step = 1; step <= 12; step += 1) {
    const ratio = step / 12;
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(
      from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio) });
    await page.waitForTimeout(16); // Deliver separate native touch frames, rather than coalesced moves.
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
