import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { saveScreenshot } from './evidence.ts';

test('touch reveals the default board and touch scrolling reaches a sixteen-by-sixteen card', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  try {
    await page.goto('/');
    let firstBounds = await page.locator('.memory-card').first().boundingBox();
    expect(firstBounds).not.toBeNull();
    if (firstBounds === null) throw new Error('The default first card is missing.');
    await page.touchscreen.tap(firstBounds.x + firstBounds.width / 2, firstBounds.y + firstBounds.height / 2);
    await expect(page.locator('.memory-card').first()).toHaveAttribute('aria-label', /revealed$/);
    await page.getByLabel('Grid size').selectOption('16');
    await expect(page.locator('.memory-card')).toHaveCount(256);

    const area = page.locator('.board-scroll');
    const lastCard = page.locator('.memory-card').nth(255);
    await area.scrollIntoViewIfNeeded();
    const connection = await context.newCDPSession(page);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const edge = await area.boundingBox();
      if (edge === null) throw new Error('The large-board scroll area is missing.');
      const inset = await touchCardInset(area, lastCard);
      if (inset.left >= 6 && inset.right >= 6 && inset.top >= 6 && inset.bottom >= 6) break;
      const startX = Math.min(edge.x + edge.width - 16, 350);
      const startY = Math.min(edge.y + edge.height - 20, 780);
      const endX = Math.max(edge.x + 24, startX - 240);
      const endY = Math.max(edge.y + 24, startY - 240);
      await connection.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [{ id: 1, x: startX, y: startY }],
      });
      await connection.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ id: 1, x: endX, y: endY }],
      });
      await connection.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }

    const inset = await touchCardInset(area, lastCard);
    expect(inset.left).toBeGreaterThanOrEqual(6);
    expect(inset.right).toBeGreaterThanOrEqual(6);
    expect(inset.top).toBeGreaterThanOrEqual(6);
    expect(inset.bottom).toBeGreaterThanOrEqual(6);
    const lastBounds = await lastCard.boundingBox();
    expect(lastBounds).not.toBeNull();
    if (lastBounds === null) throw new Error('The last card is missing.');
    const x = lastBounds.x + lastBounds.width / 2;
    const y = lastBounds.y + lastBounds.height / 2;
    const target = await page.evaluate(({ x, y }) =>
      document.elementFromPoint(x, y)?.closest('button.memory-card')?.getAttribute('aria-label'), { x, y });
    expect(target).toMatch(/Row 16, column 16, closed/);
    await page.touchscreen.tap(lastBounds.x + lastBounds.width / 2, lastBounds.y + lastBounds.height / 2);
    await expect(lastCard).toHaveAttribute('aria-label', /revealed$/);
    await saveScreenshot(page, 'touch-16.png');
    await connection.detach();
  } finally {
    await context.close();
  }
});

async function touchCardInset(area: Locator, card: Locator): Promise<{
  left: number;
  right: number;
  top: number;
  bottom: number;
}> {
  const boxes = { area: await area.boundingBox(), card: await card.boundingBox() };
  if (boxes.area === null || boxes.card === null) throw new Error('The scrolled card is missing.');
  return {
    left: boxes.card.x - boxes.area.x - 1,
    right: boxes.area.x + boxes.area.width - boxes.card.x - boxes.card.width - 1,
    top: boxes.card.y - boxes.area.y - 1,
    bottom: boxes.area.y + boxes.area.height - boxes.card.y - boxes.card.height - 1,
  };
}
