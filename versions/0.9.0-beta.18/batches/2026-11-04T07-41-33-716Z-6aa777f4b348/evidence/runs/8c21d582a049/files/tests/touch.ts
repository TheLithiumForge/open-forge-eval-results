import type { CDPSession } from '@playwright/test';

// Real touch samples with a 16ms gesture cadence; no DOM scrolling or wheel fallback.
export async function swipe(client: CDPSession, x: number, y: number, dx: number, dy: number): Promise<void> {
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let sample = 1; sample <= 15; sample++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove',
      touchPoints: [{ x: x + dx * sample / 15, y: y + dy * sample / 15 }] });
    await new Promise<void>(resolve => setTimeout(resolve, 16));
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
