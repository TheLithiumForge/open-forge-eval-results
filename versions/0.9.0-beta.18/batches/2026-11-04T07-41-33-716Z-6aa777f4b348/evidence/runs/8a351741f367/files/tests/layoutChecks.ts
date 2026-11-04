import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export async function outlineFits(page: Page, focused: Locator): Promise<void> {
  const board = await page.locator('.board-scroll').boundingBox();
  const card = await focused.boundingBox();
  if (!board || !card) throw new Error('Missing visible board or card.');
  expect(card.x - 5).toBeGreaterThanOrEqual(board.x - 0.5);
  expect(card.y - 5).toBeGreaterThanOrEqual(board.y - 0.5);
  expect(card.x + card.width + 5).toBeLessThanOrEqual(board.x + board.width + 0.5);
  expect(card.y + card.height + 5).toBeLessThanOrEqual(board.y + board.height + 0.5);
}

export async function boundedLayout(page: Page, count: number): Promise<void> {
  await expect(page.locator('.card')).toHaveCount(count);
  const measurements = await page.evaluate(() => ({
    outer: document.documentElement.scrollWidth,
    viewport: innerWidth,
    cards: [...document.querySelectorAll('.card')].map((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }),
    gap: getComputedStyle(document.querySelector('.board-grid') ?? document.body).gap,
    board: document.querySelector('.board-scroll')?.getBoundingClientRect().height ?? 0,
    height: innerHeight,
  }));
  expect(measurements.outer).toBeLessThanOrEqual(measurements.viewport);
  expect(measurements.gap).toBe('6px');
  expect(measurements.board).toBeLessThanOrEqual(Math.min(768, measurements.height * 0.7) + 0.5);
  for (const card of measurements.cards) {
    expect(card.width).toBeGreaterThanOrEqual(44);
    expect(card.width).toBeLessThanOrEqual(88);
    expect(Math.abs(card.width - card.height)).toBeLessThan(0.1);
  }
}
