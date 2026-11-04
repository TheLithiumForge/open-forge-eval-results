import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cards } from './actions.ts';

export async function focusOutlineVisible(page: Page, index: number): Promise<void> {
  await expect(cards(page).nth(index)).toBeFocused();
  const result = await cards(page).nth(index).evaluate((card) => {
    const area = card.closest('.board-scroll');
    if (!(area instanceof HTMLElement)) throw new Error('Missing board scroll area.');
    const outer = area.getBoundingClientRect();
    const inner = card.getBoundingClientRect();
    const style = getComputedStyle(card);
    const outline = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
    const left = outer.left + area.clientLeft;
    const top = outer.top + area.clientTop;
    return {
      left: inner.left - outline >= left - 0.1,
      right: inner.right + outline <= left + area.clientWidth + 0.1,
      top: inner.top - outline >= top - 0.1,
      bottom: inner.bottom + outline <= top + area.clientHeight + 0.1,
      outlineWidth: style.outlineWidth, outlineOffset: style.outlineOffset, outlineColor: style.outlineColor,
    };
  });
  expect(result).toEqual({ left: true, right: true, top: true, bottom: true,
    outlineWidth: '3px', outlineOffset: '2px', outlineColor: 'rgb(255, 255, 255)' });
}

export async function boardMeasurements(page: Page, size: number): Promise<void> {
  const result = await page.locator('.board-scroll').evaluate((area) => {
    const buttons = [...area.querySelectorAll('button')];
    const squares = buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return rect.width >= 44 && rect.width <= 88 && Math.abs(rect.width - rect.height) < 0.1;
    });
    const style = getComputedStyle(area);
    return { count: buttons.length, squares: squares.every(Boolean), pageFits: document.documentElement.scrollWidth <= innerWidth,
      height: area.getBoundingClientRect().height, limit: Math.min(innerHeight * 0.7, 768),
      padding: style.padding, overflowX: style.overflowX, overflowY: style.overflowY };
  });
  expect(result.count).toBe(size * size);
  expect(result.squares).toBe(true);
  expect(result.pageFits).toBe(true);
  expect(result.height).toBeLessThanOrEqual(result.limit + 0.1);
  expect(result.padding).toBe('6px');
  expect(result.overflowX).toBe('auto');
  expect(result.overflowY).toBe('auto');
}
