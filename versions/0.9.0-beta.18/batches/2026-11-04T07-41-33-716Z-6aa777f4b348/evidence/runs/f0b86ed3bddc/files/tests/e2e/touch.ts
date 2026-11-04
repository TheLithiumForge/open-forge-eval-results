import { setTimeout as sampleDelay } from 'node:timers/promises';
import type { CDPSession, Page } from '@playwright/test';

export async function touchScroll(page: Page, client: CDPSession, toEnd: boolean): Promise<void> {
  const area = page.locator('.board-scroll');
  await area.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
  for (const axis of ['vertical', 'horizontal'] as const) {
    for (let swipe = 0; swipe < 8; swipe++) {
      const remaining = await area.evaluate((element, direction) => {
        const max = direction.axis === 'vertical' ? element.scrollHeight - element.clientHeight : element.scrollWidth - element.clientWidth;
        const current = direction.axis === 'vertical' ? element.scrollTop : element.scrollLeft;
        return direction.toEnd ? max - current : current;
      }, { axis, toEnd });
      if (remaining <= 1) break;
      const rect = await area.boundingBox();
      const viewport = page.viewportSize();
      if (!rect || !viewport) throw new Error('Missing touch viewport');
      const left = Math.max(rect.x, 0) + 24;
      const right = Math.min(rect.x + rect.width, viewport.width) - 24;
      const top = Math.max(rect.y, 0) + 24;
      const bottom = Math.min(rect.y + rect.height, viewport.height) - 24;
      const start = axis === 'vertical'
        ? { x: (left + right) / 2, y: toEnd ? bottom : top }
        : { x: toEnd ? right : left, y: (top + bottom) / 2 };
      const end = axis === 'vertical'
        ? { ...start, y: toEnd ? top : bottom } : { ...start, x: toEnd ? left : right };
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
      for (let step = 1; step <= 12; step++) {
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
          x: start.x + (end.x - start.x) * step / 12,
          y: start.y + (end.y - start.y) * step / 12,
        }] });
        // Sample a real touch drag across animation frames, rather than teleporting its endpoints.
        await sampleDelay(16);
      }
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
  }
}
