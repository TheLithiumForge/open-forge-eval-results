import { mkdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { cards, loadBoard, solve } from './helpers.ts';

test('the shipped HTML plays from disk with network blocked and contains no diagnostic endpoints or audio', async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  const requests: string[] = [];
  const errors: string[] = [];
  await context.route(/^https?:/, route => { requests.push(route.request().url()); return route.abort(); });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs', exact: true })).toBeVisible();
  await loadBoard(page);
  await solve(page);
  await expect(page.locator('.win-banner')).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await cards(page).first().click();
  await expect(cards(page).first()).toHaveAccessibleName(/revealed$/);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  expect(readFileSync('dist/index.html', 'utf8')).not.toMatch(/AudioContext|new Audio\(|<audio|<canvas|solver|face-sheet/);
  mkdirSync('evidence', { recursive: true });
  await page.screenshot({ path: 'evidence/offline-desktop.png', fullPage: true });
  await context.close();
});

test('completed touch taps use the native card action', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await loadBoard(page);
  await cards(page).nth(0).tap();
  await cards(page).nth(11).tap();
  await expect(page.locator('.status-strip')).toContainText('Pairs: 1/8');
  await expect(page.locator('.status-strip')).toContainText('Moves: 1');
  await page.getByLabel('Grid size').selectOption('16');
  await page.locator('.board-scroll').evaluate(element => { element.scrollLeft = element.scrollWidth; element.scrollTop = element.scrollHeight; });
  await cards(page).last().tap();
  await expect(cards(page).last()).toHaveAccessibleName(/revealed$/);
  await page.locator('.board-scroll').evaluate(element => { element.scrollLeft = 0; element.scrollTop = 0; });
  await cards(page).first().tap();
  await expect(cards(page).first()).toHaveAccessibleName(/revealed|matched/);
  await context.close();
});
