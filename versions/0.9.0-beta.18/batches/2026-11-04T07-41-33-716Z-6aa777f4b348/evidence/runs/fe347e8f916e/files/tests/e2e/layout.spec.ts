import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { generateDeck } from '../../src/game/boardCode.ts';
import { card, loadBoard, loadSnapshot } from './helpers.ts';

const viewports = [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }];
for (const viewport of viewports) {
  for (const size of [4, 16]) {
    test(`${size}x${size} fits and scrolls at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 640 ? 2 : 1, hasTouch: true });
      const page = await context.newPage();
      await page.goto('/');
      await loadBoard(page, `np1-${size}-1`);
      await expect(page.locator('.card')).toHaveCount(size * size);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const geometry = await card(page, 0).evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const css = getComputedStyle(element);
        return { width: bounds.width, height: bounds.height, border: css.borderWidth, radius: css.borderRadius };
      });
      expect(geometry.width).toBeGreaterThanOrEqual(44);
      expect(geometry.width).toBeLessThanOrEqual(88);
      expect(geometry.height).toBeCloseTo(geometry.width, 1);
      expect(geometry.border).toBe('2px');
      expect(geometry.radius).toBe('8px');
      await card(page, 0).focus();
      for (let step = 1; step < size; step += 1) await page.keyboard.press('ArrowDown');
      for (let step = 1; step < size; step += 1) await page.keyboard.press('ArrowRight');
      await expect(card(page, size * size - 1)).toBeFocused();
      const visible = await card(page, size * size - 1).evaluate((element) => {
        const parent = element.closest('.board-scroll');
        if (!parent) throw new Error('Missing scroll area');
        const card = element.getBoundingClientRect();
        const area = parent.getBoundingClientRect();
        return card.left - 5 >= area.left && card.top - 5 >= area.top &&
          card.right + 5 <= area.right && card.bottom + 5 <= area.bottom;
      });
      expect(visible).toBe(true);
      await page.keyboard.press('Enter');
      await expect(card(page, size * size - 1)).toHaveAccessibleName(/revealed$/);
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
      await card(page, size * size - 1).tap();
      await expect(card(page, size * size - 1)).toHaveAccessibleName(/revealed$/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (viewport.width === 360 && size === 4) {
        await mkdir('evidence', { recursive: true });
        await page.screenshot({ path: 'evidence/phone.png', fullPage: true });
      }
      await context.close();
    });
  }
}
test('all 128 faces at 44px, grayscale and reduced motion', async ({ page, browser }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const deck = generateDeck(16, 1);
  await loadSnapshot(page, { version: 1, boardCode: 'np1-16-1', matched: deck.map((_, index) => index),
    selection: { kind: 'closed' }, moves: 128, elapsedMs: 5000, started: true });
  await expect(page.locator('.card svg')).toHaveCount(256);
  expect(await card(page, 0).evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
  expect(await page.locator('.win-banner').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  const faces: string[] = [];
  for (let id = 0; id < 128; id += 1) {
    faces.push(`<div><div class="card">${await card(page, deck.indexOf(id)).innerHTML()}</div><span>${id}</span></div>`);
  }
  const sheet = await browser.newPage({ viewport: { width: 832, height: 640 } });
  await sheet.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:16px;background:#090B14;color:white;font:14px/24px sans-serif}
    main{display:grid;grid-template-columns:repeat(16,44px);gap:6px;filter:grayscale(1)}.card{width:44px;height:44px;
    border:2px solid #8BEA7D;border-radius:8px;background:#111625}.card svg{width:100%;height:100%}.match-check{display:none}</style>
    <main>${faces.join('')}</main>`);
  await mkdir('evidence', { recursive: true });
  await sheet.locator('main').screenshot({ path: 'evidence/faces-grayscale.png' });
  await info.attach('128 grayscale identities at 44px', { path: 'evidence/faces-grayscale.png', contentType: 'image/png' });
  await sheet.close();
});
