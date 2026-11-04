import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cards, loadBoard, loadSnapshot, sampleSnapshot } from './helpers.ts';
import { generateDeck } from '../src/game/boardCode.ts';
import { faceParts } from '../src/game/board/faces.ts';

async function contained(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const box = await cards(page).first().boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBe(box?.width);
}

async function focusInside(page: Page, index: number) {
  const measured = await cards(page).nth(index).evaluate(element => {
    const container = element.closest('.board-scroll');
    if (!container) throw new Error('Missing scroll area');
    const card = element.getBoundingClientRect();
    const board = container.getBoundingClientRect();
    return { left: card.left - board.left, top: card.top - board.top,
      right: board.right - card.right, bottom: board.bottom - card.bottom };
  });
  for (const distance of Object.values(measured)) expect(distance).toBeGreaterThanOrEqual(4.9);
}

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test(`boards fit and focus scrolls at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await contained(page);
    const initial = await cards(page).last().boundingBox();
    expect(initial?.x).toBeGreaterThanOrEqual(0);
    expect((initial?.x ?? 0) + (initial?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
    await loadBoard(page, 'np1-16-1');
    await expect(cards(page)).toHaveCount(256);
    await contained(page);
    const height = await page.locator('.board-scroll').evaluate(element => element.clientHeight);
    expect(height).toBeLessThanOrEqual(Math.min(viewport.height * .7, 768) + 1);
    await cards(page).first().focus();
    await focusInside(page, 0);
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowDown');
    await expect(cards(page).last()).toBeFocused();
    await focusInside(page, 255);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await focusInside(page, 238);
    await page.keyboard.press('Tab');
    await expect(page.locator('summary')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(cards(page).nth(238)).toBeFocused();
    mkdirSync('evidence', { recursive: true });
    await page.screenshot({ path: `evidence/board-${viewport.width}x${viewport.height}.png`, fullPage: true });
  });
}

test('200 percent equivalent zoom, reduced motion and completed summary', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2,
    reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await loadSnapshot(page, sampleSnapshot({ matched: Array.from({ length: 16 }, (_, i) => i),
    selection: { kind: 'closed' }, moves: 8 }));
  expect(await page.locator('.win-banner').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await cards(page).first().evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  await expect(page.locator('.win-banner')).toContainText('8 moves · 0:01');
  await contained(page);
  await loadBoard(page, 'np1-16-1');
  await cards(page).last().focus();
  await focusInside(page, 255);
  await cards(page).last().click();
  await expect(cards(page).last()).toHaveAccessibleName(/revealed$/);
  await contained(page);
  await context.close();
});

test('128 actual faces at 44px in grayscale (test-only visual evidence)', async ({ page }) => {
  await page.goto('/');
  await loadSnapshot(page, sampleSnapshot({ boardCode: 'np1-16-1',
    matched: Array.from({ length: 256 }, (_, i) => i), selection: { kind: 'closed' }, moves: 128 }));
  const deck = generateDeck(16, 1);
  const entries: string[] = [];
  for (let id = 0; id < 128; id++) {
    const svg = await cards(page).nth(deck.indexOf(id)).locator('svg').evaluate(element => element.outerHTML);
    entries.push(`<div><span>${id}</span><div class="face" title="${faceParts(id).name}">${svg}</div></div>`);
  }
  await page.setContent(`<html lang="en"><head><title>128 faces at 44px · grayscale</title><style>
    body{background:#090B14;color:#F4F6FF;font:14px system-ui;margin:16px}
    main{display:grid;grid-template-columns:repeat(16,44px);gap:6px;filter:grayscale(1)}
    .face{width:44px;height:44px;background:#111625}svg{width:44px;height:44px}
    </style></head><body><h1>All 128 faces · 44px · grayscale</h1><main>${entries.join('')}</main></body></html>`);
  mkdirSync('evidence', { recursive: true });
  await page.screenshot({ path: 'evidence/faces-44px-grayscale.png', fullPage: true });
});
