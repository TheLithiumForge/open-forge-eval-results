import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cards, endingSnapshot, keyboardTo, loadBoard, loadSnapshot } from './support.ts';

async function outlineVisible(page: Page, index: number): Promise<void> {
  const measurements = await cards(page).nth(index).evaluate((node) => {
    const card = node.getBoundingClientRect();
    const area = node.closest('.board-scroll')?.getBoundingClientRect();
    const style = getComputedStyle(node);
    if (!area) throw new Error('Missing board area.');
    return { left: card.left - area.left, top: card.top - area.top,
      right: area.right - card.right, bottom: area.bottom - card.bottom,
      viewportTop: card.top, viewportBottom: card.bottom, viewportHeight: innerHeight,
      outline: style.outlineWidth, offset: style.outlineOffset };
  });
  expect(measurements.outline).toBe('3px');
  expect(measurements.offset).toBe('2px');
  for (const edge of [measurements.left, measurements.top, measurements.right, measurements.bottom]) {
    expect(edge).toBeGreaterThanOrEqual(4.9);
  }
  expect(measurements.viewportTop).toBeGreaterThanOrEqual(4.9);
  expect(measurements.viewportBottom).toBeLessThanOrEqual(measurements.viewportHeight - 4.9);
}

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  for (const size of [4, 16]) {
    test(`${size}x${size} layout and focus at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 640 ? 2 : 1 });
      try {
        const page = await context.newPage();
        await page.goto('http://127.0.0.1:4173/');
        await loadBoard(page, `np1-${size}-1`);
        await expect(cards(page)).toHaveCount(size * size);
        const geometry = await page.locator('.board-scroll').evaluate((node) => {
          const area = node.getBoundingClientRect();
          const card = node.querySelector('button')?.getBoundingClientRect();
          if (!card) throw new Error('Missing card.');
          return { pageWidth: document.documentElement.scrollWidth, viewport: innerWidth,
            height: area.height, maxHeight: Math.min(innerHeight * 0.7, 768),
            width: card.width, cardHeight: card.height, gap: getComputedStyle(node.firstElementChild ?? node).gap,
            padding: getComputedStyle(node).padding, pageBackground: getComputedStyle(document.body).backgroundColor };
        });
        expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport);
        expect(geometry.height).toBeLessThanOrEqual(geometry.maxHeight + 0.1);
        expect(geometry.width).toBeGreaterThanOrEqual(44);
        expect(geometry.width).toBeLessThanOrEqual(88);
        expect(geometry.cardHeight).toBeCloseTo(geometry.width, 1);
        expect(geometry.gap).toBe('6px');
        expect(geometry.padding).toBe('6px');
        expect(geometry.pageBackground).toBe('rgb(9, 11, 20)');
        await cards(page).first().focus();
        await page.keyboard.press('ArrowRight');
        await keyboardTo(page, 0, size);
        await outlineVisible(page, 0);
        await keyboardTo(page, size * size - 1, size);
        await outlineVisible(page, size * size - 1);
        await keyboardTo(page, Math.floor(size / 2) * size + Math.floor(size / 2), size);
        await outlineVisible(page, Math.floor(size / 2) * size + Math.floor(size / 2));
        await page.keyboard.press('Enter');
        await expect(page.locator('.card--revealed')).toHaveCount(1);
        await loadSnapshot(page, endingSnapshot(999999, true, size, 359999999));
        const readable = await page.locator('.win-banner, .game-status p').evaluateAll((nodes) =>
          nodes.every((node) => node.scrollWidth <= node.clientWidth));
        expect(readable).toBe(true);
        await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute('content', /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/);
      } finally { await context.close(); }
    });
  }
}
