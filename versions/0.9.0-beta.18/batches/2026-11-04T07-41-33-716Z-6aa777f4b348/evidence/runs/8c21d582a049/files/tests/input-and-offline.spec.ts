import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { cards, exported, finish, loadBoard, openGame, statistics } from './game.ts';
import { swipe } from './touch.ts';

test('hidden cards disclose only positions; hover, right-click and pointer cancellation do not reveal (A08, I01–I04)', async ({ page }) => {
  await openGame(page); await loadBoard(page);
  const backs = await cards(page).evaluateAll(elements => elements.map(element => ({
    name: element.getAttribute('aria-label'), svg: element.querySelector('svg')?.outerHTML,
    attributes: element.getAttributeNames(),
  })));
  expect(new Set(backs.map(back => back.svg)).size).toBe(1);
  expect(backs.every(back => back.name?.endsWith('closed'))).toBe(true);
  expect(backs.every(back => back.attributes.every(name => !/face|seed|deck|data-/i.test(name)))).toBe(true);
  await expect(cards(page).locator('circle')).toHaveCount(0);
  await cards(page).first().hover();
  await cards(page).first().dispatchEvent('pointercancel', { pointerType: 'touch', pointerId: 1 });
  await cards(page).first().evaluate(element => {
    element.addEventListener('contextmenu', event => { element.setAttribute('data-test-menu', String(event.defaultPrevented)); });
  });
  await cards(page).first().click({ button: 'right' });
  await expect(cards(page).first()).toHaveAttribute('data-test-menu', 'false');
  await expect(cards(page).first()).toHaveAccessibleName('Row 1, column 1, closed');
  expect((await exported(page)).started).toBe(false);
  await page.keyboard.press('Escape');
  await cards(page).first().click();
  await expect(cards(page).first()).toHaveAccessibleName(/revealed$/);
});

test('completed touch taps and native touch scrolling reach first and last cards (I01, V19)', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await openGame(page); await loadBoard(page, 'np1-16-1');
  await cards(page).first().tap();
  await expect(cards(page).first()).toHaveAccessibleName(/revealed$/);
  const board = page.locator('.board-scroll');
  await board.scrollIntoViewIfNeeded();
  const rect = await board.boundingBox();
  if (!rect) throw new Error('Board is visible');
  const client = await context.newCDPSession(page);
  await swipe(client, 300, rect.y + 250, -250, 0);
  await swipe(client, 300, rect.y + 250, -250, 0);
  await swipe(client, 180, rect.y + 450, 0, -300);
  const scrolled = await board.evaluate(element => ({ x: element.scrollLeft, y: element.scrollTop }));
  expect(scrolled.x).toBeGreaterThan(0); expect(scrolled.y).toBeGreaterThan(0);
  await expect(cards(page).last()).toBeInViewport({ ratio: 1 });
  await cards(page).last().tap();
  await expect(cards(page).last()).toBeFocused();
  await swipe(client, 40, rect.y + 250, 250, 0);
  await swipe(client, 40, rect.y + 250, 250, 0);
  await swipe(client, 180, rect.y + 150, 0, 300);
  await expect(cards(page).first()).toBeInViewport({ ratio: 1 });
  await cards(page).first().tap();
  await expect(cards(page).first()).toBeFocused();
  await context.close();
});

test('the built HTML plays and resets directly from disk with networking blocked (T08, S01–S02)', async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  await context.route(/^https?:/, route => route.abort());
  const page = await context.newPage();
  const errors: string[] = []; const requests: string[] = [];
  page.on('pageerror', error => { errors.push(error.message); });
  page.on('request', request => { requests.push(request.url()); });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await expect(cards(page)).toHaveCount(16);
  await loadBoard(page); await finish(page, 'np1-4-1');
  await expect(statistics(page)).toContainText('Pairs: 8/8');
  await expect(page.locator('audio, video, canvas, script[src], link[href], img[src]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(statistics(page)).toContainText('Moves: 0');
  expect(errors).toEqual([]);
  expect(requests.filter(url => !url.startsWith('file:'))).toEqual([]);
  await context.close();
});
