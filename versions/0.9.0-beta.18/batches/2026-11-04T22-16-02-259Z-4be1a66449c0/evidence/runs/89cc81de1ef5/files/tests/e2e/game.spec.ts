import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('offline HTML runs the 4x4 keyboard journey and exposes its accessibility tree', async ({ page }) => {
  await page.route('http://**/*', (route) => route.abort());
  await page.route('https://**/*', (route) => route.abort());
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
  const gridSize = page.getByLabel('Grid size');
  const newGame = page.getByRole('button', { name: 'New Game' });
  await expect(gridSize).toHaveValue('4');
  await expect(newGame).toBeVisible();
  const reproduction = page.getByText('Reproduce a game');
  await reproduction.click();
  await page.getByLabel('Board code').fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board' }).click();
  await reproduction.click();
  const summary = page.getByRole('group', { name: '4 by 4 card board' });
  let tree = await page.getByRole('main').ariaSnapshot();
  expect(tree).toContain('Grid size');
  expect(tree).toContain('New Game');

  await gridSize.focus();
  await page.keyboard.press('Tab');
  await expect(newGame).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const cards = summary.getByRole('button');
  await expect(cards.nth(0)).toBeFocused();
  tree = await summary.ariaSnapshot();
  expect(tree).toContain('Row 1, column 1, closed');
  expect(await cards.nth(0).evaluate((button) => button.outerHTML)).not.toContain('<svg');

  const pairs = [[0, 11], [1, 9], [2, 6], [4, 5], [3, 7], [8, 15], [10, 14], [12, 13]] as const;
  let current = 0;
  for (const [first, second] of pairs) {
    current = await moveTo(page, current, first);
    await page.keyboard.press('Enter');
    if (first === 0) {
      await expect(cards.nth(first)).toHaveAttribute('aria-label', 'Row 1, column 1, rose solid plus, marker top, revealed');
      expect(await summary.ariaSnapshot()).toContain('rose solid plus, marker top');
    }
    current = await moveTo(page, first, second);
    await page.keyboard.press('Space');
  }
  await expect(page.getByRole('status')).toHaveText(/Pair found\. All pairs found in 8 moves and \d+:\d{2}\./);
  await expect(page.getByText('All pairs found!')).toBeVisible();
  await expect(cards.nth(13)).toHaveAttribute('aria-disabled', 'true');
  expect(await page.locator('.win-banner').evaluate((element) => getComputedStyle(element).animationDuration)).toBe('0.6s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.win-banner').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  tree = await page.getByRole('main').ariaSnapshot();
  expect(tree).toContain('Moves: 8');
  expect(tree).toContain('Pairs: 8/8');
  expect(tree).toContain('All pairs found!');
});

test('snapshot import pauses, Resume restores focus, and preferences persist on HTTP', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.getByLabel('Grid size').selectOption('6');
  await expect(page.getByRole('group', { name: '6 by 6 card board' })).toBeVisible();
  const details = page.getByText('Reproduce a game');
  await details.click();
  await page.getByLabel('Board code').fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board' }).click();
  const originalBoard = page.getByRole('group', { name: '4 by 4 card board' });
  await page.getByLabel('Board code').fill('not-a-board');
  await page.getByRole('button', { name: 'Load board' }).click();
  await expect(page.getByRole('status')).toHaveText('Invalid board code.');
  await expect(originalBoard.getByRole('button').nth(0)).toHaveAttribute('aria-label', 'Row 1, column 1, closed');
  await page.getByLabel('Board code').fill('np1-4-1');
  const snapshot = JSON.stringify({
    version: 1,
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 800 },
    moves: 1,
    elapsedMs: 1500,
    started: true,
  });
  await page.getByLabel('Snapshot JSON').fill('{');
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
  await page.getByLabel('Snapshot JSON').fill(snapshot);
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  const board = page.getByRole('group', { name: '4 by 4 card board' });
  const cards = board.getByRole('button');
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /rose solid plus, marker top, revealed/);
  await cards.nth(4).click();
  await expect(cards.nth(4)).toHaveAttribute('aria-label', 'Row 2, column 1, closed');
  await cards.nth(4).focus();
  await page.keyboard.press('ArrowRight');
  const resume = page.getByRole('button', { name: 'Resume' });
  await resume.click();
  await expect(resume).toHaveCount(0);
  await expect(cards.nth(5)).toBeFocused();
  await expect(cards.nth(0)).toHaveAttribute('aria-label', 'Row 1, column 1, closed', { timeout: 1500 });
  await expect(cards.nth(1)).toHaveAttribute('aria-label', 'Row 1, column 2, closed', { timeout: 1500 });

  await cards.nth(0).click();
  await cards.nth(1).click();
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(cards.nth(0)).toHaveAttribute('aria-label', 'Row 1, column 1, closed');
  await expect(cards.nth(1)).toHaveAttribute('aria-label', 'Row 1, column 2, closed');
  await page.waitForTimeout(850);
  await expect(cards.nth(0)).toHaveAttribute('aria-label', 'Row 1, column 1, closed');

  await page.getByLabel('Grid size').selectOption('6');
  await page.reload();
  await expect(page.getByLabel('Grid size')).toHaveValue('6');
});

test('16x16 board scrolls inside the page at phone, desktop and zoom-sized viewports', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await page.getByLabel('Grid size').selectOption('16');
  const board = page.getByRole('group', { name: '16 by 16 card board' });
  const cards = board.getByRole('button');
  await expect(cards).toHaveCount(256);
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
  let metrics = await boardMetrics(page, cards.nth(0));
  expect(metrics.pageWidth).toBeLessThanOrEqual(360);
  expect(metrics.cardWidth).toBeGreaterThanOrEqual(44);
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const area = await page.locator('.board-scroll').boundingBox();
  if (area === null) throw new Error('Board scroll area should be visible');
  const cdp = await context.newCDPSession(page);
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error('Phone viewport should be set');
  const startX = Math.min(area.x + area.width - 24, viewport.width - 20);
  const startY = Math.min(area.y + area.height - 24, viewport.height - 20);
  for (let gesture = 0; gesture < 5; gesture += 1) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ id: 0, x: startX, y: startY }],
    });
    for (let step = 1; step <= 5; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ id: 0, x: startX - step * 40, y: startY - step * 40 }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await page.waitForTimeout(100);
  const touchScroll = await page.locator('.board-scroll').evaluate((element) => ({
    left: element.scrollLeft, top: element.scrollTop, width: element.scrollWidth,
    height: element.scrollHeight, clientWidth: element.clientWidth, clientHeight: element.clientHeight,
  }));
  expect(touchScroll.left + touchScroll.clientWidth).toBeGreaterThanOrEqual(touchScroll.width - 1);
  expect(touchScroll.top + touchScroll.clientHeight).toBeGreaterThanOrEqual(touchScroll.height - 1);
  const lastCard = await cards.nth(255).boundingBox();
  if (lastCard === null) throw new Error('Last card should be visible after touch scrolling');
  expect(lastCard.x).toBeGreaterThanOrEqual(0);
  expect(lastCard.y).toBeGreaterThanOrEqual(0);
  expect(lastCard.x + lastCard.width).toBeLessThanOrEqual(viewport.width);
  expect(lastCard.y + lastCard.height).toBeLessThanOrEqual(viewport.height);
  await page.locator('.board-scroll').evaluate((element) => element.scrollTo(0, 0));
  await page.evaluate(() => window.scrollTo(0, 0));
  const firstCard = await cards.nth(0).boundingBox();
  if (firstCard === null) throw new Error('First card should be visible after returning the touch scroll to its start');
  expect(firstCard.x).toBeGreaterThanOrEqual(0);
  expect(firstCard.y).toBeGreaterThanOrEqual(0);

  await cards.nth(0).focus();
  for (let step = 0; step < 15; step += 1) await page.keyboard.press('ArrowDown');
  for (let step = 0; step < 15; step += 1) await page.keyboard.press('ArrowRight');
  await expect(cards.nth(255)).toBeFocused();
  metrics = await boardMetrics(page, cards.nth(255));
  expect(metrics.leftInset).toBeGreaterThanOrEqual(5);
  expect(metrics.rightInset).toBeGreaterThanOrEqual(5);
  expect(metrics.pageWidth).toBeLessThanOrEqual(360);

  await page.setViewportSize({ width: 1280, height: 800 });
  metrics = await boardMetrics(page, cards.nth(255));
  expect(metrics.cardWidth).toBeGreaterThanOrEqual(44);
  expect(metrics.pageWidth).toBeLessThanOrEqual(1280);
  await page.setViewportSize({ width: 640, height: 400 });
  await expect(page.getByLabel('Grid size')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
  metrics = await boardMetrics(page, cards.nth(255));
  expect(metrics.cardWidth).toBeGreaterThanOrEqual(44);
  expect(metrics.pageWidth).toBeLessThanOrEqual(640);
  await context.close();
});

test('best moves persist and a completed snapshot cannot replace the local record', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Board code').fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board' }).click();
  const cards = page.getByRole('group', { name: '4 by 4 card board' }).getByRole('button');
  await cards.nth(0).click();
  await cards.nth(1).click();
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
  await page.waitForTimeout(850);
  await playKnownPairs(cards);
  await expect(page.getByText('Best: 9')).toBeVisible();

  await page.getByRole('button', { name: 'Restart' }).click();
  await playKnownPairs(cards);
  await expect(page.getByText('Best: 8')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Best: 8')).toBeVisible();

  await page.getByText('Reproduce a game').click();
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify({
    version: 1,
    boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 9,
    elapsedMs: 0,
    started: true,
  }));
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByText('Best: 8')).toBeVisible();
  await expect(page.locator('.win-banner')).not.toHaveClass(/win-celebrate/);
});

async function moveTo(page: import('@playwright/test').Page, current: number, target: number): Promise<number> {
  const side = 4;
  let row = Math.floor(current / side);
  let column = current % side;
  const targetRow = Math.floor(target / side);
  const targetColumn = target % side;
  while (row < targetRow) { await page.keyboard.press('ArrowDown'); row += 1; }
  while (row > targetRow) { await page.keyboard.press('ArrowUp'); row -= 1; }
  while (column < targetColumn) { await page.keyboard.press('ArrowRight'); column += 1; }
  while (column > targetColumn) { await page.keyboard.press('ArrowLeft'); column -= 1; }
  return target;
}

async function boardMetrics(page: import('@playwright/test').Page, card: import('@playwright/test').Locator) {
  return card.evaluate((element) => {
    const area = element.closest('.board-scroll');
    if (!(area instanceof HTMLElement)) throw new Error('Card should be inside its scroll area');
    const cardRect = element.getBoundingClientRect();
    const areaRect = area.getBoundingClientRect();
    return {
      cardWidth: cardRect.width,
      clientWidth: area.clientWidth,
      clientHeight: area.clientHeight,
      scrollWidth: area.scrollWidth,
      scrollHeight: area.scrollHeight,
      pageWidth: document.documentElement.scrollWidth,
      leftInset: cardRect.left - areaRect.left,
      rightInset: areaRect.right - cardRect.right,
    };
  });
}

async function playKnownPairs(cards: import('@playwright/test').Locator): Promise<void> {
  for (const [first, second] of [[0, 11], [1, 9], [2, 6], [4, 5], [3, 7], [8, 15], [10, 14], [12, 13]] as const) {
    await cards.nth(first).click();
    await cards.nth(second).click();
  }
}
