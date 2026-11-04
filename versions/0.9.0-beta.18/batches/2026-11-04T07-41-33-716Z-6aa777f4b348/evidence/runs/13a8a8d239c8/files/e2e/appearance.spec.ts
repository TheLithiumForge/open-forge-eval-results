import { test, expect } from '@playwright/test';
import type { Browser } from '@playwright/test';
import { parseBoardCode, type GridSize } from '../src/game/board.ts';
import { loadBoard, openReproduction, winPairs } from './helpers.ts';

async function completedSnapshot(size: GridSize): Promise<string> {
  const boardCode = `np1-${size}-1`;
  const board = parseBoardCode(boardCode);
  if (board === null) throw new Error('The fixture board code should be valid.');
  return JSON.stringify({
    version: 1, boardCode, matched: Array.from({ length: board.deck.length }, (_value, index) => index),
    selection: { kind: 'closed' }, moves: board.deck.length / 2,
    elapsedMs: 1_000, started: true,
  });
}

test('sizes the 16x16 board inside its scroll area at phone, desktop and zoom viewports', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-16-1');
  const boardArea = page.locator('.board-scroll');

  for (const viewport of [
    { width: 360, height: 800, minimum: 44 },
    { width: 1280, height: 800, minimum: 44 },
    { width: 640, height: 400, minimum: 44 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const box = await boardArea.boundingBox();
    if (box === null) throw new Error('The board should have a measurable scroll area.');
    const metrics = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      clientHeight: document.querySelector('.board-scroll')?.clientHeight ?? 0,
    }));
    expect(metrics.pageWidth).toBeLessThanOrEqual(viewport.width);
    expect(metrics.clientHeight).toBeLessThanOrEqual(viewport.height * 0.7 + 2);
    expect(box.height).toBeLessThanOrEqual(Math.min(viewport.height * 0.7, 768) + 2);
    await expect(page.locator('.memory-card')).toHaveCount(256);
    expect(await page.locator('.memory-card').first().evaluate((card) => card.getBoundingClientRect().width)).toBeGreaterThanOrEqual(viewport.minimum);
  }

  const first = page.getByRole('button', { name: 'Row 1, column 1, closed' });
  await first.evaluate((element) => element.focus());
  await page.keyboard.press('ArrowLeft');
  await expect(first).toBeFocused();
  for (let step = 0; step < 15; step += 1) await page.keyboard.press('ArrowDown');
  for (let step = 0; step < 15; step += 1) await page.keyboard.press('ArrowRight');
  const last = page.getByRole('button', { name: 'Row 16, column 16, closed' });
  await expect(last).toBeFocused();
  const focusFits = async () => page.evaluate(() => {
    const card = document.activeElement?.getBoundingClientRect();
    const area = document.querySelector('.board-scroll')?.getBoundingClientRect();
    return card && area
      ? card.left - 5 >= area.left + 1 && card.right + 5 <= area.right - 1
        && card.top - 5 >= area.top + 1 && card.bottom + 5 <= area.bottom - 1
      : false;
  });
  expect(await focusFits()).toBe(true);
  for (let step = 0; step < 7; step += 1) await page.keyboard.press('ArrowUp');
  for (let step = 0; step < 7; step += 1) await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('button', { name: 'Row 9, column 9, closed' })).toBeFocused();
  expect(await focusFits()).toBe(true);
  for (let step = 0; step < 7; step += 1) await page.keyboard.press('ArrowDown');
  for (let step = 0; step < 7; step += 1) await page.keyboard.press('ArrowRight');
  await expect(last).toBeFocused();
  expect(await focusFits()).toBe(true);
});

test('keeps 4x4 and 16x16 status and win summary readable at 200 percent layout size', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/');
    for (const size of [4, 16] as const) {
      await openReproduction(page);
      await page.getByLabel('Snapshot JSON').fill(await completedSnapshot(size));
      await page.getByRole('button', { name: 'Load snapshot' }).click();
      await expect(page.locator('.game-summary')).toContainText(`Pairs: ${(size * size) / 2}/${(size * size) / 2}`);
      await expect(page.locator('.win-banner')).toContainText('All pairs found');
      const overlap = await page.evaluate(() => {
        const summary = document.querySelector('.game-summary')?.getBoundingClientRect();
        const banner = document.querySelector('.win-banner')?.getBoundingClientRect();
        return summary && banner ? summary.bottom <= banner.top || banner.bottom <= summary.top : false;
      });
      expect(overlap).toBe(true);
      await page.getByRole('button', { name: 'Restart' }).click();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(640);
  } finally {
    await context.close();
  }
});

test('turns card transitions and completion motion off for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.memory-card').first()).toHaveCSS('transition-property', 'none');
  await loadBoard(page, 'np1-4-1');
  await openReproduction(page);
  await page.getByLabel('Snapshot JSON').fill(await completedSnapshot(4));
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.win-banner')).not.toHaveClass(/pulse/);
  await page.getByRole('button', { name: 'Restart' }).click();
  await winPairs(page, 'np1-4-1');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
});

test('uses one finite pulse after a played win', async ({ page }) => {
  const time = new Date('2026-11-04T00:00:00.000Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  const pairs = new Map<number, number[]>();
  const board = parseBoardCode('np1-4-1');
  if (board === null) throw new Error('The fixture board should be valid.');
  board.deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
  await page.evaluate((positions) => {
    const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('.memory-card'));
    for (const pair of positions) {
      const first = pair[0];
      const second = pair[1];
      if (first !== undefined) cards[first]?.click();
      if (second !== undefined) cards[second]?.click();
    }
  }, [...pairs.values()]);
  const banner = page.locator('.win-banner');
  await expect(banner).toHaveClass(/pulse/);
  await expect(banner).toHaveCSS('animation-duration', '0.6s');
  await expect(banner).toHaveCSS('animation-iteration-count', '1');
  await banner.evaluate((element) => {
    if (!(element instanceof HTMLElement)) throw new Error('The completion banner should be an HTML element.');
    element.getAnimations()[0]?.finish();
  });
  await expect(banner).toHaveCSS('transform', 'none');
});

test('supports a touch-enabled context for scrolling and tapping the 16x16 board', async ({ browser }: { browser: Browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/');
    await loadBoard(page, 'np1-16-1');
    const area = page.locator('.board-scroll');
    const bounds = await area.boundingBox();
    if (bounds === null) throw new Error('The board should have a visible scroll area.');
    const session = await context.newCDPSession(page);
    const x = bounds.x + bounds.width / 2;
    const start = bounds.y + bounds.height * 0.75;
    const end = Math.max(bounds.y + 12, bounds.y + bounds.height * 0.2);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y: start }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x, y: end }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const scrollTop = await area.evaluate((element) => element.scrollTop);
    expect(scrollTop).toBeGreaterThan(0);
    const last = page.getByRole('button', { name: 'Row 16, column 16, closed' });
    await last.tap();
    await expect(page.getByRole('button', { name: /Row 16, column 16, .*revealed/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  } finally {
    await context.close();
  }
});
