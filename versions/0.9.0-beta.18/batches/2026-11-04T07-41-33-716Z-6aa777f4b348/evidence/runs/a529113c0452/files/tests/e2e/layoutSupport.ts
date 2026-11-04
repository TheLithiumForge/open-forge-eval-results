import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cards } from './support.ts';

export async function assertLayout(page: Page, size: number): Promise<void> {
  await expect(cards(page)).toHaveCount(size * size);
  const measurement = await page.evaluate(() => {
    const scroll = document.querySelector('.board-scroll');
    if (scroll === null) throw new Error('Missing scroll area.');
    return {
      viewport: innerWidth, outer: document.documentElement.scrollWidth,
      areaHeight: scroll.getBoundingClientRect().height,
      heights: [...document.querySelectorAll('.card')].map((card) => {
        const rect = card.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    };
  });
  expect(measurement.outer).toBeLessThanOrEqual(measurement.viewport);
  expect(measurement.areaHeight).toBeLessThanOrEqual(Math.min((page.viewportSize()?.height ?? 0) * 0.7, 768) + 0.1);
  for (const card of measurement.heights) {
    expect(card.width).toBeGreaterThanOrEqual(44);
    expect(card.width).toBeLessThanOrEqual(88);
    expect(card.height).toBeCloseTo(card.width, 3);
  }
}

export async function assertFocusClearance(page: Page): Promise<void> {
  const clearance = await page.evaluate(() => {
    const active = document.activeElement;
    const scroll = document.querySelector('.board-scroll');
    if (!(active instanceof HTMLButtonElement) || scroll === null) throw new Error('Missing board focus.');
    const card = active.getBoundingClientRect();
    const area = scroll.getBoundingClientRect();
    const style = getComputedStyle(active);
    return { left: card.left - area.left, right: area.right - card.right,
      top: card.top - area.top, bottom: area.bottom - card.bottom,
      outline: style.outlineWidth, offset: style.outlineOffset, margin: style.scrollMargin };
  });
  for (const value of [clearance.left, clearance.right, clearance.top, clearance.bottom]) {
    expect(value).toBeGreaterThanOrEqual(5.5);
  }
  expect(clearance.outline).toBe('3px');
  expect(clearance.offset).toBe('2px');
  expect(clearance.margin).toBe('6px');
}
