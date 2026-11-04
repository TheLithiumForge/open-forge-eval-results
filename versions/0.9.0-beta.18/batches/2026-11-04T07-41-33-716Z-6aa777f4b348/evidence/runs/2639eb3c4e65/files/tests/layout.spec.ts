import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Face } from '../src/game/board/Face.tsx';
import { faceDescription } from '../src/game/board/face.ts';
import { cards, importSnapshot, loadBoard, snapshot } from './helpers.ts';

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test(`large board, scroll and focus outlines at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 640 ? 2 : 1, hasTouch: true });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173');
    await loadBoard(page, 'np1-16-1');
    await expect(cards(page)).toHaveCount(256);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const first = await cards(page).first().boundingBox();
    expect(first?.width).toBeGreaterThanOrEqual(44);
    expect(first?.width).toBeLessThanOrEqual(88);
    expect(first?.width).toBe(first?.height);
    await cards(page).first().focus();
    for (let row = 0; row < 15; row++) await page.keyboard.press('ArrowDown');
    for (let column = 0; column < 15; column++) await page.keyboard.press('ArrowRight');
    await expect(cards(page).last()).toBeFocused();
    for (const index of [255, 119, 0]) {
      await cards(page).nth(index).focus();
      const bounds = await cards(page).nth(index).evaluate(button => {
        const rect = button.getBoundingClientRect();
        const area = button.closest('.board-scroll')?.getBoundingClientRect();
        if (!area) throw new Error('Missing scroll area');
        return { left: rect.left - area.left, right: area.right - rect.right,
          top: rect.top - area.top, bottom: area.bottom - rect.bottom };
      });
      for (const distance of Object.values(bounds)) expect(distance).toBeGreaterThanOrEqual(5);
    }
    // Touch input can scroll the native overflow area without moving the page horizontally.
    await page.locator('.board-scroll').evaluate(area => area.scrollTo({ left: area.scrollWidth, top: area.scrollHeight }));
    await cards(page).last().tap();
    await expect(cards(page).last()).toHaveClass(/revealed/);
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeVisible();
    await loadBoard(page);
    await cards(page).first().tap();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
    await importSnapshot(page, snapshot({ matched: Array.from({ length: 16 }, (_, index) => index), selection: { kind: 'closed' }, moves: 8 }));
    await expect(page.locator('.win-banner')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  });
}

test('reduced motion and a reviewable 44px grayscale face sheet', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await loadBoard(page);
  expect(await cards(page).first().evaluate(button => getComputedStyle(button).transitionDuration)).toBe('0s');
  await importSnapshot(page, snapshot({ matched: [0, 11, 1, 9, 2, 6, 3, 7, 4, 5, 8, 15, 10, 14], selection: { kind: 'closed' }, moves: 7 }));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(12).click();
  await cards(page).nth(13).click();
  expect(await page.locator('.win-banner').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  const sheet = Array.from({ length: 128 }, (_, id) =>
    `<figure title="${faceDescription(id).name}">${renderToStaticMarkup(createElement(Face, { id }))}<figcaption>${id}</figcaption></figure>`).join('');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Neon Pairs — 44px grayscale identities</title>
    <style>body{background:#090B14;color:white;font:14px system-ui;margin:16px}main{display:grid;grid-template-columns:repeat(16,44px);gap:12px}
    figure{margin:0;width:44px}svg{display:block;width:44px;height:44px;background:#111625;filter:grayscale(1)}figcaption{text-align:center}</style>
    <h1>All 128 identities · 44px · grayscale</h1><main>${sheet}</main></html>`;
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/face-sheet.html', html);
  await page.setViewportSize({ width: 960, height: 720 });
  await page.setContent(html);
  await page.screenshot({ path: 'evidence/face-sheet.png', fullPage: true });
  await testInfo.attach('44px-grayscale-face-sheet', { path: 'evidence/face-sheet.png', contentType: 'image/png' });
});
