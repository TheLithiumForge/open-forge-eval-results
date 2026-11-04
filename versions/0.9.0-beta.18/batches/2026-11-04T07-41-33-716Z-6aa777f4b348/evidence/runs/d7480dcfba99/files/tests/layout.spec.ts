import { expect, test } from '@playwright/test';
import { cards, loadBoard, loadSnapshot, partial } from './helpers.ts';

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test(`large boards and focus rings at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 640 ? 2 : 1, hasTouch: true });
    const page = await context.newPage();
    await page.goto('/');
    await loadBoard(page, 'np1-16-1');
    await expect(cards(page)).toHaveCount(256);
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
    const first = await cards(page).first().boundingBox();
    expect(first?.width).toBeGreaterThanOrEqual(44);
    expect(first?.height).toBe(first?.width);
    // Touch users can scroll to both ends of the board without page overflow.
    await page.locator('.board-scroll').evaluate(node => { node.scrollLeft = node.scrollWidth; node.scrollTop = node.scrollHeight; });
    await cards(page).last().tap();
    await expect(cards(page).last()).toHaveAttribute('aria-label', /revealed$/);
    await page.locator('.board-scroll').evaluate(node => { node.scrollLeft = 0; node.scrollTop = 0; });
    await cards(page).first().tap();
    await cards(page).first().focus();
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowDown');
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight');
    await expect(cards(page).last()).toBeFocused();
    const ring = await cards(page).last().evaluate(node => {
      const box = node.getBoundingClientRect();
      const area = node.closest('.board-scroll')?.getBoundingClientRect();
      return { left: box.left - 5, top: box.top - 5, right: box.right + 5, bottom: box.bottom + 5,
        area: area ? { left: area.left, top: area.top, right: area.right, bottom: area.bottom } : null };
    });
    expect(ring.area).not.toBeNull();
    if (ring.area) {
      expect(ring.left).toBeGreaterThanOrEqual(ring.area.left);
      expect(ring.right).toBeLessThanOrEqual(ring.area.right);
      expect(ring.top).toBeGreaterThanOrEqual(ring.area.top);
      expect(ring.bottom).toBeLessThanOrEqual(ring.area.bottom);
    }
    // Check a mid-board position as well as the perimeter.
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowUp');
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft');
    await expect(cards(page).nth(119)).toBeFocused();
    const outline = await cards(page).nth(119).evaluate(node => getComputedStyle(node).outline);
    expect(outline).toContain('3px');
    const midFits = await cards(page).nth(119).evaluate(node => {
      const box = node.getBoundingClientRect();
      const area = node.closest('.board-scroll')?.getBoundingClientRect();
      return area !== undefined && box.left - 5 >= area.left && box.right + 5 <= area.right &&
        box.top - 5 >= area.top && box.bottom + 5 <= area.bottom;
    });
    expect(midFits).toBe(true);
    await loadBoard(page);
    await cards(page).nth(0).tap();
    await cards(page).nth(11).tap();
    await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
    await loadSnapshot(page, { ...partial(Array.from({ length: 16 }, (_, index) => index)), moves: 8 });
    await page.locator('.win-banner').scrollIntoViewIfNeeded();
    const win = await page.locator('.win-banner').boundingBox();
    expect(win?.x).toBeGreaterThanOrEqual(0);
    expect((win?.x ?? 0) + (win?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
    await context.close();
  });
}

test('motion, matched styling and static completion', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await cards(page).nth(0).hover();
  expect(await cards(page).nth(0).evaluate(node => getComputedStyle(node).borderColor)).toBe('rgb(139, 234, 125)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await cards(page).nth(0).evaluate(node => getComputedStyle(node).transitionDuration)).toBe('0s');
  const complete = { ...partial(Array.from({ length: 16 }, (_, index) => index)), moves: 8 };
  await loadSnapshot(page, complete);
  expect(await page.locator('.win-banner').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
});
