import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { freezeTime, loadBoard, pairsFor } from './helpers.ts';

test('complete keyboard accessibility-tree journey and native Tab exit', async ({ page }, testInfo) => {
  await page.goto('/');
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
  await loadBoard(page);
  await page.getByText('Reproduce a game', { exact: true }).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  const cards = page.locator('.card');
  await expect(cards.first()).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp');
  await expect(cards.first()).toBeFocused();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(cards.first()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(cards.first()).toBeFocused();
  await page.keyboard.press('Shift+Enter');
  await expect(page.locator('.revealed')).toHaveCount(0);
  const before = await page.locator('main').ariaSnapshot();
  let position = 0;
  for (const [first, second] of pairsFor('np1-4-1')) {
    for (const index of [first, second]) {
      while (Math.floor(position / 4) < Math.floor(index / 4)) { await page.keyboard.press('ArrowDown'); position += 4; }
      while (Math.floor(position / 4) > Math.floor(index / 4)) { await page.keyboard.press('ArrowUp'); position -= 4; }
      while (position % 4 < index % 4) { await page.keyboard.press('ArrowRight'); position++; }
      while (position % 4 > index % 4) { await page.keyboard.press('ArrowLeft'); position--; }
      await page.keyboard.press(index % 2 ? 'Space' : 'Enter');
    }
  }
  await expect(page.locator('.matched')).toHaveCount(16);
  const after = await page.locator('main').ariaSnapshot();
  expect(before).toContain('Row 1, column 1, closed');
  expect(after).toContain('matched');
  expect(after).toContain('All pairs found');
  expect(after).toContain('Pair found. All pairs found in 8 moves');
  await testInfo.attach('accessibility-before.yml', { body: before, contentType: 'text/yaml' });
  await testInfo.attach('accessibility-completed.yml', { body: after, contentType: 'text/yaml' });
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/accessibility-before.yml', before);
  writeFileSync('artifacts/accessibility-completed.yml', after);
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(position)).toBeFocused();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  expect(await cards.first().getAttribute('tabindex')).toBe('0');
});

test('pointer cancellation, right-click, hover and duplicate announcements', async ({ page }) => {
  await freezeTime(page); await page.goto('/'); await loadBoard(page);
  const first = page.locator('.card').first();
  await first.hover(); await first.click({ button: 'right' }); await page.keyboard.press('Escape');
  await first.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
  await first.dispatchEvent('pointercancel', { pointerType: 'touch', isPrimary: true });
  await expect(page.locator('.revealed')).toHaveCount(0);
  await page.evaluate(() => {
    const live = document.querySelector('[aria-live]');
    if (!live) throw new Error('Missing live region');
    const events: string[] = [];
    new MutationObserver(() => events.push(live.textContent ?? '')).observe(live, { childList: true, subtree: true });
    Object.defineProperty(window, 'testAnnouncements', { value: events });
  });
  for (let i = 0; i < 2; i++) {
    await first.click(); await page.locator('.card').nth(1).click();
    await page.clock.runFor(816);
  }
  const events: unknown = await page.evaluate(() => Reflect.get(window, 'testAnnouncements'));
  expect(events).toEqual(['No match. Cards close after a short pause.', 'No match. Cards close after a short pause.']);
});

test('a completed touch tap shares the native activation action', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  await page.goto('/'); await loadBoard(page);
  await page.locator('.card').nth(0).tap(); await page.locator('.card').nth(11).tap();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await context.close();
});
