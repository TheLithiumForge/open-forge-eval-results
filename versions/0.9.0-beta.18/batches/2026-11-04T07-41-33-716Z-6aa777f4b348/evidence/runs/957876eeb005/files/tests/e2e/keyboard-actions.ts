import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cards } from './deal-actions.ts';

export async function moveFocus(page: Page, from: number, to: number, size: number): Promise<void> {
  const vertical = Math.floor(to / size) - Math.floor(from / size);
  const horizontal = to % size - from % size;
  for (let count = 0; count < Math.abs(vertical); count += 1) {
    await page.keyboard.press(vertical < 0 ? 'ArrowUp' : 'ArrowDown');
  }
  for (let count = 0; count < Math.abs(horizontal); count += 1) {
    await page.keyboard.press(horizontal < 0 ? 'ArrowLeft' : 'ArrowRight');
  }
  await expect(cards(page).nth(to)).toBeFocused();
}

export async function expectFocusVisible(page: Page): Promise<void> {
  const geometry = await page.evaluate(() => {
    const card = document.activeElement;
    const board = document.querySelector('.board-scroll');
    if (!(card instanceof HTMLButtonElement) || !(board instanceof HTMLElement)) throw new Error('Missing focused card');
    const a = card.getBoundingClientRect();
    const b = board.getBoundingClientRect();
    const style = getComputedStyle(card);
    return { left: a.left - b.left, top: a.top - b.top, right: b.right - a.right,
      bottom: b.bottom - a.bottom, outline: style.outlineWidth, offset: style.outlineOffset,
      margin: style.scrollMargin, outerWidth: document.documentElement.scrollWidth, width: innerWidth,
      viewportTop: a.top, viewportBottom: a.bottom, viewportHeight: innerHeight };
  });
  for (const distance of [geometry.left, geometry.top, geometry.right, geometry.bottom]) expect(distance).toBeGreaterThanOrEqual(5);
  expect(geometry.viewportTop).toBeGreaterThanOrEqual(5);
  expect(geometry.viewportBottom).toBeLessThanOrEqual(geometry.viewportHeight - 5);
  expect(geometry.outerWidth).toBeLessThanOrEqual(geometry.width);
  expect(geometry.outline).toBe('3px');
  expect(geometry.offset).toBe('2px');
  expect(geometry.margin).toBe('6px');
}
