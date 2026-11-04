import { expect, test } from '@playwright/test';
import { cards, loadBoard, openGame } from './support.ts';

test.use({ hasTouch: true });
for (const width of [360, 1280]) {
  test(`touch scrolling reaches both ends of the 16x16 board at width ${width}`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 800 });
    await openGame(page);
    await loadBoard(page, 'np1-16-1');
    const area = page.locator('.board-scroll');
    await area.scrollIntoViewIfNeeded();
    const session = await context.newCDPSession(page);
    const moveToEnd = async (forward: boolean) => {
      for (const axis of ['x', 'y'] as const) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const remaining = await area.evaluate((element, { axis, forward }) => {
            const position = axis === 'x' ? element.scrollLeft : element.scrollTop;
            const maximum = axis === 'x' ? element.scrollWidth - element.clientWidth
              : element.scrollHeight - element.clientHeight;
            return forward ? maximum - position : position;
          }, { axis, forward });
          if (remaining <= 1) break;
          const rect = await area.boundingBox();
          if (rect === null) throw new Error('Missing scroll area.');
          const start = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          const end = { ...start };
          if (axis === 'x') {
            start.x = rect.x + (forward ? rect.width - 32 : 32);
            end.x = rect.x + (forward ? 32 : rect.width - 32);
          } else {
            start.y = rect.y + (forward ? rect.height - 32 : 32);
            end.y = rect.y + (forward ? 32 : rect.height - 32);
          }
          await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
          for (let step = 1; step <= 10; step += 1) {
            await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
              x: start.x + (end.x - start.x) * step / 10, y: start.y + (end.y - start.y) * step / 10,
            }] });
            await page.waitForTimeout(16);
          }
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await page.waitForTimeout(100);
        }
      }
      const offsets = await area.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop,
        maxLeft: element.scrollWidth - element.clientWidth, maxTop: element.scrollHeight - element.clientHeight }));
      expect(offsets.left).toBeCloseTo(forward ? offsets.maxLeft : 0, 0);
      expect(offsets.top).toBeCloseTo(forward ? offsets.maxTop : 0, 0);
    };
    await moveToEnd(true);
    await expect(cards(page).last()).toBeInViewport({ ratio: 1 });
    await moveToEnd(false);
    await expect(cards(page).first()).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth)).toBe(true);
    await session.detach();
  });
}
