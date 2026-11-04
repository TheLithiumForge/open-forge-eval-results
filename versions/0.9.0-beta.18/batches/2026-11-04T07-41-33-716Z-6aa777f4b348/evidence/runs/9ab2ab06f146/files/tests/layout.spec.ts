import { expect, test } from '@playwright/test';
import type { CDPSession, Page } from '@playwright/test';
import { cards, focusCard, loadBoard, loadSnapshot, snapshot, solve } from './helpers.ts';

async function checkFocusOutline(page: Page) {
  const bounds = await page.locator('.board-scroll').evaluate(area => {
    const active = document.activeElement;
    if (!(active instanceof HTMLButtonElement)) throw new Error('Expected card focus');
    const outer = area.getBoundingClientRect();
    const inner = active.getBoundingClientRect();
    return { left: inner.left - outer.left, top: inner.top - outer.top,
      right: outer.left + area.clientWidth - inner.right, bottom: outer.top + area.clientHeight - inner.bottom };
  });
  for (const inset of Object.values(bounds)) expect(inset).toBeGreaterThanOrEqual(5);
}

async function swipe(cdp: CDPSession, from: { x: number; y: number }, to: { x: number; y: number }) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let step = 1; step <= 20; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{
      x: from.x + (to.x - from.x) * step / 20, y: from.y + (to.y - from.y) * step / 20,
    }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

for (const [width, height, scale] of [[360, 800, 1], [1280, 800, 1], [640, 400, 2]]) {
  test(`boards fit at ${width}x${height} scale ${scale}`, async ({ browser }, testInfo) => {
    if (!width || !height || !scale) throw new Error('Missing viewport vector');
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    for (const size of [4, 16]) {
      await loadBoard(page, `np1-${size}-1`);
      await expect(cards(page)).toHaveCount(size * size);
      const dimensions = await cards(page).first().evaluate(card => ({
        width: card.getBoundingClientRect().width, height: card.getBoundingClientRect().height,
      }));
      expect(dimensions.width).toBeGreaterThanOrEqual(44);
      expect(dimensions.width).toBeLessThanOrEqual(88);
      expect(dimensions.width).toBe(dimensions.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(await page.locator('.board-scroll').evaluate(area => area.clientHeight)).toBeLessThanOrEqual(height * .7 + 1);
      await focusCard(page, 0);
      await checkFocusOutline(page);
      await focusCard(page, size * size - 1);
      await checkFocusOutline(page);
      await focusCard(page, Math.floor(size * size / 2) + Math.floor(size / 2));
      await checkFocusOutline(page);
      await page.keyboard.press('Enter');
      await expect(page.locator('.card.revealed')).toHaveCount(1);
      await page.getByRole('button', { name: 'New Game', exact: true }).click();
      await expect(page.locator('.status')).toContainText('Moves: 0');
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
    }
    await loadSnapshot(page, snapshot({ matched: Array.from({ length: 16 }, (_, index) => index),
      started: true, moves: 8, elapsedMs: 359999999 }));
    await expect(page.locator('.win-banner')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`layout-${width}.png`), fullPage: true });
    await context.close();
  });
}

test('completed touch taps share card activation and board scrolling reaches both ends', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await loadBoard(page);
  await cards(page).nth(0).tap();
  await cards(page).nth(11).tap();
  await expect(page.locator('.status')).toContainText('Pairs: 1/8');
  await loadBoard(page, 'np1-16-1');
  // Dispatch real touch sequences; Chromium's synthesized scroll gesture omits touch scrolling here.
  const cdp = await context.newCDPSession(page);
  await page.locator('.board-scroll').scrollIntoViewIfNeeded();
  const area = await page.locator('.board-scroll').boundingBox();
  if (!area) throw new Error('Missing scroll area');
  const left = { x: area.x + 24, y: area.y + area.height / 2 };
  const right = { x: area.x + area.width - 24, y: left.y };
  const top = { x: area.x + area.width / 2, y: area.y + 24 };
  const bottom = { x: top.x, y: area.y + area.height - 24 };
  for (let count = 0; count < 3; count++) await swipe(cdp, right, left);
  await swipe(cdp, bottom, top);
  await expect.poll(() => page.locator('.board-scroll').evaluate(node => node.scrollTop > 0 && node.scrollLeft > 0)).toBe(true);
  await expect(page.locator('.status')).toContainText('Moves: 0');
  await cards(page).last().tap();
  await expect(cards(page).last()).toHaveAccessibleName(/revealed$/);
  for (let count = 0; count < 3; count++) await swipe(cdp, left, right);
  await swipe(cdp, top, bottom);
  await cards(page).first().tap();
  await expect(page.locator('.status')).toContainText('Moves: 1');
  await context.close();
});

test('reduced motion removes transitions and normal victory pulses exactly once', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await solve(page);
  await expect(page.locator('.win-banner')).toHaveCSS('animation-duration', '0.6s');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-iteration-count', '1');
  await page.waitForTimeout(650);
  expect(await page.locator('.win-banner').evaluate(banner => banner.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadBoard(page);
  await expect(cards(page).first()).toHaveCSS('transition-duration', '0s');
  await solve(page);
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
});
