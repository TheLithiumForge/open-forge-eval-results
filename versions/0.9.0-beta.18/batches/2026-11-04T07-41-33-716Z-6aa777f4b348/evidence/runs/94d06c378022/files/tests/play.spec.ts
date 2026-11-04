import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { makeSnapshot, pairsForCode, clickCard, loadBoard, loadSnapshot } from './helpers.ts';

test('repeated clicks, matches, misses, move count and 800 active milliseconds', async ({ page }) => {
  await page.goto('/');
  const fixedTime = new Date('2026-11-04T00:00:00Z');
  await page.clock.install({ time: fixedTime });
  await page.clock.pauseAt(fixedTime);
  await loadBoard(page, 'np1-4-1');
  const live = page.locator('[aria-live="polite"]');

  await clickCard(page, 2);
  await page.clock.runFor(1_000);
  expect(await page.locator('.score-strip').innerText()).toContain('Time: 0:01');
  await clickCard(page, 2);
  expect(await page.locator('.score-strip').innerText()).toContain('Moves: 0');
  expect(await live.innerText()).toBe('');

  await clickCard(page, 6);
  expect(await page.locator('.score-strip').innerText()).toContain('Moves: 1');
  expect(await page.locator('.board-card').nth(2).getAttribute('aria-disabled')).toBe('true');
  expect(await live.innerText()).toBe('Pair found. 1 pair matched.');
  const matchAnnouncement = await live.locator('span').elementHandle();

  await clickCard(page, 0);
  await clickCard(page, 1);
  await page.clock.runFor(250);
  expect(await live.innerText()).toBe('No match. Cards close after a short pause.');
  const missAnnouncement = await live.locator('span').elementHandle();
  await page.clock.runFor(549);
  expect(await page.locator('.board-card').nth(0).getAttribute('data-state')).toBe('revealed');
  await clickCard(page, 8);
  expect(await page.locator('.score-strip').innerText()).toContain('Moves: 2');
  await page.clock.runFor(1);
  expect(await page.locator('.board-card').nth(0).getAttribute('data-state')).toBe('closed');
  expect(await live.innerText()).toBe('No match. Cards close after a short pause.');
  expect(await matchAnnouncement?.evaluate((node) => node.isConnected)).toBe(false);
  expect(await missAnnouncement?.evaluate((node) => node.isConnected)).toBe(true);
});

test('a late timer from a restarted deal cannot close the new turn', async ({ page }) => {
  await page.goto('/');
  const fixedTime = new Date('2026-11-04T00:00:00Z');
  await page.clock.install({ time: fixedTime });
  await page.clock.pauseAt(fixedTime);
  await loadBoard(page, 'np1-4-1');
  await clickCard(page, 0);
  await clickCard(page, 1);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  expect(await page.locator('.board-card').nth(0).getAttribute('data-state')).toBe('closed');

  await clickCard(page, 0);
  await page.clock.runFor(800);
  expect(await page.locator('.board-card').nth(0).getAttribute('data-state')).toBe('revealed');
  expect(await page.locator('.score-strip').innerText()).toContain('Moves: 0');
});

test('a mismatch preserves its remaining interval while the page is hidden', async ({ page }) => {
  await page.goto('/');
  const fixedTime = new Date('2026-11-04T00:00:00Z');
  await page.clock.install({ time: fixedTime });
  await page.clock.pauseAt(fixedTime);
  await loadBoard(page, 'np1-4-1');
  await clickCard(page, 0);
  await clickCard(page, 1);
  await page.clock.runFor(250);
  await setVisibility(page, 'hidden');
  await page.clock.runFor(1_000);
  expect(await page.locator('.board-card').nth(0).getAttribute('data-state')).toBe('revealed');

  await setVisibility(page, 'visible');
  await page.clock.runFor(549);
  expect(await page.locator('.board-card').nth(0).getAttribute('data-state')).toBe('revealed');
  await page.clock.runFor(1);
  expect(await page.locator('.board-card').nth(0).getAttribute('data-state')).toBe('closed');
});

test('each identical miss gets a new live announcement while focus and clock updates stay silent', async ({ page }) => {
  await page.goto('/');
  const fixedTime = new Date('2026-11-04T00:00:00Z');
  await page.clock.install({ time: fixedTime });
  await page.clock.pauseAt(fixedTime);
  await loadBoard(page, 'np1-4-1');
  const live = page.locator('[aria-live="polite"]');
  await clickCard(page, 0);
  await clickCard(page, 1);
  const text = 'No match. Cards close after a short pause.';
  await expect(live).toHaveText(text);
  const first = await live.locator('span').elementHandle();
  await page.clock.runFor(800);
  await page.locator('.board-card').nth(8).focus();
  await page.clock.runFor(100);
  await expect(live).toHaveText(text);
  expect(await first?.evaluate((node) => node.isConnected)).toBe(true);

  await clickCard(page, 2);
  await clickCard(page, 3);
  await expect(live).toHaveText(text);
  const second = await live.locator('span').elementHandle();
  expect(await first?.evaluate((node) => node.isConnected)).toBe(false);
  expect(await second?.evaluate((node) => node.isConnected)).toBe(true);
});

test('the final capped move announces the combined match and win', async ({ page }) => {
  await page.goto('/');
  const code = 'np1-4-1';
  const pairs = pairsForCode(code);
  const matched = pairs.slice(0, -1).flatMap((pair) => pair.positions);
  const finalPair = pairs.at(-1);
  if (finalPair === undefined) throw new Error('Test board has no final pair');
  const saved = makeSnapshot(code, matched, 999_999, 30_000, { kind: 'one', index: finalPair.positions[0] });
  await loadSnapshot(page, saved);
  await page.getByRole('button', { name: 'Resume' }).click();
  await clickCard(page, finalPair.positions[1]);
  await expect(page.locator('.score-strip')).toContainText('Moves: 999999');
  await expect(page.locator('[aria-live="polite"]')).toContainText(
    'Pair found. All pairs found in 999999 moves and 0:30.'
  );
});

test('victory motion runs once at 600ms and reduced motion disables it', async ({ browser }) => {
  const standard = await browser.newContext();
  try {
    const page = await standard.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await loadBoard(page, 'np1-4-1');
    for (const pair of pairsForCode('np1-4-1')) {
      await clickCard(page, pair.positions[0]);
      await clickCard(page, pair.positions[1]);
    }
    const banner = page.locator('.win-banner');
    await expect(banner).toHaveClass(/is-new-win/);
    expect(await banner.evaluate((element) => getComputedStyle(element).animationIterationCount)).toBe('1');
    expect(await banner.evaluate((element) => getComputedStyle(element).animationDuration)).toMatch(/0\.6s|600ms/);
    await page.waitForTimeout(650);
    await expect(banner).toHaveClass(/is-new-win/);
  } finally {
    await standard.close();
  }

  const reduced = await browser.newContext({ reducedMotion: 'reduce' });
  try {
    const page = await reduced.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await loadBoard(page, 'np1-4-1');
    for (const pair of pairsForCode('np1-4-1')) {
      await clickCard(page, pair.positions[0]);
      await clickCard(page, pair.positions[1]);
    }
    await expect(page.locator('.win-banner')).toHaveClass(/is-new-win/);
    expect(await page.locator('.win-banner').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  } finally {
    await reduced.close();
  }
});

test('every supported board can be completed from its repeatable board code', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  for (const size of [4, 6, 8, 10, 12, 14, 16]) {
    const code = `np1-${size}-1`;
    await loadBoard(page, code);
    const pairs = pairsForCode(code);
    for (const pair of pairs) {
      const first = pair.positions[0];
      const second = pair.positions[1];
      await clickCard(page, first);
      await clickCard(page, second);
    }
    expect(await page.locator('.score-strip').innerText()).toContain(`Pairs: ${pairs.length}/${pairs.length}`);
    await expect(page.locator('.win-banner')).toBeVisible();
    await expect(page.locator('.board-card')).toHaveCount(size * size);
  }
});

async function setVisibility(page: Page, state: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}
