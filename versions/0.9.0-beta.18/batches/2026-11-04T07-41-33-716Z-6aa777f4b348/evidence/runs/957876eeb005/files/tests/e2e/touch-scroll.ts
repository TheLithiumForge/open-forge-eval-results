import { expect } from '@playwright/test';
import type { CDPSession, Page } from '@playwright/test';

async function swipe(page: Page, client: CDPSession, horizontal: boolean, forward: boolean): Promise<void> {
  const bounds = await page.getByRole('region', { name: 'Card board' }).boundingBox();
  if (bounds === null) throw new Error('Missing board bounds');
  const distance = Math.min(horizontal ? bounds.width : bounds.height, 240) - 64;
  const direction = forward ? -1 : 1;
  const x = bounds.x + (horizontal ? forward ? bounds.width - 32 : 32 : bounds.width / 2);
  const y = bounds.y + (horizontal ? bounds.height / 2 : forward ? bounds.height - 32 : 32);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 8; step += 1) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
      x: x + (horizontal ? direction * distance * step / 8 : 0),
      y: y + (horizontal ? 0 : direction * distance * step / 8),
    }] });
    await page.waitForTimeout(16);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

export async function touchScrollToEdge(page: Page, forward: boolean): Promise<void> {
  const client = await page.context().newCDPSession(page);
  const board = page.getByRole('region', { name: 'Card board' });
  await board.scrollIntoViewIfNeeded();
  for (const horizontal of [true, false]) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const remaining = await board.evaluate((element, { horizontal, forward }) => {
        const position = horizontal ? element.scrollLeft : element.scrollTop;
        const maximum = horizontal ? element.scrollWidth - element.clientWidth : element.scrollHeight - element.clientHeight;
        return forward ? maximum - position : position;
      }, { horizontal, forward });
      if (remaining <= 1) break;
      await swipe(page, client, horizontal, forward);
      await page.waitForTimeout(100);
    }
    const remaining = await board.evaluate((element, { horizontal, forward }) => {
      const position = horizontal ? element.scrollLeft : element.scrollTop;
      const maximum = horizontal ? element.scrollWidth - element.clientWidth : element.scrollHeight - element.clientHeight;
      return forward ? maximum - position : position;
    }, { horizontal, forward });
    expect(remaining).toBeLessThanOrEqual(1);
  }
  await client.detach();
}
