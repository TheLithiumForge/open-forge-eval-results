import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, loadBoard, openGame } from './deal-actions.ts';
import { expectFocusVisible, moveFocus } from './keyboard-actions.ts';
import { touchScrollToEdge } from './touch-scroll.ts';

const layouts = [
  { name: 'phone', viewport: { width: 360, height: 800 }, deviceScaleFactor: 1 },
  { name: 'desktop', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  { name: 'zoom-200', viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 },
] as const;

for (const layout of layouts) {
  test.describe(layout.name, () => {
    test.use({ viewport: layout.viewport, deviceScaleFactor: layout.deviceScaleFactor, hasTouch: true });
    test('4x4 and 16x16 retain readable controls and complete keyboard focus outlines', async ({ page }) => {
      await openGame(page);
      await expect(cards(page)).toHaveCount(16);
      await cards(page).first().click();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Space');
      await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
      await expectFocusVisible(page);
      await loadBoard(page, 'np1-16-1');
      await expect(cards(page)).toHaveCount(256);
      const sizes = await cards(page).evaluateAll(elements => elements.map(element => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }));
      for (const size of sizes) {
        expect(size.width).toBeGreaterThanOrEqual(44);
        expect(size.width).toBeLessThanOrEqual(88);
        expect(size.height).toBe(size.width);
      }
      const height = await page.locator('.board-scroll').evaluate(element => element.getBoundingClientRect().height);
      expect(height).toBeLessThanOrEqual(Math.min(layout.viewport.height * 0.7, 768));
      await page.getByRole('button', { name: 'Restart', exact: true }).focus();
      await page.keyboard.press('Tab');
      await expectFocusVisible(page);
      await moveFocus(page, 0, 136, 16);
      await expectFocusVisible(page);
      await moveFocus(page, 136, 255, 16);
      await expectFocusVisible(page);
      await page.keyboard.press('Enter');
      await expect(cards(page).last()).toHaveAccessibleName(/revealed$/);
      await moveFocus(page, 255, 0, 16);
      await expectFocusVisible(page);
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
      await mkdir('evidence', { recursive: true });
      await page.screenshot({ path: `evidence/layout-${layout.name}.png`, fullPage: true });
      await expect(page.getByLabel('Grid size')).toBeVisible();
      await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
      await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute('content', /user-scalable=no|maximum-scale=1/);
    });

    test('native touch swipes reach both board edges and completed taps reveal the cards', async ({ page }) => {
      await openGame(page, 'np1-16-1');
      await touchScrollToEdge(page, true);
      await expect(page.locator('.card--revealed')).toHaveCount(0);
      await cards(page).last().tap();
      await expect(cards(page).last()).toHaveAccessibleName(/revealed$/);
      await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
      await touchScrollToEdge(page, false);
      await cards(page).first().tap();
      await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  });
}
