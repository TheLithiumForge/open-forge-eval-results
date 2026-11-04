import { expect, test } from '@playwright/test';
import { cards, loadBoard, loadSnapshot, snapshot } from './gameFixtures.ts';
import { checkFocusedCard, checkPageWidth } from './layoutChecks.ts';

for (const viewport of [{ width: 360, height: 800, scale: 1 }, { width: 1280, height: 800, scale: 1 }, { width: 640, height: 400, scale: 2 }]) {
  test(`square cards, internal scrolling and complete focus outlines at ${viewport.width}x${viewport.height} scale ${viewport.scale}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.scale });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173');
    await loadBoard(page);
    await checkPageWidth(page);
    await checkFocusedCard(page, 5);
    const smallScroll = await page.locator('.board-scroll').evaluate(element => element.scrollWidth <= element.clientWidth);
    expect(smallScroll).toBe(true);
    await loadBoard(page, 'np1-16-1');
    await expect(cards(page)).toHaveCount(256);
    await checkPageWidth(page);
    for (const index of [0, 136, 255]) await checkFocusedCard(page, index);
    const metrics = await page.locator('.board-scroll').evaluate(element => ({
      height: element.getBoundingClientRect().height, padding: getComputedStyle(element).padding,
      overflowX: getComputedStyle(element).overflowX, overflowY: getComputedStyle(element).overflowY,
    }));
    expect(metrics.height).toBeLessThanOrEqual(Math.min(viewport.height * 0.7, 768));
    expect(metrics.padding).toBe('6px');
    expect(metrics.overflowX).toBe('auto');
    expect(metrics.overflowY).toBe('auto');
    for (const name of ['New Game', 'Restart']) {
      const control = page.getByRole('button', { name, exact: true });
      await control.scrollIntoViewIfNeeded();
      await expect(control).toBeInViewport();
    }
    await page.getByLabel('Grid size').selectOption('4');
    await loadSnapshot(page, snapshot());
    await page.locator('.win-banner').scrollIntoViewIfNeeded();
    await expect(page.locator('.win-banner')).toBeInViewport();
    await checkPageWidth(page);
    await context.close();
  });
}

test('touch scrolling reaches the last card and returns to the first on a phone', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await loadBoard(page, 'np1-16-1');
  await page.locator('.board-scroll').scrollIntoViewIfNeeded();
  const cdp = await context.newCDPSession(page);
  const swipe = async (reverse: boolean) => {
    for (const horizontal of [true, true, false]) {
      const bounds = await page.locator('.board-scroll').boundingBox();
      if (!bounds) throw new Error('No scroll area.');
      const left = bounds.x + 24;
      const right = bounds.x + bounds.width - 24;
      const top = Math.max(24, bounds.y + 24);
      const bottom = Math.min(740, bounds.y + bounds.height - 24);
      const startX = horizontal ? (reverse ? left : right) : bounds.x + bounds.width / 2;
      const endX = horizontal ? (reverse ? right : left) : startX;
      const startY = horizontal ? bounds.y + 200 : (reverse ? top : bottom);
      const endY = horizontal ? startY : (reverse ? bottom : top);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: startY }] });
      for (let step = 1; step <= 20; step += 1) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
          x: startX + (endX - startX) * step / 20, y: startY + (endY - startY) * step / 20,
        }] });
        await page.waitForTimeout(20);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(200);
    }
  };
  await swipe(false);
  await expect.poll(() => page.locator('.board-scroll').evaluate(element =>
    Math.abs(element.scrollLeft - (element.scrollWidth - element.clientWidth)) < 1 &&
    Math.abs(element.scrollTop - (element.scrollHeight - element.clientHeight)) < 1)).toBe(true);
  await cards(page).nth(255).tap();
  await expect(cards(page).nth(255)).toHaveAccessibleName(/revealed$/);
  await swipe(true);
  await expect.poll(() => page.locator('.board-scroll').evaluate(element => element.scrollLeft)).toBe(0);
  await cards(page).nth(0).tap();
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await context.close();
});
