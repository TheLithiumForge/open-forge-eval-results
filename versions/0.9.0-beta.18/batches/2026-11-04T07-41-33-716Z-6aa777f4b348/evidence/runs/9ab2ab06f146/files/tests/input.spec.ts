import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { cards, focusCard, loadBoard, pairs, pauseClock } from './helpers.ts';

test('complete keyboard journey exposes the required accessibility tree', async ({ page, browser }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeFocused();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toHaveCount(1);
  await loadBoard(page);
  await page.locator('details summary').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).first()).toBeFocused();
  await expect(cards(page).first()).toHaveAccessibleName('Row 1, column 1, closed');
  const evidence = [`Chromium ${browser.version()}; Playwright 1.64.1; no screen reader used.`,
    'INITIAL\n' + await page.locator('main').ariaSnapshot()];
  await page.keyboard.press('Enter');
  await expect(cards(page).first()).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  evidence.push('REVEALED\n' + await cards(page).first().ariaSnapshot());
  await focusCard(page, 11);
  await page.keyboard.press('Space');
  await expect(page.locator('[aria-live]')).toHaveText('Pair found. 1 pair matched.');
  await expect(cards(page).first()).toHaveAttribute('aria-disabled', 'true');
  const firstPair = new Set([0, 11]);
  for (const pair of pairs()) {
    if (pair.some(index => firstPair.has(index))) continue;
    for (const index of pair) { await focusCard(page, index); await page.keyboard.press('Enter'); }
  }
  await expect(page.locator('[aria-live]')).toHaveText(/^Pair found\. All pairs found in 8 moves and \d+:\d\d\.$/);
  await expect(page.locator('.win-banner')).toBeVisible();
  evidence.push('COMPLETED\n' + await page.locator('main').ariaSnapshot());
  await page.keyboard.press('Tab');
  await expect(page.locator('details summary')).toBeFocused();
  await page.getByRole('button', { name: 'New Game', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await expect(cards(page).first()).toHaveAccessibleName('Row 1, column 1, closed');
  evidence.push('NEW GAME\n' + await page.locator('main').ariaSnapshot());
  const path = testInfo.outputPath('accessibility-journey.txt');
  await writeFile(path, evidence.join('\n\n'));
  await testInfo.attach('accessibility-tree', { path, contentType: 'text/plain' });
});

test('roving focus stops at edges and preserves native Tab and modifier behavior', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await cards(page).first().focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.keyboard.press('Control+ArrowRight');
  await page.keyboard.press('Home');
  await page.keyboard.press('End');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.keyboard.press('Control+Enter');
  await page.keyboard.press('Shift+Space');
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(page.locator('details summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.keyboard.press('Tab');
  await expect(cards(page).first()).toBeFocused();
});

test('hidden identities stay outside the DOM; right-click, hover and cancellation do nothing', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await expect(page.locator('.card svg')).toHaveCount(0);
  const html = await cards(page).first().evaluate(element => element.outerHTML);
  expect(html).not.toMatch(/face|cyan|solid|plus|data-/);
  await cards(page).first().hover();
  await cards(page).first().click({ button: 'right' });
  await page.keyboard.press('Escape');
  await cards(page).first().dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' });
  await cards(page).first().dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch' });
  await expect(page.locator('.card svg')).toHaveCount(0);
  await expect(page.locator('.status')).toContainText('Moves: 0');
});

test('consecutive identical misses each update the one live region once', async ({ page }) => {
  await pauseClock(page);
  await page.goto('/');
  await loadBoard(page);
  await page.evaluate(() => {
    const region = document.querySelector('[aria-live]');
    if (!region) throw new Error('Missing live region');
    const updates: string[] = [];
    const observer = new MutationObserver(() => {
      updates.push(region.textContent ?? '');
      document.body.dataset.announcements = JSON.stringify(updates);
    });
    observer.observe(region, { childList: true, subtree: true, characterData: true });
  });
  for (let turn = 0; turn < 2; turn++) {
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.clock.runFor(816);
    await page.keyboard.press('ArrowDown');
  }
  await expect(page.locator('[aria-live]')).toHaveCount(1);
  const updates = await page.locator('body').getAttribute('data-announcements');
  expect(updates).toBe(JSON.stringify(Array(2).fill('No match. Cards close after a short pause.')));
});
