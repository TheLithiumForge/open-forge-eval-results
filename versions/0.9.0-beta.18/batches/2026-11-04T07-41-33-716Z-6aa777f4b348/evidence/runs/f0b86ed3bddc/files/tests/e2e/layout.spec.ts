import { writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { Face } from '../../src/game/board/Face.tsx';
import { describeFace } from '../../src/game/board/faces.ts';
import { touchScroll } from './touch.ts';
import { CARDS, keyboardTo, loadBoard, finish } from './helpers.ts';

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test(`16x16 layout and complete focus outlines at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 640 ? 2 : 1, hasTouch: true });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173');
    await loadBoard(page, 'np1-16-1');
    await expect(page.locator(CARDS)).toHaveCount(256);
    const measurements = await page.locator(CARDS).evaluateAll(cards => cards.map(card => {
      const rect = card.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }));
    for (const card of measurements) {
      expect(card.width).toBeGreaterThanOrEqual(44);
      expect(Math.abs(card.width - card.height)).toBeLessThan(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator(CARDS).nth(0).focus();
    await keyboardTo(page, 136);
    await assertOutline(page);
    await keyboardTo(page, 255);
    await assertOutline(page);
    await page.keyboard.press('Enter');
    await expect(page.locator(CARDS).nth(255)).toHaveClass(/revealed/);
    await keyboardTo(page, 0);
    await assertOutline(page);
    const touch = await context.newCDPSession(page);
    await touchScroll(page, touch, true);
    expect(await page.locator('.board-scroll').evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await page.locator(CARDS).nth(255).tap();
    await expect(page.locator(CARDS).nth(255)).toHaveClass(/revealed/);
    await touchScroll(page, touch, false);
    await page.locator(CARDS).nth(0).tap();
    await expect(page.locator(CARDS).nth(0)).toHaveClass(/revealed/);
    await page.screenshot({ path: `evidence/board-16-${viewport.width}.png`, fullPage: true });
    await loadBoard(page);
    await page.locator(CARDS).nth(0).tap();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.board-scroll').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await loadBoard(page);
    await finish(page, 'np1-4-1', true);
    await expect(page.locator('.win-banner')).toContainText('8 moves');
    await page.screenshot({ path: `evidence/board-4-win-${viewport.width}.png`, fullPage: true });
    await context.close();
  });
}
async function assertOutline(page: import('@playwright/test').Page): Promise<void> {
  const box = await page.locator('.board-scroll').evaluate(element => {
    const card = document.activeElement;
    if (!(card instanceof HTMLButtonElement)) throw new Error('Card must be focused');
    const a = element.getBoundingClientRect();
    const b = card.getBoundingClientRect();
    return { left: b.left - a.left, top: b.top - a.top, right: a.right - b.right, bottom: a.bottom - b.bottom };
  });
  for (const margin of Object.values(box)) expect(margin).toBeGreaterThanOrEqual(5);
}
test('44px grayscale face sheet contains all 128 identities', async ({ page }) => {
  const faces = Array.from({ length: 128 }, (_, id) => `<figure>${renderToStaticMarkup(createElement(Face, { id }))}
    <figcaption>${id}: ${describeFace(id).name}</figcaption></figure>`).join('');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>128 faces at 44px in grayscale</title>
    <style>body{background:#090B14;color:#F4F6FF;font:12px system-ui;margin:16px}main{display:grid;grid-template-columns:repeat(8,112px);gap:8px}
    figure{margin:0;min-height:112px}svg{display:block;width:44px;height:44px;background:#111625;filter:grayscale(1)}figcaption{margin-top:4px}</style>
    <h1>128 faces · 44px · grayscale</h1><main>${faces}</main></html>`;
  await writeFile('evidence/faces-grayscale.html', html);
  await page.setViewportSize({ width: 992, height: 800 });
  await page.setContent(html);
  await expect(page.locator('svg')).toHaveCount(128);
  await page.screenshot({ path: 'evidence/faces-grayscale.png', fullPage: true });
});
test('completion pulses once, respects reduced motion, and stays silent', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await finish(page);
  await expect(page.locator('.win-banner')).toHaveCSS('animation-duration', '0.6s');
  await expect(page.locator('.win-banner')).toHaveCSS('animation-iteration-count', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
  await expect(page.locator(CARDS).first()).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('audio, video')).toHaveCount(0);
});
