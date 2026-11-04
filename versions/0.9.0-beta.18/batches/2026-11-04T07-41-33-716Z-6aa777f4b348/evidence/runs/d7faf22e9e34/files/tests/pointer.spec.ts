import { expect, test } from '@playwright/test';
import { loadBoard, start } from './helpers.ts';

test.use({ hasTouch: true });

test('hover, cancellation and native context menu do not activate; click and tap share the turn', async ({ page }) => {
  await start(page);
  await loadBoard(page);
  const first = page.locator('.card').first();
  await first.hover();
  await first.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch' });
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await expect(first).toHaveAccessibleName('Row 1, column 1, closed');
  const menu = await first.evaluateHandle((element) => {
    const result = { seen: false, prevented: true };
    element.addEventListener('contextmenu', (event) => {
      result.seen = true; result.prevented = event.defaultPrevented;
    });
    return result;
  });
  await first.click({ button: 'right' });
  await page.keyboard.press('Escape');
  expect(await menu.jsonValue()).toEqual({ seen: true, prevented: false });
  await expect(first).toHaveAccessibleName('Row 1, column 1, closed');
  await first.click();
  await expect(first).toHaveAccessibleName(/revealed$/);
  await page.locator('.card').nth(11).tap();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await first.focus();
  await page.keyboard.press('Space');
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
});

test('native touch scrolling reaches both ends of a 16x16 phone board', async ({ page, context }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await start(page);
  await loadBoard(page, 'np1-16-1');
  const board = page.locator('.board-scroll');
  await board.scrollIntoViewIfNeeded();
  const box = await board.boundingBox();
  if (!box) throw new Error('Missing board');
  const protocol = await context.newCDPSession(page);
  const ends = await board.evaluate((element) => ({ left: element.scrollWidth - element.clientWidth,
    top: element.scrollHeight - element.clientHeight }));
  for (const direction of [-1, 1]) {
    for (const axis of ['x', 'y']) for (let swipe = 0; swipe < 3; swipe += 1) {
      const x = axis === 'x' ? box.x + (direction === -1 ? box.width - 24 : 24) : box.x + box.width / 2;
      const y = axis === 'y' ? box.y + (direction === -1 ? box.height - 24 : 24) : box.y + box.height / 2;
      const distance = axis === 'x' ? box.width - 48 : box.height - 48;
      await protocol.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      for (let step = 1; step <= 10; step += 1) {
        await protocol.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
          x: x + (axis === 'x' ? direction * distance * step / 10 : 0),
          y: y + (axis === 'y' ? direction * distance * step / 10 : 0), id: 1 }] });
      }
      await protocol.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await expect.poll(() => board.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop })))
      .toEqual(direction === -1 ? ends : { left: 0, top: 0 });
    const card = page.locator('.card').nth(direction === -1 ? 255 : 0);
    await expect(card).toBeInViewport({ ratio: 1 });
    await card.tap();
  }
  await protocol.detach();
});
