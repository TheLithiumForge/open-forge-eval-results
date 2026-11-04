import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createGame } from '../src/game/state.ts';
import { expectFocusVisible } from './focusGeometry.ts';
import { loadBoard, solve, start } from './helpers.ts';
import { moveKeyboard } from './keyboardNavigation.ts';

const LAYOUTS = [
  { name: 'phone', width: 360, height: 800, scale: 1 },
  { name: 'desktop', width: 1280, height: 800, scale: 1 },
  { name: 'zoom', width: 640, height: 400, scale: 2 },
];

for (const layout of LAYOUTS) for (const size of [4, 16]) {
  test(`${layout.name} ${size}x${size} preserves geometry, pointer play and complete keyboard focus outlines`, async ({ browser }) => {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173',
      viewport: { width: layout.width, height: layout.height }, deviceScaleFactor: layout.scale, hasTouch: true });
    try {
      const page = await context.newPage();
      await start(page);
      const code = `np1-${size}-1`;
      await loadBoard(page, code);
      await expect(page.locator('.card')).toHaveCount(size * size);
      const dimensions = await page.locator('.card').evaluateAll((cards) => cards.map((card) => {
        const rect = card.getBoundingClientRect(); return { width: rect.width, height: rect.height };
      }));
      for (const rect of dimensions) {
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.width).toBeLessThanOrEqual(88);
        expect(Math.abs(rect.width - rect.height)).toBeLessThan(0.1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('.board-scroll').evaluate((element) => element.clientHeight))
        .toBeLessThanOrEqual(Math.min(layout.height * 0.7, 768) + 1);
      expect(await page.locator('.board-grid').evaluate((element) => getComputedStyle(element).display)).toBe('grid');
      const game = createGame(code);
      const face = game?.deck[0];
      if (!game || face === undefined) throw new Error('Invalid fixture');
      await page.locator('.card').first().click();
      let current = await moveKeyboard(page, 0, game.deck.lastIndexOf(face), size);
      await page.keyboard.press('Space');
      await expect(page.getByText(`Pairs: 1/${size * size / 2}`, { exact: true })).toBeVisible();
      current = await moveKeyboard(page, current, Math.floor(size * size / 2) + Math.floor(size / 2), size);
      await expectFocusVisible(page);
      current = await moveKeyboard(page, current, size * size - 1, size);
      await expectFocusVisible(page);
      await mkdir('evidence', { recursive: true });
      await page.screenshot({ path: `evidence/${layout.name}-${size}-focus-last.png`, fullPage: true });
      await moveKeyboard(page, current, 0, size);
      await expectFocusVisible(page);
      await page.getByRole('button', { name: 'New Game', exact: true }).click();
      await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
    } finally { await context.close(); }
  });
}

test('reduced motion removes card transitions and completion pulse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await loadBoard(page);
  expect(await page.locator('.card').first().evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
  await solve(page);
  expect(await page.locator('.win-banner').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});
