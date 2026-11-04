import { expect, test } from '@playwright/test';
import { createGame } from '../src/game/game.ts';
import { almostWon, cards, keyboardTo, loadBoard, loadSnapshot } from './actions.ts';
import { boardMeasurements, focusOutlineVisible } from './layout.ts';
import { swipe } from './touch.ts';

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }]) {
  test(`16x16 contains scrolling and all focus outlines at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await loadBoard(page, 'np1-16-1');
    await boardMeasurements(page, 16);
    await page.getByRole('button', { name: 'Restart', exact: true }).focus();
    await page.keyboard.press('Tab');
    await focusOutlineVisible(page, 0);
    await keyboardTo(page, 0, 255, 16);
    await focusOutlineVisible(page, 255);
    await keyboardTo(page, 255, 136, 16);
    await focusOutlineVisible(page, 136);
    await keyboardTo(page, 136, 0, 16);
    await focusOutlineVisible(page, 0);
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'New Game', exact: true }).click();
    await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  });
}

test.describe('equivalent 200 percent zoom layout', () => {
  test.use({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  for (const size of [4, 16]) {
    test(`keeps ${size}x${size} controls, play and win readable`, async ({ page }) => {
      await page.goto('/');
      await loadBoard(page, `np1-${size}-1`);
      await boardMeasurements(page, size);
      await cards(page).nth(0).click();
      await expect(page.locator('.card-face')).toHaveCount(1);
      await page.keyboard.press('ArrowRight');
      await focusOutlineVisible(page, 1);
      await page.keyboard.press('Space');
      await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
      await page.keyboard.press('Tab');
      await keyboardTo(page, 0, size * size - 1, size);
      await focusOutlineVisible(page, size * size - 1);
      const code = `np1-${size}-1`;
      const game = createGame(code);
      const finalFace = game.deck[0];
      if (finalFace === undefined) throw new Error('Missing final pair.');
      await loadSnapshot(page, almostWon(size * size / 2 - 1, 1500, code));
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await cards(page).nth(0).click();
      await cards(page).nth(game.deck.lastIndexOf(finalFace)).click();
      const banner = page.getByRole('region', { name: 'Game complete' });
      await expect(banner).toContainText(`Completed in ${size * size / 2} moves`);
      await banner.scrollIntoViewIfNeeded();
      expect(await banner.evaluate((node) => node.getBoundingClientRect().right <= innerWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute('content', /user-scalable=no|maximum-scale=1/);
    });
  }
});

test.describe('touch scrolling', () => {
  test.use({ hasTouch: true, viewport: { width: 360, height: 800 } });
  test('touch gestures reach the first and last card inside both scroll axes', async ({ page, context }) => {
    await page.goto('/');
    await loadBoard(page, 'np1-16-1');
    await page.getByText('Reproduce a game', { exact: true }).click();
    await page.locator('.board-scroll').scrollIntoViewIfNeeded();
    const bounds = await page.locator('.board-scroll').boundingBox();
    if (!bounds) throw new Error('Missing board bounds.');
    const client = await context.newCDPSession(page);
    const x = Math.round(bounds.x + bounds.width / 2);
    const y = Math.round(Math.max(80, Math.min(700, bounds.y + bounds.height / 2)));
    for (let gesture = 0; gesture < 3; gesture += 1) await swipe(page, client, [310, y], [40, y]);
    await swipe(page, client, [x, 700], [x, 300]);
    await expect.poll(() => page.locator('.board-scroll').evaluate((node) => node.scrollLeft > 0 && node.scrollTop > 0)).toBe(true);
    const insideBoard = (index: number) => cards(page).nth(index).evaluate((card) => {
      const area = card.closest('.board-scroll');
      if (!area) throw new Error('Missing board.');
      const bounds = area.getBoundingClientRect();
      const face = card.getBoundingClientRect();
      return face.left >= bounds.left && face.right <= bounds.right
        && face.top >= bounds.top && face.bottom <= bounds.bottom;
    });
    await expect.poll(() => insideBoard(255)).toBe(true);
    await cards(page).nth(255).tap();
    await expect(cards(page).nth(255)).toHaveAccessibleName(/revealed$/);
    for (let gesture = 0; gesture < 3; gesture += 1) await swipe(page, client, [40, y], [310, y]);
    await swipe(page, client, [x, 300], [x, 700]);
    await expect.poll(() => page.locator('.board-scroll').evaluate((node) => node.scrollLeft === 0 && node.scrollTop === 0)).toBe(true);
    await expect.poll(() => insideBoard(0)).toBe(true);
    await cards(page).nth(0).tap();
    await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  });
});
