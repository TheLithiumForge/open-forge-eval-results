import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { completedSnapshot, loadBoard, loadSnapshot, makeSnapshot, pairsForCode } from './helpers.ts';

test('16 by 16 cards remain within the page at both required desktop and phone viewports', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-16-1');
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator('.board-card')).toHaveCount(256);
  let measures = await measureBoard(page);
  expect(measures.documentWidth).toBe(360);
  expect(measures.cardWidth).toBeGreaterThanOrEqual(44);
  expect(measures.cardHeight).toBeGreaterThanOrEqual(44);
  expect(measures.scrollWidth).toBeGreaterThan(measures.clientWidth);
  expect(measures.scrollHeight).toBeGreaterThan(measures.clientHeight);
  expect(measures.gap).toBe('6px');
  expect(measures.padding).toBe('6px');
  expect(measures.maxHeight).toBe(560);

  await focusWithArrows(page, 0, 152, 16);
  await expect(page.locator('.board-card').nth(152)).toBeFocused();
  await expectVisibleOutline(page, 152);

  await page.setViewportSize({ width: 1280, height: 800 });
  measures = await measureBoard(page);
  expect(measures.documentWidth).toBe(1280);
  expect(measures.cardWidth).toBeGreaterThanOrEqual(44);
  expect(measures.cardWidth).toBeLessThanOrEqual(88);
  expect(measures.cardHeight).toBe(measures.cardWidth);
  expect(measures.scrollHeight).toBeGreaterThan(measures.clientHeight);

  await page.locator('.board-card').first().focus();
  for (let step = 0; step < 15; step += 1) await page.keyboard.press('ArrowDown');
  for (let step = 0; step < 15; step += 1) await page.keyboard.press('ArrowRight');
  await expect(page.locator('.board-card').nth(255)).toBeFocused();
  await expectVisibleOutline(page, 255);
});

async function expectVisibleOutline(page: Page, index: number): Promise<void> {
  const outline = await page.locator('.board-card').nth(index).evaluate((card) => {
    const bounds = card.getBoundingClientRect();
    const area = card.closest('.board-scroll-area');
    if (!(area instanceof HTMLElement)) throw new Error('Card has no board scroll area');
    const areaBounds = area.getBoundingClientRect();
    return {
      left: bounds.left - 5 - areaBounds.left,
      right: areaBounds.right - bounds.right - 5,
      top: bounds.top - 5 - areaBounds.top,
      bottom: areaBounds.bottom - bounds.bottom - 5
    };
  });
  expect(outline.left).toBeGreaterThanOrEqual(0);
  expect(outline.right).toBeGreaterThanOrEqual(0);
  expect(outline.top).toBeGreaterThanOrEqual(0);
  expect(outline.bottom).toBeGreaterThanOrEqual(0);
}

async function focusWithArrows(page: Page, from: number, to: number, size: number): Promise<void> {
  await page.locator('.board-card').nth(from).focus();
  let row = Math.floor(from / size);
  let column = from % size;
  const targetRow = Math.floor(to / size);
  const targetColumn = to % size;
  while (row < targetRow) { await page.keyboard.press('ArrowDown'); row += 1; }
  while (row > targetRow) { await page.keyboard.press('ArrowUp'); row -= 1; }
  while (column < targetColumn) { await page.keyboard.press('ArrowRight'); column += 1; }
  while (column > targetColumn) { await page.keyboard.press('ArrowLeft'); column -= 1; }
}

test.describe('200 percent browser zoom equivalent', () => {
  test.use({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });

  test('controls, scores, win summary and both board sizes remain playable', async ({ page }) => {
    await page.goto('/');
    for (const size of [4, 16]) {
      const code = `np1-${size}-1`;
      const pairs = pairsForCode(code);
      await loadSnapshot(page, completedSnapshot(code, pairs.length));
      await expect(page.getByRole('combobox', { name: 'Grid size' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
      const banner = await page.locator('.win-banner').boundingBox();
      const scores = await page.locator('.score-strip').boundingBox();
      if (banner === null || scores === null) throw new Error('Game status bounds are unavailable');
      expect(banner.y).toBeGreaterThanOrEqual(scores.y + scores.height);

      await loadBoard(page, code);
      await expect(page.locator('.board-card')).toHaveCount(size * size);
      const first = page.locator('.board-card').nth(0);
      await first.click();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await expect(page.locator('.score-strip')).toContainText('Moves: 1');
      const metrics = await measureBoard(page);
      expect(metrics.documentWidth).toBe(640);
      expect(metrics.cardWidth).toBeGreaterThanOrEqual(44);
      await focusWithArrows(page, 0, size * size - 1, size);
      await expect(page.locator('.board-card').nth(size * size - 1)).toBeFocused();
      await expectVisibleOutline(page, size * size - 1);
    }
  });
});

test('all 128 shipped faces are visible on a 44 pixel grayscale sheet', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/');
  const code = 'np1-16-1';
  const pairs = pairsForCode(code);
  const matched = pairs.flatMap((pair) => pair.positions);
  await loadSnapshot(page, makeSnapshot(code, matched, pairs.length, 0));
  await expect(page.locator('.face-art')).toHaveCount(256);

  const displayedFaces = pairs.map((pair) => `.board-card:nth-child(${pair.positions[0] + 1})`).join(',');
  await page.addStyleTag({ content: [
    '.board-scroll-area{max-height:none;overflow:visible;filter:grayscale(1)}',
    '.board-shell{width:408px}',
    '.board-scroll-area{width:408px!important}',
    '.board-grid{width:max-content;grid-template-columns:repeat(8,44px)!important;margin:0}',
    '.board-card{display:none!important;width:44px!important;height:44px!important;padding:0!important}',
    `${displayedFaces}{display:grid!important}`
  ].join('\n') });
  await expect(page.locator('.board-card:visible')).toHaveCount(128);
  const firstSelector = displayedFaces.split(',')[0];
  if (firstSelector === undefined) throw new Error('No grayscale faces were selected');
  const width = await page.locator(firstSelector).evaluate((card) => card.getBoundingClientRect().width);
  expect(width).toBe(44);
  const sheet = await page.locator('.board-scroll-area').boundingBox();
  if (sheet === null) throw new Error('Grayscale sheet is not visible');
  expect(sheet.width).toBeGreaterThanOrEqual(408);
  expect(sheet.height).toBeGreaterThanOrEqual(800);
  const lastSelector = displayedFaces.split(',').at(-1);
  if (lastSelector === undefined) throw new Error('No grayscale faces were selected');
  const last = await page.locator(lastSelector).boundingBox();
  if (last === null) throw new Error('Last grayscale face is not visible');
  expect(last.x + last.width).toBeLessThanOrEqual(sheet.x + sheet.width);
  expect(last.y + last.height).toBeLessThanOrEqual(sheet.y + sheet.height);
  mkdirSync(resolve('evidence'), { recursive: true });
  await page.locator('.board-scroll-area').screenshot({ path: resolve('evidence/faces-128-grayscale.png') });
});

async function measureBoard(page: Page) {
  return page.evaluate(() => {
    const area = document.querySelector('.board-scroll-area');
    const grid = document.querySelector('.board-grid');
    const card = document.querySelector('.board-card');
    if (!(area instanceof HTMLElement) || !(grid instanceof HTMLElement) || !(card instanceof HTMLElement)) {
      throw new Error('Board layout is missing');
    }
    const style = getComputedStyle(area);
    const bounds = card.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      clientWidth: area.clientWidth,
      clientHeight: area.clientHeight,
      scrollWidth: area.scrollWidth,
      scrollHeight: area.scrollHeight,
      cardWidth: bounds.width,
      cardHeight: bounds.height,
      gap: getComputedStyle(grid).gap,
      padding: style.padding,
      maxHeight: Number.parseFloat(style.maxHeight)
    };
  });
}
