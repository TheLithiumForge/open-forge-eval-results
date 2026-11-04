import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cards } from './gameHarness.ts';

export async function checkFocusClearance(page: Page, index: number): Promise<void> {
  await cards(page).nth(index).focus();
  const geometry = await cards(page).nth(index).evaluate((element) => {
    const area = element.closest('.board-scroll');
    if (!area) throw new Error('Missing board scroll area.');
    const card = element.getBoundingClientRect(); const box = area.getBoundingClientRect();
    return { left: card.left - box.left, top: card.top - box.top,
      right: box.right - card.right, bottom: box.bottom - card.bottom,
      margin: parseFloat(getComputedStyle(element).scrollMargin) };
  });
  expect(geometry.margin).toBeGreaterThanOrEqual(6);
  for (const distance of [geometry.left, geometry.top, geometry.right, geometry.bottom]) {
    expect(distance).toBeGreaterThanOrEqual(5);
  }
}

export async function swipe(page: Page, horizontal: boolean, reverse = false): Promise<void> {
  await page.locator('.board-scroll').scrollIntoViewIfNeeded();
  const box = await page.locator('.board-scroll').boundingBox();
  if (!box) throw new Error('Missing board bounds.');
  const cdp = await page.context().newCDPSession(page);
  const low = horizontal ? box.x + 24 : box.y + 24;
  const high = horizontal ? box.x + box.width - 24 : box.y + box.height - 24;
  for (let step = 0; step <= 8; step += 1) {
    const position = reverse ? low + (high - low) * step / 8 : high - (high - low) * step / 8;
    await cdp.send('Input.dispatchTouchEvent', { type: step === 0 ? 'touchStart' : 'touchMove',
      touchPoints: [{ x: horizontal ? position : box.x + box.width / 2,
        y: horizontal ? box.y + box.height / 2 : position }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
