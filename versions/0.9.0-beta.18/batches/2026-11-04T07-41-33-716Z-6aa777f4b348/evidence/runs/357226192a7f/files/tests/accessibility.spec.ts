import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { cards, freezeClock, knownState, loadBoard } from './helpers.ts';

test('complete keyboard journey with accessibility-tree evidence and one result per turn', async ({ page, browser }) => {
  await page.goto('/');
  await expect(cards(page).first()).not.toBeFocused();
  await expect(page.getByRole('combobox', { name: 'Grid size' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await loadBoard(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(cards(page).first()).toBeFocused();
  await expect(page.locator('.board-grid button[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(cards(page).first()).toBeFocused();
  const initial = await page.locator('main').ariaSnapshot();
  expect(initial).toContain('Row 1, column 1, closed');
  const stages: string[] = [];
  const game = knownState();
  let current = 0;
  let turn = 0;
  for (const face of new Set(game.deck)) {
    for (let target = 0; target < game.deck.length; target++) {
      if (game.deck[target] !== face) continue;
      while (Math.floor(current / 4) < Math.floor(target / 4)) { await page.keyboard.press('ArrowDown'); current += 4; }
      while (Math.floor(current / 4) > Math.floor(target / 4)) { await page.keyboard.press('ArrowUp'); current -= 4; }
      while (current < target) { await page.keyboard.press('ArrowRight'); current++; }
      while (current > target) { await page.keyboard.press('ArrowLeft'); current--; }
      await page.keyboard.press(turn % 2 === 0 ? 'Enter' : 'Space');
      await expect(cards(page).nth(target)).toHaveAccessibleName(/revealed|matched/);
      if (turn === 0) stages.push('FIRST REVEAL\n' + await cards(page).nth(target).ariaSnapshot());
      turn++;
    }
    stages.push('TURN RESULT\n' + await page.locator('[aria-live]').ariaSnapshot());
  }
  await expect(page.locator('[aria-live]')).toHaveText(/Pair found\. All pairs found in 8 moves and \d+:\d{2}\./);
  await expect(page.getByText('Moves: 8', { exact: true })).toBeVisible();
  const completed = await page.locator('main').ariaSnapshot();
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(current)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(cards(page).first()).toBeFocused();
  mkdirSync('evidence', { recursive: true });
  writeFileSync('evidence/keyboard-accessibility.txt', ['Chromium ' + browser.version(),
    'Playwright 1.64.1; automated ARIA snapshots; no screen reader used.',
    'INITIAL\n' + initial, ...stages, 'COMPLETED\n' + completed].join('\n\n'));
});

test('consecutive identical misses each replace the live message; focus and clock do not', async ({ page }) => {
  await page.goto('/');
  await freezeClock(page);
  await loadBoard(page);
  await page.evaluate(() => {
    const region = document.querySelector('[aria-live]');
    const log = document.createElement('ol');
    log.id = 'announcement-log';
    log.hidden = true;
    document.body.append(log);
    if (!region) throw new Error('Missing live region');
    new MutationObserver(() => {
      const item = document.createElement('li');
      item.textContent = region.textContent;
      log.append(item);
    }).observe(region, { subtree: true, childList: true, characterData: true });
  });
  for (let i = 0; i < 2; i++) {
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.clock.runFor(800);
  }
  await expect(page.locator('#announcement-log li')).toHaveCount(2);
  await page.keyboard.press('ArrowRight');
  await page.clock.runFor(2000);
  await expect(page.locator('#announcement-log li')).toHaveCount(2);
  await expect(page.locator('[aria-live]')).toHaveCount(1);
});
