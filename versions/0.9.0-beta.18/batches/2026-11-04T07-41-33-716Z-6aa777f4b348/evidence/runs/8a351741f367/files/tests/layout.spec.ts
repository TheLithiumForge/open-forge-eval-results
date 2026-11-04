import { expect, test } from '@playwright/test';
import { card, loadBoard, nearlyCompleteBoard, loadSnapshot } from './gameActions.ts';
import { boundedLayout, outlineFits } from './layoutChecks.ts';
import { moveFrom } from './keyboardJourney.ts';

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }]) {
  test(`16x16 at ${viewport.width}x${viewport.height} keeps every focus outline inside the board`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await loadBoard(page, 'np1-16-1');
    await boundedLayout(page, 256);
    await card(page, 0).focus();
    await page.keyboard.press('ArrowLeft');
    await outlineFits(page, card(page, 0));
    let position = await moveFrom(page, 0, 136, 16);
    await outlineFits(page, card(page, 136));
    position = await moveFrom(page, position, 255, 16);
    expect(position).toBe(255);
    await expect(card(page, 255)).toBeFocused();
    await outlineFits(page, card(page, 255));
    await page.screenshot({ path: `artifacts/board-16-${viewport.width}.png`, fullPage: true });
    await page.keyboard.press('Tab');
    await expect(page.locator('summary')).toBeFocused();
    await page.getByRole('button', { name: 'New Game', exact: true }).click();
    await expect(page.locator('.game-status')).toContainText('Moves: 0');
  });
}

test('touch scrolling reaches both ends of a 16x16 mobile board', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 360, height: 800 } });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173');
    await loadBoard(page, 'np1-16-1');
    await card(page, 0).tap();
    const client = await context.newCDPSession(page);
    for (let gesture = 0; gesture < 5; gesture += 1) {
      const area = await page.locator('.board-scroll').boundingBox();
      if (!area) throw new Error('Missing board.');
      const start = { x: area.x + area.width - 24, y: Math.min(area.y + area.height, 800) - 24 };
      const end = { x: area.x + 24, y: Math.max(area.y, 0) + 24 };
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
      for (let step = 1; step <= 10; step += 1) {
        const point = { x: start.x + (end.x - start.x) * step / 10, y: start.y + (end.y - start.y) * step / 10 };
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
      }
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(60);
    }
    const offsets = await page.locator('.board-scroll').evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }));
    expect(offsets.left).toBeGreaterThan(400);
    expect(offsets.top).toBeGreaterThan(100);
    await outlineFits(page, card(page, 255));
    await card(page, 255).tap();
    await expect(page.locator('.game-status')).toContainText('Moves: 1');
  } finally { await context.close(); }
});

for (const size of [4, 16]) {
  test(`200% equivalent zoom keeps ${size}x${size} input and summary readable`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
    try {
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4173');
      await loadBoard(page, `np1-${size}-1`);
      await boundedLayout(page, size * size);
      await card(page, 0).click();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await expect(page.locator('.game-status')).toContainText('Moves: 1');
      await moveFrom(page, 1, size * size - 1, size);
      await outlineFits(page, card(page, size * size - 1));
      const finalPair = nearlyCompleteBoard(`np1-${size}-1`);
      await loadSnapshot(page, finalPair.text);
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await card(page, finalPair.first).click();
      await card(page, finalPair.second).click();
      await expect(page.locator('.game-status')).toContainText(`Pairs: ${size * size / 2}/${size * size / 2}`);
      await expect(page.locator('.win-banner')).toBeVisible();
      const horizontal = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      expect(horizontal).toBe(true);
      await page.screenshot({ path: `artifacts/zoom-${size}.png`, fullPage: true });
    } finally { await context.close(); }
  });
}
