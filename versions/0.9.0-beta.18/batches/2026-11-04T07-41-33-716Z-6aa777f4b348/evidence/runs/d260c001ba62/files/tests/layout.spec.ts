import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cards, exported, loadBoard } from './helpers.ts';
import { generateDeck } from '../src/game/deck.ts';
import { mkdir } from 'node:fs/promises';

async function outlineVisible(page: Page) {
  const metrics = await page.locator('.card:focus').evaluate(element => {
    const card = element.getBoundingClientRect();
    const scroll = element.closest('.board-scroll');
    if (!scroll) throw new Error('Missing scroll area');
    const area = scroll.getBoundingClientRect();
    return { left: card.left - area.left, top: card.top - area.top,
      right: area.left + scroll.clientWidth - card.right, bottom: area.top + scroll.clientHeight - card.bottom };
  });
  for (const margin of Object.values(metrics)) expect(margin).toBeGreaterThanOrEqual(5);
}

for (const viewport of [{ width: 360, height: 800, scale: 1 }, { width: 1280, height: 800, scale: 1 },
  { width: 640, height: 400, scale: 2 }]) {
  test(`large board, focus and zoom layout at ${viewport.width}x${viewport.height} scale ${viewport.scale}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.scale, hasTouch: true });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173');
    await loadBoard(page);
    await expect(cards(page)).toHaveCount(16);
    const defaultDimensions = await page.locator('.board-scroll').evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(defaultDimensions.scroll).toBe(defaultDimensions.width);
    await cards(page).first().tap();
    await expect(page.locator('.card.revealed')).toHaveCount(1);
    await loadBoard(page, 16);
    await expect(cards(page)).toHaveCount(256);
    const metrics = await cards(page).first().evaluate(element => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height, page: document.documentElement.scrollWidth, viewport: innerWidth };
    });
    expect(metrics.width).toBeGreaterThanOrEqual(44);
    expect(metrics.width).toBeLessThanOrEqual(88);
    expect(metrics.width).toBeCloseTo(metrics.height, 1);
    expect(metrics.page).toBeLessThanOrEqual(metrics.viewport);
    await cards(page).first().focus();
    await outlineVisible(page);
    for (let i = 0; i < 8; i++) { await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight'); }
    await outlineVisible(page);
    for (let i = 0; i < 7; i++) { await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight'); }
    await expect(cards(page).last()).toBeFocused();
    await outlineVisible(page);
    await page.keyboard.press('Enter');
    await expect(cards(page).last()).toHaveAccessibleName(/revealed$/);
    await page.locator('.board-scroll').evaluate(element => element.scrollTo(0, 0));
    await cards(page).first().tap();
    await expect(page.locator('.scoreboard')).toContainText('Moves: 1');
    await exported(page);
    await expect(page.getByRole('button', { name: 'Export snapshot', exact: true })).toBeFocused();
    await mkdir('tests/evidence', { recursive: true });
    await page.screenshot({ path: `tests/evidence/layout-${viewport.width}.png`, fullPage: true });
    await context.close();
  });
}

test('all 128 actual faces at 44px in grayscale; reduced motion and static completion', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await loadBoard(page, 16);
  const completed = { version: 1, boardCode: 'np1-16-1', matched: Array.from({ length: 256 }, (_, i) => i),
    selection: { kind: 'closed' }, moves: 128, elapsedMs: 60000, started: true };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(completed));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  expect(await page.locator('.win-banner').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await cards(page).first().evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  const svgs = await page.locator('.card svg').evaluateAll(elements => elements.map(element => element.outerHTML));
  const deck = generateDeck(16, 1);
  const faces = Array.from({ length: 128 }, (_, id) => svgs[deck.indexOf(id)] ?? '');
  expect(faces.every(Boolean)).toBe(true);
  await page.setContent(`<style>body{margin:0;padding:16px;background:#090B14;color:#F4F6FF;font:14px system-ui}main{display:grid;grid-template-columns:repeat(16,44px);gap:6px;filter:grayscale(1)}.face{width:44px;height:44px;box-sizing:border-box;border:2px solid #757C9A;border-radius:8px;background:#111625}svg{width:100%;height:100%}</style><p>Neon Pairs · 128 identities · 44px · grayscale · face IDs 0–127 in row order</p><main>${faces.map(face => `<div class="face">${face}</div>`).join('')}</main>`);
  await mkdir('tests/evidence', { recursive: true });
  await page.screenshot({ path: 'tests/evidence/faces-44px-grayscale.png', fullPage: true });
});
