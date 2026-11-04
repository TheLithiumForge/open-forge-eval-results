import { expect, test } from './browser-test.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import {
  GAME_URL,
  PHONE,
  exportedSnapshot,
  loadFixedBoard,
  loadTimedBoard,
  moves,
} from './game-fixture.ts';

test('finishes the literal board by keyboard without inspecting hidden faces', async ({ page }) => {
  await loadFixedBoard(page);
  await expect(page.locator('.card.closed svg'), 'I14 hidden cards mount no face').toHaveCount(0);
  await expect(page.locator('[data-face], [data-face-id]')).toHaveCount(0);
  for (const pair of EXAMPLE_PAIRS) {
    for (const index of pair) {
      await page.locator('.card').first().focus();
      for (let row = 0; row < Math.floor(index / 4); row += 1)
        await page.keyboard.press('ArrowDown');
      for (let column = 0; column < index % 4; column += 1) await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
    }
  }
  await expect(page.locator('.card.matched')).toHaveCount(16);
  expect(await moves(page)).toBe(8);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  expect(await page.locator('.victory').count()).toBe(1);
  const first = await exportedSnapshot(page);
  const second = await exportedSnapshot(page);
  expect(second.elapsedMs).toBe(first.elapsedMs);
});

test('finishes by phone taps with visible 44px targets', async ({ browser }) => {
  const context = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    await loadFixedBoard(page);
    const bounds = await page.locator('.card').first().boundingBox();
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    for (const pair of EXAMPLE_PAIRS)
      for (const index of pair) await page.locator('.card').nth(index).tap();
    await expect(page.locator('.card.matched')).toHaveCount(16);
    expect(await moves(page)).toBe(8);
  } finally {
    await context.close();
  }
});

test('loads the built file with the network offline and no external requests', async ({
  context,
  page,
}) => {
  const requested: string[] = [];
  page.on('request', (request) => {
    requested.push(request.url());
  });
  await context.setOffline(true);
  await page.goto(GAME_URL);
  await expect(page.locator('.card')).toHaveCount(16);
  await page.locator('.card').first().click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  expect(requested).toEqual([GAME_URL]);
});

test('keeps navigation focus at the board edges and leaves the board with Tab', async ({
  page,
}) => {
  await loadFixedBoard(page);
  const cards = page.locator('.card');
  await cards.first().focus();
  await page.keyboard.press('ArrowLeft');
  await expect(cards.first()).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(cards.first()).toBeFocused();
  // A 4x4 row or column takes three presses, so the fourth tests the edge.
  for (let step = 0; step < 4; step += 1) await page.keyboard.press('ArrowRight');
  await expect(cards.nth(3)).toBeFocused();
  for (let step = 0; step < 4; step += 1) await page.keyboard.press('ArrowDown');
  await expect(cards.last()).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await page.keyboard.press('Tab');
  expect(await page.locator('.card:focus').count()).toBe(0);
  expect(await moves(page)).toBe(0);
});

test('focus moves during a mismatch and through matched cards while remembering one tab stop', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const cards = page.locator('.card');
  await cards.nth(0).click();
  await cards.nth(1).click();
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  expect(await moves(page)).toBe(1);
  await page.clock.runFor(800);
  await cards.nth(2).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await page.keyboard.press('ArrowUp');
  await expect(cards.nth(2)).toBeFocused();
  await expect(cards.nth(2)).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  expect(await moves(page)).toBe(2);
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await expect(cards.nth(2)).toHaveAttribute('tabindex', '0');
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(2)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cards.nth(2)).toBeFocused();
});
