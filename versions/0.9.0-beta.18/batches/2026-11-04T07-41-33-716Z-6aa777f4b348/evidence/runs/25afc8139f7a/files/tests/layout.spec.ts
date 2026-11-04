import { expect, test } from '@playwright/test';
import type { CDPSession, Page } from '@playwright/test';
import { card, completedSnapshot, importSnapshot, moveFocus, openBoard } from './helpers.ts';

async function fullFocusRing(page: Page, index: number) {
  const geometry = await card(page, index).evaluate((element) => {
    const panel = element.closest('.board-scroll');
    if (!panel) throw new Error('Missing board scroll area');
    const card = element.getBoundingClientRect();
    const board = panel.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { left: card.left - 5, right: card.right + 5, top: card.top - 5, bottom: card.bottom + 5,
      boardLeft: board.left, boardRight: board.right, boardTop: board.top, boardBottom: board.bottom,
      width: innerWidth, height: innerHeight, outline: style.outlineWidth, offset: style.outlineOffset };
  });
  expect(geometry.outline).toBe('3px');
  expect(geometry.offset).toBe('2px');
  expect(geometry.left).toBeGreaterThanOrEqual(Math.max(0, geometry.boardLeft) - 0.1);
  expect(geometry.right).toBeLessThanOrEqual(Math.min(geometry.width, geometry.boardRight) + 0.1);
  expect(geometry.top).toBeGreaterThanOrEqual(Math.max(0, geometry.boardTop) - 0.1);
  expect(geometry.bottom).toBeLessThanOrEqual(Math.min(geometry.height, geometry.boardBottom) + 0.1);
}

async function swipe(page: Page, cdp: CDPSession, axis: 'x' | 'y', direction: -1 | 1) {
  const panel = await page.locator('.board-scroll').boundingBox();
  if (!panel) throw new Error('Missing scroll area.');
  const x = axis === 'x' ? panel.x + (direction < 0 ? panel.width - 32 : 32) : panel.x + panel.width / 2;
  const y = axis === 'y' ? (direction < 0 ? Math.min(740, panel.y + panel.height - 32) : Math.max(60, panel.y + 32))
    : Math.min(700, panel.y + 100);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  for (let step = 1; step <= 8; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1,
      x: x + (axis === 'x' ? direction * step * 25 : 0), y: y + (axis === 'y' ? direction * step * 30 : 0) }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(150);
}

async function touchEnd(page: Page, cdp: CDPSession, axis: 'x' | 'y', direction: -1 | 1) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const reached = await page.locator('.board-scroll').evaluate((element, { axis, direction }) => {
      const current = axis === 'x' ? element.scrollLeft : element.scrollTop;
      const maximum = axis === 'x' ? element.scrollWidth - element.clientWidth : element.scrollHeight - element.clientHeight;
      return current === (direction < 0 ? maximum : 0);
    }, { axis, direction });
    if (reached) return;
    await swipe(page, cdp, axis, direction);
  }
}

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test(`large board fits outer viewport and keeps full focused outlines at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173', viewport,
      deviceScaleFactor: viewport.width === 640 ? 2 : 1 });
    const page = await context.newPage();
    try {
      await openBoard(page, 'np1-16-1');
      await expect(page.locator('.card')).toHaveCount(256);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      const metrics = await card(page, 0).evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { width: rect.width, height: rect.height, border: style.borderWidth, radius: style.borderRadius };
      });
      expect(metrics.width).toBeGreaterThanOrEqual(44);
      expect(metrics.width).toBeLessThanOrEqual(88);
      expect(metrics.height).toBeCloseTo(metrics.width, 1);
      expect(metrics.border).toBe('2px');
      expect(metrics.radius).toBe('8px');
      await card(page, 0).click();
      await expect(card(page, 0)).toHaveAttribute('aria-label', /revealed$/);
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
      await page.keyboard.press('Tab');
      await fullFocusRing(page, 0);
      await moveFocus(page, 0, 136, 16);
      await fullFocusRing(page, 136);
      await moveFocus(page, 136, 255, 16);
      await fullFocusRing(page, 255);
      await page.keyboard.press('Enter');
      await expect(card(page, 255)).toHaveAttribute('aria-label', /revealed$/);
      await importSnapshot(page, completedSnapshot('np1-16-1'));
      await expect(page.locator('.win-banner')).toContainText('128 moves');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({ path: `evidence/layout-${viewport.width}x${viewport.height}.png`, fullPage: true });
    } finally { await context.close(); }
  });
}

test('zoom-equivalent default board supports pointer and keyboard with no overlap', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173', viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  try {
    await openBoard(page);
    await card(page, 0).click();
    await card(page, 11).click();
    await expect(page.locator('.game-status')).toContainText('Pairs: 1/8');
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page.keyboard.press('Tab');
    await moveFocus(page, 0, 15);
    await fullFocusRing(page, 15);
    await page.keyboard.press('Space');
    await expect(card(page, 15)).toHaveAttribute('aria-label', /revealed$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(640);
  } finally { await context.close(); }
});

test('phone touch scrolling reaches both ends of the 16x16 board', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173', hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  try {
    await openBoard(page, 'np1-16-1');
    await card(page, 0).tap();
    const cdp = await context.newCDPSession(page);
    await touchEnd(page, cdp, 'x', -1);
    await touchEnd(page, cdp, 'y', -1);
    await expect.poll(() => page.locator('.board-scroll').evaluate((element) =>
      element.scrollLeft === element.scrollWidth - element.clientWidth)).toBe(true);
    await expect.poll(() => page.locator('.board-scroll').evaluate((element) =>
      element.scrollTop === element.scrollHeight - element.clientHeight)).toBe(true);
    await card(page, 255).tap();
    await expect(card(page, 255)).toHaveAttribute('aria-label', /revealed|matched/);
    await touchEnd(page, cdp, 'x', 1);
    await touchEnd(page, cdp, 'y', 1);
    await expect.poll(() => page.locator('.board-scroll').evaluate((element) => element.scrollLeft)).toBe(0);
    await expect.poll(() => page.locator('.board-scroll').evaluate((element) => element.scrollTop)).toBe(0);
  } finally { await context.close(); }
});
