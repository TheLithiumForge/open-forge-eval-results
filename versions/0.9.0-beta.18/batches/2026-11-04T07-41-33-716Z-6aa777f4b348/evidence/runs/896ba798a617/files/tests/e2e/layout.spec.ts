import type { CDPSession, Page } from '@playwright/test';
import { test, expect, cards, loadBoard, loadSnapshot, almostWon, finishLastPair } from './game.ts';

async function expectOutlineInsideBoard(page: Page) {
  const geometry = await page.locator('.board-scroll').evaluate((scroll) => {
    const button = scroll.querySelector('button:focus');
    if (!button) throw new Error('No card focused');
    const outer = scroll.getBoundingClientRect();
    const card = button.getBoundingClientRect();
    return { left: card.left - outer.left, top: card.top - outer.top,
      right: outer.left + scroll.clientWidth - card.right,
      bottom: outer.top + scroll.clientHeight - card.bottom,
      outline: getComputedStyle(button).outlineWidth,
      offset: getComputedStyle(button).outlineOffset,
      margin: getComputedStyle(button).scrollMargin };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(5);
  expect(geometry.top).toBeGreaterThanOrEqual(5);
  expect(geometry.right).toBeGreaterThanOrEqual(5);
  expect(geometry.bottom).toBeGreaterThanOrEqual(5);
  expect(geometry.outline).toBe('3px');
  expect(geometry.offset).toBe('2px');
  expect(geometry.margin).toBe('6px');
}


async function touchScroll(page: Page, cdp: CDPSession, axis: 'x' | 'y', forward: boolean) {
  const area = page.locator('.board-scroll');
  for (let swipe = 0; swipe < 12; swipe += 1) {
    const position = await area.evaluate((element, axis) => ({
      current: axis === 'x' ? element.scrollLeft : element.scrollTop,
      maximum: axis === 'x' ? element.scrollWidth - element.clientWidth : element.scrollHeight - element.clientHeight,
    }), axis);
    if (forward ? position.current >= position.maximum - 1 : position.current <= 1) break;
    const rect = await area.boundingBox();
    if (!rect) throw new Error('Missing touch scroll area');
    const distance = Math.min((axis === 'x' ? rect.width : rect.height) - 64, 240);
    const direction = forward ? -1 : 1;
    const startX = axis === 'x' ? rect.x + (forward ? rect.width - 32 : 32) : rect.x + rect.width / 2;
    const startY = axis === 'y' ? rect.y + (forward ? rect.height - 32 : 32) : rect.y + rect.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: startY }] });
    for (let step = 1; step <= 8; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
        x: startX + (axis === 'x' ? direction * distance * step / 8 : 0),
        y: startY + (axis === 'y' ? direction * distance * step / 8 : 0),
      }] });
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(100);
  }
}

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test(`16x16 bounds, scrolling and focus at ${viewport.width}x${viewport.height}`, async ({ browser }, info) => {
    const context = await browser.newContext({ viewport, hasTouch: true, deviceScaleFactor: viewport.width === 640 ? 2 : 1 });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await loadBoard(page, 'np1-16-1');
    await expect(cards(page)).toHaveCount(256);
    const sizes = await cards(page).evaluateAll((elements) => elements.map((e) => {
      const rect = e.getBoundingClientRect(); return { width: rect.width, height: rect.height };
    }));
    expect(sizes.every((s) => s.width >= 44 && s.width <= 88 && Math.abs(s.width - s.height) < 0.1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.board-scroll').evaluate((e) => e.clientHeight <= Math.min(innerHeight * 0.7, 768))).toBe(true);
    await page.getByRole('button', { name: 'Restart', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(cards(page).nth(0)).toBeFocused();
    await expectOutlineInsideBoard(page);
    for (let i = 0; i < 8; i += 1) await page.keyboard.press('ArrowDown');
    for (let i = 0; i < 8; i += 1) await page.keyboard.press('ArrowRight');
    await expect(cards(page).nth(136)).toBeFocused();
    await expectOutlineInsideBoard(page);
    for (let i = 0; i < 7; i += 1) await page.keyboard.press('ArrowDown');
    for (let i = 0; i < 7; i += 1) await page.keyboard.press('ArrowRight');
    await expect(cards(page).nth(255)).toBeFocused();
    await expectOutlineInsideBoard(page);
    await page.keyboard.press('Enter');
    await expect(cards(page).nth(255)).toHaveAccessibleName(/revealed$/);
    // Real touchStart/move/end swipes; Chromium locks each swipe to one axis.
    const cdp = await context.newCDPSession(page);
    await page.locator('.board-scroll').evaluate((e) => { e.scrollTo(0, 0); e.scrollIntoView({ block: 'center' }); });
    await touchScroll(page, cdp, 'y', true);
    await touchScroll(page, cdp, 'x', true);
    await expect.poll(() => page.locator('.board-scroll').evaluate((e) => e.scrollTop > 0)).toBe(true);
    const last = await cards(page).nth(255).boundingBox();
    const area = await page.locator('.board-scroll').boundingBox();
    if (!last || !area) throw new Error('Missing touch bounds');
    expect(last.x + last.width).toBeLessThanOrEqual(area.x + area.width);
    expect(last.y + last.height).toBeLessThanOrEqual(area.y + area.height);
    await cards(page).nth(255).tap();
    await touchScroll(page, cdp, 'y', false);
    await touchScroll(page, cdp, 'x', false);
    await expect.poll(() => page.locator('.board-scroll').evaluate((e) => e.scrollTop)).toBe(0);
    await cards(page).nth(0).tap();
    await page.getByRole('button', { name: 'New Game', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
    await page.screenshot({ path: `artifacts/board-${viewport.width}x${viewport.height}.png`, fullPage: true });
    await info.attach('board-layout', { path: `artifacts/board-${viewport.width}x${viewport.height}.png`, contentType: 'image/png' });
    await context.close();
  });
}

test('equivalent 200% zoom keeps 4x4 controls, status and win readable with reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await cards(page).nth(2).focus();
  await page.keyboard.press('Enter');
  await expectOutlineInsideBoard(page);
  expect(await cards(page).nth(0).evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0s');
  await loadSnapshot(page, almostWon(7, 3600000));
  await finishLastPair(page);
  expect(await page.locator('.win-banner').evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  await expect(page.locator('.win-banner')).toContainText('8 moves and 60:00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toMatch(/user-scalable=no|maximum-scale/);
  await page.screenshot({ path: 'artifacts/zoom-win.png', fullPage: true });
  await context.close();
});
