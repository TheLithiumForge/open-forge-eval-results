import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Face, faceName } from '../src/game/board/Face.tsx';
import { cards, completed, loadBoard, loadSnapshot, win } from './helpers.ts';

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test(`16x16 scroll and complete focus outlines at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 640 ? 2 : 1, hasTouch: true });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173'); await loadBoard(page, 16);
    await expect(cards(page)).toHaveCount(256);
    const metrics = await page.evaluate(() => {
      const area = document.querySelector('.board-scroll');
      const card = document.querySelector('.card');
      if (!area || !card) throw new Error('Missing board');
      const box = card.getBoundingClientRect();
      return { width: document.documentElement.scrollWidth, viewport: innerWidth,
        height: area.clientHeight, limit: Math.min(innerHeight * 0.7, 768), cardWidth: box.width, cardHeight: box.height };
    });
    expect(metrics.width).toBeLessThanOrEqual(metrics.viewport);
    expect(metrics.height).toBeLessThanOrEqual(metrics.limit + 1);
    expect(metrics.cardWidth).toBeGreaterThanOrEqual(44);
    expect(metrics.cardWidth).toBeLessThanOrEqual(88);
    expect(metrics.cardHeight).toBeCloseTo(metrics.cardWidth, 1);
    await cards(page).first().focus();
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowDown');
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight');
    await expect(cards(page).last()).toBeFocused();
    for (const index of [255, 119, 0]) {
      await cards(page).nth(index).focus();
      const contained = await cards(page).nth(index).evaluate(element => {
        const area = element.closest('.board-scroll');
        if (!area) return false;
        const outer = area.getBoundingClientRect();
        const inner = element.getBoundingClientRect();
        return inner.left - 5 >= outer.left && inner.right + 5 <= outer.right
          && inner.top - 5 >= outer.top && inner.bottom + 5 <= outer.bottom;
      });
      expect(contained).toBe(true);
    }
    await page.locator('.board-scroll').evaluate(element => { element.scrollLeft = element.scrollWidth; element.scrollTop = element.scrollHeight; });
    await cards(page).last().tap(); await expect(cards(page).last()).toHaveAccessibleName(/revealed$/);
    await page.getByRole('button', { name: 'New Game', exact: true }).click();
    await expect(cards(page)).toHaveCount(256);
    await loadBoard(page);
    await win(page, 4, true);
    await expect(page.locator('.win-banner')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  });
}
test('reduced motion, exact colors, card dimensions and static completed import', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/'); await loadBoard(page);
  expect(await page.locator('body').evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(9, 11, 20)');
  expect(await cards(page).first().evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  await win(page);
  expect(await page.locator('.win-banner').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadSnapshot(page, completed());
  expect(await page.locator('.win-banner').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await win(page);
  expect(await page.locator('.win-banner').evaluate(element => getComputedStyle(element).animationDuration)).toBe('0.6s');
  await page.waitForTimeout(650);
  expect(await page.locator('.win-banner').evaluate(element => element.getAnimations().length)).toBe(0);
});
test('128 distinct faces have a labeled 44px grayscale inspection sheet', async ({ page }) => {
  const names = new Set(Array.from({ length: 128 }, (_, id) => faceName(id)));
  expect(names.size).toBe(128);
  expect(faceName(0)).toBe('cyan solid circle, marker top');
  expect(faceName(64)).toBe('cyan outline circle, marker top');
  const faces = Array.from({ length: 128 }, (_, id) => `<figure><div>${renderToStaticMarkup(createElement(Face, { id }))}</div><figcaption>${id}</figcaption></figure>`).join('');
  await page.setViewportSize({ width: 860, height: 800 });
  await page.setContent(`<html><head><title>Neon Pairs face inspection</title><style>
    body{margin:16px;background:#090B14;color:#F4F6FF;font:14px system-ui}main{display:grid;grid-template-columns:repeat(16,44px);gap:6px}
    figure{margin:0;text-align:center}figure div{width:44px;height:44px;background:#111625;filter:grayscale(1)}svg{width:44px;height:44px}
    h1{font-size:24px}p{color:#B8BDD2}</style></head><body><h1>128 faces · 44px · grayscale</h1>
    <p>Rows 0–63: solid. Rows 64–127: outline. Every marker has a dark separating stroke.</p><main>${faces}</main></body></html>`);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/faces-grayscale.png', fullPage: true });
  await writeFile('artifacts/faces-grayscale.html', await page.content());
  await expect(page.locator('svg')).toHaveCount(128);
});
