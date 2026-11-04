import type { Page } from '@playwright/test';

// Real touchStart/move/end sequences exercise the browser's native overflow.
export async function touchBoard(page: Page, axis: 'x' | 'y', towardEnd: boolean): Promise<void> {
  const board = page.locator('.board-scroll');
  await board.scrollIntoViewIfNeeded();
  const client = await page.context().newCDPSession(page);
  for (let swipe = 0; swipe < 5; swipe++) {
    const atEnd = await board.evaluate((node, request) => {
      const current = request.axis === 'x' ? node.scrollLeft : node.scrollTop;
      const maximum = request.axis === 'x' ? node.scrollWidth - node.clientWidth : node.scrollHeight - node.clientHeight;
      return request.towardEnd ? current >= maximum - 1 : current <= 1;
    }, { axis, towardEnd });
    if (atEnd) break;
    const box = await board.boundingBox();
    if (!box) throw new Error('Board lacks layout');
    const low = axis === 'x' ? box.x + 24 : box.y + 24;
    const high = axis === 'x' ? box.x + box.width - 24 : box.y + box.height - 24;
    const start = towardEnd ? high : low;
    const end = towardEnd ? low : high;
    for (let step = 0; step <= 10; step++) {
      const coordinate = start + (end - start) * step / 10;
      await client.send('Input.dispatchTouchEvent', {
        type: step === 0 ? 'touchStart' : 'touchMove',
        touchPoints: [{ x: axis === 'x' ? coordinate : box.x + box.width / 2,
          y: axis === 'y' ? coordinate : box.y + box.height / 2 }],
      });
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(80);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(80);
  }
  await client.detach();
}
