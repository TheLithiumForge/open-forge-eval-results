import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export async function expectFocusVisible(page: Page): Promise<void> {
  const space = await page.evaluate(() => {
    const board = document.querySelector('.board-scroll');
    const card = document.activeElement;
    if (!(board instanceof HTMLElement) || !(card instanceof HTMLButtonElement)) throw new Error('Missing focused card');
    const outer = board.getBoundingClientRect();
    const inner = card.getBoundingClientRect();
    return [inner.left - outer.left, outer.right - inner.right, inner.top - outer.top,
      outer.bottom - inner.bottom, inner.left, inner.top, innerWidth - inner.right, innerHeight - inner.bottom];
  });
  for (const margin of space) expect(margin).toBeGreaterThanOrEqual(4.9);
}
