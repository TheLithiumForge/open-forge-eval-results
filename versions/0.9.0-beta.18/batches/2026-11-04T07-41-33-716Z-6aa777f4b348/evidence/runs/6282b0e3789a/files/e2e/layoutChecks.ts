import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cards } from './gameFixtures.ts';

export async function checkFocusedCard(page: Page, index: number) {
  await cards(page).nth(index).focus();
  const size = Math.sqrt(await cards(page).count());
  const atLeft = index % size === 0;
  await page.keyboard.press(atLeft ? 'ArrowRight' : 'ArrowLeft');
  await page.keyboard.press(atLeft ? 'ArrowLeft' : 'ArrowRight');
  const metrics = await cards(page).nth(index).evaluate(element => {
    const card = element.getBoundingClientRect();
    const scroller = element.closest('.board-scroll');
    if (!scroller) throw new Error('Missing scroll area.');
    const board = scroller.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { width: card.width, height: card.height,
      clearances: [card.left - board.left, card.top - board.top, board.right - card.right, board.bottom - card.bottom],
      outline: style.outlineWidth, offset: style.outlineOffset, margin: style.scrollMarginTop };
  });
  expect(Math.abs(metrics.width - metrics.height)).toBeLessThan(0.02);
  expect(metrics.width).toBeGreaterThanOrEqual(44);
  expect(metrics.width).toBeLessThanOrEqual(88);
  metrics.clearances.forEach(space => expect(space).toBeGreaterThanOrEqual(5.9));
  expect(metrics.outline).toBe('3px');
  expect(metrics.offset).toBe('2px');
  expect(metrics.margin).toBe('6px');
}

export async function checkPageWidth(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
