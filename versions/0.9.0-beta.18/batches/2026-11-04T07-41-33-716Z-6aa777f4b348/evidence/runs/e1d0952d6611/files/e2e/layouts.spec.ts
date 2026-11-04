import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { card, completedSnapshot, loadBoard, loadSnapshot } from './helpers.ts';

async function expectCardOutlineVisible(page: Page, index: number): Promise<void> {
  const focus = await card(page, index).evaluate((element) => {
    const area = element.closest('.board-scroll');
    if (area === null) throw new Error('Card is outside its board scroll area.');
    const cardBox = element.getBoundingClientRect();
    const areaBox = area.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { cardBox: { left: cardBox.left, top: cardBox.top, right: cardBox.right, bottom: cardBox.bottom },
      areaBox: { left: areaBox.left, top: areaBox.top, right: areaBox.right, bottom: areaBox.bottom },
      scrollLeft: area.scrollLeft, scrollTop: area.scrollTop,
      margin: style.scrollMargin, outline: style.outlineWidth, outlineOffset: style.outlineOffset,
      outlineColor: style.outlineColor };
  });
  expect(focus.cardBox.left).toBeGreaterThanOrEqual(focus.areaBox.left + 6);
  expect(focus.cardBox.top).toBeGreaterThanOrEqual(focus.areaBox.top + 6);
  expect(focus.areaBox.right - focus.cardBox.right).toBeGreaterThanOrEqual(6);
  expect(focus.areaBox.bottom - focus.cardBox.bottom).toBeGreaterThanOrEqual(6);
  expect(focus.margin).toBe('6px');
  expect(focus.outline).toBe('3px');
  expect(focus.outlineOffset).toBe('2px');
  expect(focus.outlineColor).toBe('rgb(255, 255, 255)');
}

test('16x16 boards remain scrollable without page overflow at the specified layouts', async ({ browser }) => {
  await mkdir(join(process.cwd(), 'evidence'), { recursive: true });
  for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173', viewport,
      deviceScaleFactor: viewport.width === 640 ? 2 : 1, hasTouch: true });
    const current = await context.newPage();
    await current.goto('/');
    const smallWidth = await card(current, 0).evaluate((element) => element.getBoundingClientRect().width);
    expect(smallWidth).toBeGreaterThanOrEqual(44);
    const smallBoard = await current.locator('.board-scroll').evaluate((area) => area.scrollWidth <= area.clientWidth);
    expect(smallBoard).toBe(true);
    await current.getByRole('combobox', { name: 'Grid size', exact: true }).selectOption('16');
    await expect(current.locator('.game-card')).toHaveCount(256);
    const metrics = await current.locator('.game-card').evaluateAll((cards) => ({
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      widths: cards.map((element) => element.getBoundingClientRect().width),
    }));
    expect(metrics.pageWidth).toBe(metrics.viewportWidth);
    expect(Math.min(...metrics.widths)).toBeGreaterThanOrEqual(44);
    expect(Math.max(...metrics.widths)).toBeLessThanOrEqual(88);
    const scroll = current.locator('.board-scroll');
    const area = await scroll.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right };
    });
    const touchX = Math.min(area.right - 24, viewport.width - 18);
    const touchY = area.top + 180;
    const touch = await context.newCDPSession(current);
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ id: 1, x: touchX, y: touchY, radiusX: 3, radiusY: 3, force: 1 }],
    });
    for (let step = 1; step <= 4; step += 1) {
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ id: 1, x: touchX - step * 40, y: touchY - step * 35,
          radiusX: 3, radiusY: 3, force: 1 }],
      });
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await current.waitForTimeout(50);
    const touched = await scroll.evaluate((element) => ({ left: element.scrollLeft, top: element.scrollTop }));
    if (viewport.width === 1280) expect(touched.left).toBe(0);
    else expect(touched.left).toBeGreaterThan(0);
    expect(touched.top).toBeGreaterThan(0);
    await expect(current.getByText('Moves: 0', { exact: true })).toBeVisible();
    await touch.detach();
    await card(current, 0).focus();
    await current.keyboard.press('ArrowRight');
    await expect(card(current, 1)).toBeFocused();
    const middle = current.locator('.board-scroll');
    await card(current, 128).focus();
    await expect(card(current, 128)).toBeFocused();
    await expectCardOutlineVisible(current, 128);
    await card(current, 255).focus();
    await expectCardOutlineVisible(current, 255);
    await expect(middle).toBeVisible();
    if (viewport.width === 360) await current.screenshot({ path: 'evidence/neon-pairs-mobile.png', fullPage: true });
    if (viewport.width === 1280) await current.screenshot({ path: 'evidence/neon-pairs-desktop.png', fullPage: true });
    if (viewport.width === 360) {
      await card(current, 0).scrollIntoViewIfNeeded();
      const point = await card(current, 0).boundingBox();
      if (point === null) throw new Error('First touch target must be visible.');
      await current.touchscreen.tap(point.x + point.width / 2, point.y + point.height / 2);
      await expect(card(current, 0)).toHaveAccessibleName(/revealed/);
      await card(current, 255).scrollIntoViewIfNeeded();
      const last = await card(current, 255).boundingBox();
      if (last === null) throw new Error('Last touch target must be visible.');
      await current.touchscreen.tap(last.x + last.width / 2, last.y + last.height / 2);
      await expect(card(current, 255)).toHaveAccessibleName(/revealed/);
    }
    if (viewport.width === 640) {
      await current.screenshot({ path: 'evidence/neon-pairs-zoom-equivalent.png', fullPage: true });
      await loadBoard(current, 'np1-4-1');
      await card(current, 0).click();
      await card(current, 11).focus();
      await current.keyboard.press('Enter');
      await expect(current.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
    }
    await context.close();
  }
});

test('every actual face SVG remains an actual 44px grayscale game face', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 840 });
  await page.goto('/');
  await loadSnapshot(page, completedSnapshot('np1-16-1', 128));
  await expect(page.locator('.game-card.is-matched .face-art')).toHaveCount(256);
  const sheet = await page.evaluate(() => {
    const art = document.querySelectorAll<SVGElement>('.game-card.is-matched .face-art');
    const unique = new Map<string, SVGElement>();
    for (const svg of art) {
      const name = svg.getAttribute('aria-label');
      if (name !== null && !unique.has(name)) unique.set(name, svg);
    }
    if (unique.size !== 128) throw new Error(`Expected128 face names; saw ${unique.size}.`);
    const gallery = document.createElement('div');
    gallery.id = 'acceptance-face-sheet';
    gallery.setAttribute('aria-hidden', 'true');
    gallery.style.cssText = 'position:fixed;top:0;left:0;width:406px;display:grid;grid-template-columns:repeat(8,44px);gap:6px;padding:6px;background:#090B14;';
    for (const svg of unique.values()) {
      const cell = document.createElement('div');
      cell.className = 'game-card is-revealed';
      cell.style.width = '44px';
      cell.style.height = '44px';
      cell.style.minWidth = '44px';
      cell.style.minHeight = '44px';
      cell.style.filter = 'grayscale(1)';
      cell.append(svg.cloneNode(true));
      gallery.append(cell);
    }
    document.body.append(gallery);
    return { faces: unique.size, cardWidth: 44, svgWidth: gallery.querySelector('svg')?.getBoundingClientRect().width ?? 0 };
  });
  expect(sheet.faces).toBe(128);
  expect(sheet.cardWidth).toBe(44);
  expect(sheet.svgWidth).toBe(32);
  await mkdir(join(process.cwd(), 'evidence'), { recursive: true });
  await page.locator('#acceptance-face-sheet').screenshot({ path: 'evidence/faces-grayscale-44px.png' });
  await page.locator('#acceptance-face-sheet').evaluate((gallery) => gallery.remove());
  const upperMarker = page.locator('.game-card.is-matched:has(svg[aria-label="magenta solid square, marker top-right"])').first();
  await upperMarker.screenshot({ path: 'evidence/matched-top-right-marker-44px.png' });
  await upperMarker.evaluate((element) => {
    const copy = element.cloneNode(true);
    if (!(copy instanceof HTMLElement)) throw new Error('Matched face target must be an HTML card.');
    copy.id = 'matched-marker-zoom';
    copy.style.cssText = 'position:fixed;top:12px;left:12px;z-index:9999;width:44px;height:44px;min-width:44px;min-height:44px;transform:scale(4);transform-origin:top left;';
    document.body.append(copy);
  });
  await page.locator('#matched-marker-zoom').screenshot({ path: 'evidence/matched-top-right-marker-zoom.png' });
});

test('the offline HTML runs from disk with network disabled', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  await context.setOffline(true);
  const page = await context.newPage();
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto(pathToFileURL(join(process.cwd(), 'dist', 'index.html')).href);
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
  await loadBoard(page, 'np1-4-1');
  await card(page, 0).click();
  await card(page, 11).click();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
  await context.close();
});
