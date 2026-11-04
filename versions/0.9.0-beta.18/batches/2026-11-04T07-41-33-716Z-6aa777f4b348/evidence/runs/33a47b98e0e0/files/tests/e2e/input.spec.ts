import { expect, test } from '@playwright/test';
import { boardFor, cardAt, finishByPointer, keyboardMoveTo, loadBoard, observeAnnouncements, announcedTexts, pairPositions } from './helpers.ts';

test('Enter then Space activates a matched pair through the native buttons once each', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  const pair = pairPositions(boardFor('np1-4-1'))[2];
  if (pair === undefined || pair[0] === undefined || pair[1] === undefined) throw new Error('Keyboard pair fixture missing');
  await page.locator('.reproduction-panel summary').click();
  await cardAt(page, pair[0]).focus();
  await page.keyboard.press('Enter');
  await expect(cardAt(page, pair[0])).toHaveAttribute('aria-label', /revealed$/);
  await keyboardMoveTo(page, pair[0], pair[1], 4);
  await page.keyboard.press('Space');
  await expect(cardAt(page, pair[1])).toHaveAttribute('aria-label', /matched$/);
  await expect(page.locator('.status-readout')).toContainText('Moves: 1');
  await expect(page.locator('.status-readout')).toContainText('Pairs: 1/8');
});

test('repeats identical miss announcements, keeps focus and clock changes silent, and combines the win', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60_000));
  await observeAnnouncements(page);
  await cardAt(page, 0).focus();
  await page.keyboard.press('ArrowRight');
  await page.clock.runFor(1_000);
  expect(await announcedTexts(page)).toEqual([]);
  await cardAt(page, 0).click();
  await cardAt(page, 1).click();
  await page.clock.runFor(800);
  expect(await announcedTexts(page)).toEqual(['No match. Cards close after a short pause.']);
  await cardAt(page, 0).click();
  await cardAt(page, 1).click();
  expect(await announcedTexts(page)).toEqual([
    'No match. Cards close after a short pause.',
    'No match. Cards close after a short pause.',
  ]);
  await page.clock.runFor(800);
  expect(await announcedTexts(page)).toHaveLength(2);
  await finishByPointer(page, 'np1-4-1');
  const events = await announcedTexts(page);
  expect(events).toHaveLength(10);
  expect(events[0]).toBe(events[1]);
  expect(events[9]).toMatch(/^Pair found\. All pairs found in 10 moves and \d+:\d{2}\.$/);
});

test('a hidden document pauses its remaining mismatch interval until visible', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await loadBoard(page, 'np1-4-1');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60_000));
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => document.documentElement.dataset.simulatedVisibility ?? 'visible',
    });
  });
  await cardAt(page, 0).click();
  await cardAt(page, 1).click();
  await page.clock.runFor(300);
  await page.evaluate(() => {
    document.documentElement.dataset.simulatedVisibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5_000);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue(/"elapsedMs": 300/);
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue(/"remainingMs": 500/);
  await page.evaluate(() => {
    document.documentElement.dataset.simulatedVisibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue(/"remainingMs": 1/);
  await page.clock.runFor(1);
  await expect(cardAt(page, 0)).toHaveAttribute('aria-label', 'Row 1, column 1, closed');
});

test('touch gestures scroll the sixteen column board and can reach both ends', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await page.getByLabel('Grid size').selectOption('16');
    const board = await page.locator('.board-scroll').boundingBox();
    if (board === null) throw new Error('Board scroll area is missing');
    const session = await context.newCDPSession(page);
    const start = { x: board.x + board.width - 20, y: board.y + 100 };
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ ...start, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: start.x - 180, y: start.y - 180, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: start.x - 240, y: start.y - 240, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
    const scrollArea = page.locator('.board-scroll');
    await expect.poll(() => scrollArea.evaluate((area) => area.scrollLeft)).toBeGreaterThan(0);
    await expect.poll(() => scrollArea.evaluate((area) => area.scrollTop)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await cardAt(page, 0).tap();
    await expect(cardAt(page, 0)).toHaveAttribute('aria-label', /revealed$/);
    await cardAt(page, 255).tap();
    await expect(cardAt(page, 255)).toHaveAttribute('aria-label', /revealed$/);
  } finally {
    await context.close();
  }
});
