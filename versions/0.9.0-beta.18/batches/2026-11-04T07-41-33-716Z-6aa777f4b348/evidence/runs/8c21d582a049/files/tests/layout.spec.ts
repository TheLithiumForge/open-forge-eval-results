import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cards, loadBoard, loadSnapshot, moveTo, openGame, snapshot } from './game.ts';

async function outlinedInView(page: Page): Promise<void> {
  const gaps = await page.locator('.card:focus').evaluate(card => {
    const area = card.closest('.board-scroll');
    if (!(area instanceof HTMLElement)) throw new Error('Missing board area');
    const target = card.getBoundingClientRect(); const outer = area.getBoundingClientRect();
    const style = getComputedStyle(card);
    return { left: target.left - outer.left - area.clientLeft,
      right: outer.left + area.clientLeft + area.clientWidth - target.right,
      top: target.top - outer.top - area.clientTop,
      bottom: outer.top + area.clientTop + area.clientHeight - target.bottom,
      outline: style.outlineWidth, offset: style.outlineOffset };
  });
  expect(Math.min(gaps.left, gaps.right, gaps.top, gaps.bottom)).toBeGreaterThanOrEqual(5.5);
  expect(gaps.outline).toBe('3px'); expect(gaps.offset).toBe('2px');
}

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test(`layout and complete focus outlines at ${viewport.width}x${viewport.height} (V02–V05, V19–V20)`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 640 ? 2 : 1, hasTouch: true });
    const page = await context.newPage();
    await openGame(page);
    for (const size of [4, 16]) {
      await loadBoard(page, `np1-${size}-1`);
      await expect(cards(page)).toHaveCount(size ** 2);
      const geometry = await cards(page).evaluateAll(elements => elements.map(element => {
        const rect = element.getBoundingClientRect(); return { width: rect.width, height: rect.height };
      }));
      for (const card of geometry) {
        expect(card.width).toBeGreaterThanOrEqual(44); expect(card.width).toBeLessThanOrEqual(88);
        expect(Math.abs(card.width - card.height)).toBeLessThan(0.1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const board = await page.locator('.board-scroll').evaluate(element => ({
        height: element.getBoundingClientRect().height, padding: getComputedStyle(element).padding,
        overflowX: getComputedStyle(element).overflowX, overflowY: getComputedStyle(element).overflowY,
      }));
      expect(board.height).toBeLessThanOrEqual(Math.min(viewport.height * 0.7, 768) + 0.1);
      expect(board.padding).toBe('6px'); expect(board.overflowX).toBe('auto'); expect(board.overflowY).toBe('auto');
      await page.getByRole('button', { name: 'Restart', exact: true }).focus();
      await page.keyboard.press('Tab');
      await outlinedInView(page);
      await moveTo(page, Math.floor(size / 2) * size + Math.floor(size / 2), size);
      await outlinedInView(page);
      await moveTo(page, size ** 2 - 1, size); await outlinedInView(page);
      await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown');
      await expect(cards(page).last()).toBeFocused();
      await moveTo(page, 0, size); await outlinedInView(page);
      await cards(page).first().tap();
      await expect(cards(page).first()).toHaveAccessibleName(/revealed$/);
      await loadSnapshot(page, snapshot(size));
      await expect(page.locator('.win-banner')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await mkdir('evidence', { recursive: true });
    await page.screenshot({ path: `evidence/layout-${viewport.width}.png`, fullPage: true });
    await context.close();
  });
}

test('reduced motion and one completion pulse followed by a static banner (V17–V18)', async ({ page }) => {
  await openGame(page);
  expect(await cards(page).first().evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0.12s');
  await loadSnapshot(page, snapshot(4, 7, false));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(11).click();
  const animation = await page.locator('.win-banner').evaluate(element => ({
    duration: getComputedStyle(element).animationDuration, iterations: getComputedStyle(element).animationIterationCount,
  }));
  expect(animation).toEqual({ duration: '0.6s', iterations: '1' });
  await page.clock.runFor(700);
  await expect(page.locator('.win-banner')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await cards(page).first().evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  expect(await page.locator('.win-banner').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});
