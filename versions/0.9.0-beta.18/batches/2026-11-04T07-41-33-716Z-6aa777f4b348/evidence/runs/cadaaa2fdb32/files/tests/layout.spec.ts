import { expect, test } from '@playwright/test';
import { cards, keyboardTo, loadBoard, loadSnapshot } from './journey.ts';

const viewports = [
  { width: 360, height: 800, deviceScaleFactor: 1 },
  { width: 1280, height: 800, deviceScaleFactor: 1 },
  { width: 640, height: 400, deviceScaleFactor: 2 },
];

for (const viewport of viewports) {
  test(`board layout and complete focus outlines at ${viewport.width}x${viewport.height} scale ${viewport.deviceScaleFactor}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.deviceScaleFactor });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173');
    for (const size of [4, 16]) {
      await loadBoard(page, `np1-${size}-1`);
      await expect(cards(page)).toHaveCount(size ** 2);
      const dimensions = await cards(page).first().evaluate(element => {
        const box = element.getBoundingClientRect();
        return { width: box.width, height: box.height };
      });
      expect(dimensions.width).toBeGreaterThanOrEqual(44);
      expect(dimensions.width).toBeLessThanOrEqual(88);
      expect(dimensions.height).toBeCloseTo(dimensions.width, 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await cards(page).first().focus();
      for (const index of [size ** 2 / 2 + Math.floor(size / 2), size ** 2 - 1, 0]) {
        // Exercise every arrow step, including scrolling through mid-board cards.
        const current = await cards(page).evaluateAll(elements => elements.findIndex(element => element === document.activeElement));
        await keyboardTo(page, current, index, size);
        const visible = await cards(page).nth(index).evaluate(element => {
          const scroll = element.closest('.board-scroll');
          if (!(scroll instanceof HTMLElement)) return false;
          const card = element.getBoundingClientRect();
          const area = scroll.getBoundingClientRect();
          return card.left - 5 >= area.left && card.right + 5 <= area.left + scroll.clientWidth &&
            card.top - 5 >= area.top && card.bottom + 5 <= area.top + scroll.clientHeight;
        });
        expect(visible).toBe(true);
      }
      await page.keyboard.press('Enter');
      await expect(cards(page).first().locator('svg')).toHaveCount(1);
      await cards(page).nth(1).click();
      await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
      await loadSnapshot(page, { boardCode: `np1-${size}-1`,
        matched: Array.from({ length: size ** 2 }, (_, i) => i),
        moves: size ** 2 / 2, elapsedMs: 3600000, started: true });
      await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
      await expect(page.getByText('Time: 60:00', { exact: true })).toBeVisible();
      expect(await page.locator('.win-banner').evaluate(element =>
        element.scrollWidth <= element.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    }
    await context.close();
  });
}

for (const size of [4, 6, 8, 10, 12, 14, 16]) {
  test(`a ${size}x${size} board can finish in the browser`, async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/');
    // The core's literal-vector tests independently establish generation correctness.
    const { createGame } = await import('../src/game/state.ts');
    const code = `np1-${size}-1`;
    await loadBoard(page, code);
    const game = createGame(code);
    if (!game) throw new Error('Expected valid board.');
    await page.evaluate(async deck => {
      const buttons = document.querySelectorAll<HTMLButtonElement>('.board-grid button');
      for (let face = 0; face < deck.length / 2; face++) {
        const first = buttons[deck.indexOf(face)];
        const second = buttons[deck.lastIndexOf(face)];
        if (!first || !second) throw new Error('Missing card buttons.');
        // Native DOM clicks exercise the shared activation without waiting for
        // pointer positioning hundreds of times. Pointer/focus journeys are separate.
        first.click();
        second.click();
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      }
    }, game.deck);
    await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
    await expect(page.getByText(`Pairs: ${size ** 2 / 2}/${size ** 2 / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Moves: ${size ** 2 / 2}`, { exact: true })).toBeVisible();
  });
}

test('reduced motion removes border transitions and completion pulse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await loadBoard(page);
  expect(await cards(page).first().evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  const { finish } = await import('./journey.ts');
  await finish(page);
  expect(await page.locator('.win-banner').evaluate(element => element.getAnimations().length)).toBe(0);
});
