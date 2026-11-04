import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { completedSnapshot, freezePageClock, moveFocus, onePairRemainingSnapshot } from './helpers.ts';
import { saveScreenshot } from './evidence.ts';

test('all grid sizes render each card and the sixteen-by-sixteen board stays inside its scroll area', async ({ browser }) => {
  for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    try {
      await page.goto('/');
      const size = page.getByLabel('Grid size');
      for (const side of [4, 6, 8, 10, 12, 14, 16]) {
        await size.selectOption(String(side));
        await expect(page.locator('.memory-card')).toHaveCount(side * side);
      }
      const metrics = await page.evaluate(() => {
        const board = document.querySelector('.board-scroll');
        const card = document.querySelector('.memory-card');
        const grid = document.querySelector('.memory-board');
        if (board === null || card === null || grid === null) throw new Error('The board is missing.');
        const style = getComputedStyle(card);
        const boardStyle = getComputedStyle(board);
        return {
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          height: board.getBoundingClientRect().height,
          card: card.getBoundingClientRect().width,
          gap: getComputedStyle(grid).gap,
          border: style.borderTopWidth,
          radius: style.borderTopLeftRadius,
          horizontalScroll: board.scrollWidth > board.clientWidth,
          verticalScroll: board.scrollHeight > board.clientHeight,
          overflow: boardStyle.overflow,
        };
      });
      expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewportWidth);
      expect(metrics.card).toBeGreaterThanOrEqual(44);
      expect(metrics.gap).toBe('6px');
      expect(metrics.border).toBe('2px');
      expect(metrics.radius).toBe('8px');
      expect(metrics.height).toBeLessThanOrEqual(viewport.height * 0.7 + 1);
      expect(metrics.horizontalScroll).toBe(viewport.width === 360);
      expect(metrics.verticalScroll).toBe(true);
      expect(metrics.overflow).toBe('auto');

      const cards = page.locator('.memory-card');
      await cards.nth(0).focus();
      await moveFocus(page, 0, 136, 16);
      await expect(cards.nth(136)).toBeFocused();
      const middleInset = await focusedCardInset(page);
      expect(middleInset.left).toBeGreaterThanOrEqual(6);
      expect(middleInset.right).toBeGreaterThanOrEqual(6);
      expect(middleInset.top).toBeGreaterThanOrEqual(6);
      expect(middleInset.bottom).toBeGreaterThanOrEqual(6);
      await moveFocus(page, 136, 255, 16);
      await expect(cards.nth(255)).toBeFocused();
      const inset = await focusedCardInset(page);
      expect(inset.left).toBeGreaterThanOrEqual(6);
      expect(inset.right).toBeGreaterThanOrEqual(6);
      expect(inset.top).toBeGreaterThanOrEqual(6);
      expect(inset.bottom).toBeGreaterThanOrEqual(6);
      expect(inset.outline).toEqual({ width: '3px', offset: '2px' });
      await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeVisible();
      await saveScreenshot(page, `board-${viewport.width}.png`);
    } finally {
      await context.close();
    }
  }
});

test('640 by 400 at device scale two keeps controls and win summary readable on both sizes', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 640, height: 400 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  try {
    await page.goto('/');
    expect(await page.evaluate(() => devicePixelRatio)).toBe(2);
    await page.getByLabel('Grid size').selectOption('16');
    await expect(page.locator('.memory-card')).toHaveCount(256);
    await expect(page.locator('.board-scroll')).toBeVisible();
    let width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(640);
    await page.locator('.memory-card').first().click();
    await expect(page.locator('.memory-card').first()).toHaveAttribute('aria-label', /revealed$/);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Moves: 1')).toBeVisible();
    await expect(page.locator('.memory-card').nth(1)).toBeFocused();
    await page.getByLabel('Grid size').selectOption('4');
    await expect(page.locator('.memory-card')).toHaveCount(16);
    await page.locator('.memory-card').first().click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Moves: 1')).toBeVisible();
    width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(640);
    await saveScreenshot(page, 'zoom-four-by-four.png');
    await page.setViewportSize({ width: 640, height: 400 });
    const testProgress = completedSnapshot('np1-4-1');
    await page.getByText('Reproduce a game', { exact: true }).click();
    await page.getByLabel('Snapshot JSON').fill(testProgress);
    await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Every pair found' })).toBeVisible();
    const banner = await page.locator('.win-banner').boundingBox();
    expect(banner).not.toBeNull();
    if (banner === null) throw new Error('The completion banner is missing.');
    expect(banner.x).toBeGreaterThanOrEqual(0);
    expect(banner.x + banner.width).toBeLessThanOrEqual(640);
    await saveScreenshot(page, 'zoom-completion.png');
  } finally {
    await context.close();
  }
});

test('a live win pulses once for 600ms, then its animation finishes', async ({ page }) => {
  await freezePageClock(page);
  await page.goto('/');
  const finalPair = onePairRemainingSnapshot('np1-4-1', 8);
  await page.getByText('Reproduce a game', { exact: true }).click();
  await page.getByLabel('Snapshot JSON').fill(finalPair.json);
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('.memory-card').nth(finalPair.second).click();
  await expect(page.locator('.win-banner')).toHaveClass(/win-banner--pulse/);
  const timing = await page.locator('.win-banner').evaluate((banner) => {
    const animations = banner.getAnimations();
    const animation = animations[0];
    if (animation === undefined) throw new Error('A local win must start one animation.');
    return { count: animations.length, duration: animation.effect?.getComputedTiming().duration, iterations: animation.effect?.getComputedTiming().iterations };
  });
  expect(timing.count).toBe(1);
  expect(timing.duration).toBe(600);
  expect(timing.iterations).toBe(1);
  await page.waitForFunction(() => {
    const banner = document.querySelector('.win-banner');
    return banner !== null && banner.getAnimations().every((animation) => animation.playState === 'finished');
  });
});

test('reduced motion live completion has no pulse or card transition', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await page.getByText('Reproduce a game', { exact: true }).click();
    const finalPair = onePairRemainingSnapshot('np1-4-1', 8);
    await page.getByLabel('Snapshot JSON').fill(finalPair.json);
    await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.locator('.memory-card').nth(finalPair.second).click();
    await expect(page.locator('.win-banner')).toBeVisible();
    const motion = await page.evaluate(() => {
      const banner = document.querySelector('.win-banner');
      const card = document.querySelector('.memory-card');
      if (banner === null || card === null) throw new Error('The game state is missing.');
      return { banner: getComputedStyle(banner).animationName, card: getComputedStyle(card).transitionDuration };
    });
    expect(motion).toEqual({ banner: 'none', card: '0s' });
  } finally {
    await context.close();
  }
});

async function focusedCardInset(page: Page): Promise<{
  left: number;
  right: number;
  top: number;
  bottom: number;
  outline: Readonly<{ width: string; offset: string }>;
}> {
  return page.evaluate(() => {
    const area = document.querySelector('.board-scroll');
    const focused = document.activeElement;
    if (area === null || !(focused instanceof HTMLElement)) throw new Error('Focus left the board.');
    const outer = area.getBoundingClientRect();
    const card = focused.getBoundingClientRect();
    const style = getComputedStyle(focused);
    const left = outer.left + area.clientLeft;
    const top = outer.top + area.clientTop;
    const right = left + area.clientWidth;
    const bottom = top + area.clientHeight;
    return {
      left: Math.round(card.left - left),
      right: Math.round(right - card.right),
      top: Math.round(card.top - top),
      bottom: Math.round(bottom - card.bottom),
      outline: { width: style.outlineWidth, offset: style.outlineOffset },
    };
  });
}

