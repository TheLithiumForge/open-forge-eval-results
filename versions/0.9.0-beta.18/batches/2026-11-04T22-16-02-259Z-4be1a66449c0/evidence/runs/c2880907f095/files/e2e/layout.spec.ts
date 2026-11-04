import { expect, test } from '@playwright/test';

test('16x16 remains within the page and keeps its 44px cards at narrow and zoom-equivalent widths', async ({ page, browser }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByLabel('Grid size').selectOption('16');
  const board = page.locator('[aria-label="Game board"]');
  await expect(board.locator('button')).toHaveCount(256);
  const desktop = await page.locator('.card').first().evaluate((card) => card.getBoundingClientRect().width);
  expect(desktop).toBeGreaterThanOrEqual(44);
  expect(desktop).toBeLessThanOrEqual(88);

  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByLabel('Grid size').selectOption('4');
  const defaultGrid = await board.evaluate((area) => ({
    scrollWidth: area.scrollWidth,
    clientWidth: area.clientWidth,
    pageWidth: area.ownerDocument.documentElement.scrollWidth,
  }));
  expect(defaultGrid.scrollWidth).toBe(defaultGrid.clientWidth);
  expect(defaultGrid.pageWidth).toBeLessThanOrEqual(360);
  await page.getByLabel('Grid size').selectOption('16');
  const mobile = await page.locator('.card').first().evaluate((card) => {
    const scroll = card.parentElement?.parentElement;
    const rectangle = card.getBoundingClientRect();
    return {
      width: rectangle.width,
      height: rectangle.height,
      pageWidth: card.ownerDocument.documentElement.scrollWidth,
      viewportWidth: card.ownerDocument.documentElement.clientWidth,
      scrollWidth: scroll?.scrollWidth ?? 0,
      clientWidth: scroll?.clientWidth ?? 0,
    };
  });
  expect(mobile.width).toBeGreaterThanOrEqual(44);
  expect(mobile.height).toBeGreaterThanOrEqual(44);
  expect(mobile.pageWidth).toBeLessThanOrEqual(mobile.viewportWidth);
  expect(mobile.scrollWidth).toBeGreaterThan(mobile.clientWidth);
  await page.locator('.card').first().focus();
  for (let count = 0; count < 15; count += 1) await page.keyboard.press('ArrowDown');
  for (let count = 0; count < 15; count += 1) await page.keyboard.press('ArrowRight');
  const lastMobileCard = page.getByRole('button', { name: 'Row 16, column 16, closed' });
  await expect(lastMobileCard).toBeFocused();
  const mobileFocus = await lastMobileCard.evaluate((card) => {
    const area = card.parentElement?.parentElement;
    const cardRect = card.getBoundingClientRect();
    const areaRect = area?.getBoundingClientRect();
    return { left: cardRect.left - (areaRect?.left ?? 0), right: (areaRect?.right ?? 0) - cardRect.right };
  });
  expect(mobileFocus.left).toBeGreaterThanOrEqual(6);
  expect(mobileFocus.right).toBeGreaterThanOrEqual(6);

  const zoomContext = await browser.newContext({
    viewport: { width: 640, height: 400 },
    deviceScaleFactor: 2,
    baseURL: 'http://127.0.0.1:4173',
  });
  const zoomPage = await zoomContext.newPage();
  await zoomPage.goto('/');
  await zoomPage.getByLabel('Grid size').selectOption('16');
  const zoomBoard = zoomPage.locator('[aria-label="Game board"]');
  await expect(zoomBoard.locator('button')).toHaveCount(256);
  await zoomPage.locator('.card').last().focus();
  const zoom = await zoomPage.locator('.card').last().evaluate((card) => ({
    width: card.getBoundingClientRect().width,
    pageWidth: card.ownerDocument.documentElement.scrollWidth,
    viewportWidth: card.ownerDocument.documentElement.clientWidth,
  }));
  expect(zoom.width).toBeGreaterThanOrEqual(44);
  expect(zoom.pageWidth).toBeLessThanOrEqual(zoom.viewportWidth);
  await expect(zoomBoard.locator('button').last()).toBeFocused();
  await zoomContext.close();
});
