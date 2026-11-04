import { expect, test } from '@playwright/test';
import { createGame } from '../src/game/transitions.ts';
import { DEFAULT_CODE, freezePageClock, loadBoard } from './helpers.ts';

test('a valid turn scores once and a miss closes after 800 active milliseconds', async ({ page }) => {
  await freezePageClock(page);
  await page.goto('/');
  await loadBoard(page, DEFAULT_CODE);

  const cards = page.locator('.memory-card');
  await cards.nth(0).click();
  await cards.nth(0).click();
  await expect(page.getByText('Moves: 0')).toBeVisible();
  await cards.nth(11).click();
  await expect(page.getByText('Moves: 1')).toBeVisible();
  await expect(page.getByText('Pairs: 1/8')).toBeVisible();
  await expect(cards.nth(0)).toHaveAttribute('aria-disabled', 'true');

  await cards.nth(1).click();
  await cards.nth(2).click();
  await expect(page.getByText('Moves: 2')).toBeVisible();
  await page.clock.runFor(799);
  await expect(cards.nth(1)).toHaveAttribute('aria-label', /revealed$/);
  await page.clock.runFor(1);
  await expect(cards.nth(1)).toHaveAttribute('aria-label', /closed$/);
  await expect(cards.nth(2)).toHaveAttribute('aria-label', /closed$/);
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
});

test('visibility pauses a mismatch and restart or New Game invalidates its timer', async ({ page }) => {
  await freezePageClock(page);
  await page.goto('/');
  await loadBoard(page, DEFAULT_CODE);
  const cards = page.locator('.memory-card');
  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.clock.runFor(300);
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'hidden',
  }));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.clock.runFor(1000);
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'visible',
  }));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.clock.runFor(499);
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /revealed$/);
  await page.clock.runFor(1);
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /closed$/);

  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await cards.nth(0).click();
  await page.clock.runFor(800);
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /revealed$/);
  await expect(page.getByText('Moves: 0')).toBeVisible();

  const boardCode = await page.getByLabel('Board code').inputValue();
  const currentGame = createGame(boardCode);
  if (currentGame === null) throw new Error('New Game must create a valid deal.');
  const otherIndex = currentGame.board.deck.findIndex((face, index) => index !== 0 && face !== currentGame.board.deck[0]);
  expect(otherIndex).toBeGreaterThan(0);
  await cards.nth(otherIndex).click();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await cards.nth(0).click();
  await page.clock.runFor(800);
  await expect(cards.nth(0)).toHaveAttribute('aria-label', /revealed$/);
  await expect(page.getByText('Moves: 0')).toBeVisible();
});

test('initial focus stays put and card activation keys share one button action', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeFocused();
  const first = page.locator('.memory-card').nth(0);
  await first.focus();
  for (const key of ['Shift+Enter', 'Control+Enter', 'Alt+Enter', 'Meta+Enter', 'Shift+Space', 'Control+Space']) {
    await page.keyboard.press(key);
    await expect(first).toHaveAttribute('aria-label', /closed$/);
  }
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('aria-label', /revealed$/);
  await page.keyboard.press('Space');
  await expect(page.getByText('Moves: 0')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.memory-card').nth(1)).toBeFocused();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.locator('.memory-card').nth(1)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
});

test('hover, pointer cancellation, and the native context menu do not reveal cards', async ({ page }) => {
  await page.goto('/');
  const first = page.locator('.memory-card').first();
  await first.hover();
  await expect(first).toHaveAttribute('aria-label', /closed$/);
  await first.dispatchEvent('pointercancel');
  await first.click({ button: 'right' });
  await expect(first).toHaveAttribute('aria-label', /closed$/);
  await expect(page.getByText('Moves: 0')).toBeVisible();
});
