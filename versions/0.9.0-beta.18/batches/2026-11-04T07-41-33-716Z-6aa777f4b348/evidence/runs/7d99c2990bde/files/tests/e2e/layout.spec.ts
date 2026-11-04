import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { almostWon, cards, frozenClock, game, loadBoard, loadState } from './helpers.ts';
import { touchBoard } from './touchScroll.ts';

async function fullOutline(card: Locator): Promise<boolean> {
  return card.evaluate(button => {
    const area = button.closest('.board-scroll');
    if (!area) return false;
    const a = area.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    return b.left - 5 >= a.left - 0.5 && b.right + 5 <= a.right + 0.5 &&
      b.top - 5 >= a.top - 0.5 && b.bottom + 5 <= a.bottom + 0.5;
  });
}

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }, { width: 640, height: 400 }]) {
  test(`large board, touch scrolling and full keyboard outlines at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    test.setTimeout(120000);
    const context = await browser.newContext({ viewport, hasTouch: true, deviceScaleFactor: viewport.width === 640 ? 2 : 1 });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173');
    await loadBoard(page, 'np1-16-1');
    await expect(cards(page)).toHaveCount(256);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const measures = await cards(page).evaluateAll(buttons => buttons.map(button => {
      const box = button.getBoundingClientRect();
      return { width: box.width, height: box.height, margin: getComputedStyle(button).scrollMargin };
    }));
    expect(measures.every(m => m.width >= 44 && m.width <= 88 && Math.abs(m.width - m.height) < 0.1)).toBe(true);
    expect(measures.every(m => parseFloat(m.margin) >= 6)).toBe(true);
    const board = page.locator('.board-scroll');
    expect(await board.evaluate(node => node.clientHeight)).toBeLessThanOrEqual(Math.min(viewport.height * 0.7, 768));
    await board.scrollIntoViewIfNeeded();
    await touchBoard(page, 'x', true);
    await touchBoard(page, 'y', true);
    expect(await board.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    if (viewport.width < 806) expect(await board.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
    expect(await fullOutline(cards(page).last())).toBe(true);
    await touchBoard(page, 'x', false);
    await touchBoard(page, 'y', false);
    expect(await fullOutline(cards(page).first())).toBe(true);
    await cards(page).first().focus();
    for (let n = 0; n < 7; n++) { await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); }
    await expect(cards(page).nth(119)).toBeFocused();
    expect(await fullOutline(cards(page).nth(119))).toBe(true);
    for (let n = 0; n < 8; n++) { await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); }
    await expect(cards(page).last()).toBeFocused();
    expect(await fullOutline(cards(page).last())).toBe(true);
    await page.keyboard.press('Enter');
    await expect(cards(page).last()).toHaveAccessibleName(/revealed$/);
    await page.getByLabel('Grid size').selectOption('4');
    await cards(page).first().click();
    await expect(cards(page).first()).toHaveAccessibleName(/revealed$/);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await expect(cards(page).nth(1)).toBeFocused();
    await expect(cards(page).nth(1)).toHaveAccessibleName(/revealed$/);
    expect(await fullOutline(cards(page).nth(1))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
    if (viewport.width === 640) {
      const initial = game();
      await loadState(page, { ...initial, matched: initial.deck.map((_, index) => index),
        moves: 999999, elapsedMs: 359999999, started: true });
      await page.locator('.win-banner').scrollIntoViewIfNeeded();
      const readable = await page.locator('.stats p, .win-banner h2, .win-banner p').evaluateAll(nodes => {
        const boxes = nodes.map(node => node.getBoundingClientRect());
        return boxes.every(box => box.left >= 0 && box.right <= innerWidth) && boxes.every((box, i) =>
          boxes.every((other, j) => i === j || box.right <= other.left || box.left >= other.right ||
            box.bottom <= other.top || box.top >= other.bottom));
      });
      expect(readable).toBe(true);
    }
    await context.close();
  });
}

test('completion pulses once for 600ms, imports and reduced motion stay static', async ({ page }) => {
  await frozenClock(page);
  await page.goto('/');
  await expect(page.locator('.stat-label')).toHaveCount(4);
  const labelStyles = await page.locator('.stat-label').evaluateAll(labels => labels.map(label => {
    const style = getComputedStyle(label);
    return { size: style.fontSize, color: style.color };
  }));
  expect(labelStyles).toEqual(Array.from({ length: 4 }, () => ({ size: '14px', color: 'rgb(184, 189, 210)' })));
  const values = await page.locator('.stats p').evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node);
    return { size: style.fontSize, color: style.color };
  }));
  expect(values).toEqual(Array.from({ length: 4 }, () => ({ size: '16px', color: 'rgb(244, 246, 255)' })));
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await loadState(page, almostWon());
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  expect(await page.locator('.win-banner').evaluate(node => getComputedStyle(node).animationDuration)).toBe('0.6s');
  expect(await page.locator('.win-banner').evaluate(node => getComputedStyle(node).animationIterationCount)).toBe('1');
  await page.clock.runFor(700);
  await expect(page.locator('.win-banner')).toBeVisible();
  await expect.poll(() => page.locator('.win-banner').evaluate(node => node.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await cards(page).first().evaluate(node => getComputedStyle(node).transitionDuration)).toBe('0s');
  expect(await page.locator('.win-banner').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
});
