import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { cards, freezeClock, keyboardMove, loadBoard, SEED_ONE } from './helpers.ts';

test('complete keyboard accessibility-tree journey with one announcement per turn', async ({ page, browser }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadBoard(page);
  const evidence: string[] = [`Browser: ${browser.version()}`, 'Screen reader: not used (automated accessibility tree).'];
  evidence.push('INITIAL\n' + await page.locator('main').ariaSnapshot());
  await expect(page.getByLabel('Grid size')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(cards(page).nth(0)).toBeFocused();
  await page.evaluate(() => {
    const defaults: boolean[] = [];
    document.addEventListener('keydown', event => {
      if (event.shiftKey && ['ArrowRight', 'Enter', ' '].includes(event.key)) defaults.push(event.defaultPrevented);
    });
    Object.defineProperty(document, 'modifierDefaults', { value: defaults });
  });
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.press('Shift+Space');
  expect(await page.evaluate(() => Reflect.get(document, 'modifierDefaults'))).toEqual([false, false, false]);
  await expect(cards(page).nth(0)).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await page.evaluate(() => {
    const region = document.querySelector('[aria-live]');
    const records: string[] = [];
    const observer = new MutationObserver(() => records.push(region?.textContent ?? ''));
    if (region) observer.observe(region, { childList: true, subtree: true, characterData: true });
    Object.defineProperty(document, 'announcementRecords', { value: records, configurable: true });
  });
  let current = 0;
  for (let face = 0; face < 8; face++) {
    for (const index of [SEED_ONE.indexOf(face), SEED_ONE.lastIndexOf(face)]) {
      await keyboardMove(page, current, index);
      current = index;
      await page.keyboard.press(index % 2 ? 'Space' : 'Enter');
      await expect(cards(page).nth(index)).toHaveAccessibleName(/revealed|matched/);
      if (face === 0) evidence.push('FIRST PAIR PROGRESS\n' + await page.locator('main').ariaSnapshot());
    }
  }
  await expect(page.locator('[aria-live]')).toHaveCount(1);
  await expect(page.locator('[aria-live]')).toHaveAttribute('aria-atomic', 'true');
  await expect(page.locator('[aria-live]')).toHaveText('Pair found. All pairs found in 8 moves and 0:00.');
  const announcements: unknown = await page.evaluate(() => Reflect.get(document, 'announcementRecords'));
  expect(announcements).toEqual([
    'Pair found. 1 pair matched.', 'Pair found. 2 pairs matched.', 'Pair found. 3 pairs matched.',
    'Pair found. 4 pairs matched.', 'Pair found. 5 pairs matched.', 'Pair found. 6 pairs matched.',
    'Pair found. 7 pairs matched.', 'Pair found. All pairs found in 8 moves and 0:00.',
  ]);
  evidence.push('COMPLETED\n' + await page.locator('main').ariaSnapshot());
  await page.clock.runFor(1000);
  expect(await page.locator('.win-banner').evaluate(element => element.getAnimations().length)).toBe(0);
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(current)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  evidence.push('NEW GAME\n' + await page.locator('main').ariaSnapshot());
  mkdirSync('evidence', { recursive: true });
  writeFileSync('evidence/keyboard-accessibility.txt', evidence.join('\n\n'));
});

test('consecutive misses each create one live announcement; pointer cancellation is inert', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).hover();
  await cards(page).nth(0).click({ button: 'right' });
  await page.keyboard.press('Escape');
  await cards(page).nth(0).dispatchEvent('pointercancel');
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  const first = await page.locator('[aria-live] span').elementHandle();
  await expect(page.locator('[aria-live]')).toHaveText('No match. Cards close after a short pause.');
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.clock.runFor(800);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await expect(page.locator('[aria-live]')).toHaveText('No match. Cards close after a short pause.');
  expect(await first?.evaluate(element => element.isConnected)).toBe(false);
});
