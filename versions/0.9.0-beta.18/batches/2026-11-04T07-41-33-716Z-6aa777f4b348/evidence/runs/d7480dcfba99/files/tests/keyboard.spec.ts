import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { cards, loadBoard } from './helpers.ts';
import { generateBoard } from '../src/game/boardCode.ts';

async function move(page: Page, from: number, to: number) {
  let current = from;
  while (Math.floor(current / 4) !== Math.floor(to / 4)) {
    const down = current < to;
    await page.keyboard.press(down ? 'ArrowDown' : 'ArrowUp');
    current += down ? 4 : -4;
  }
  while (current !== to) {
    const right = current < to;
    await page.keyboard.press(right ? 'ArrowRight' : 'ArrowLeft');
    current += right ? 1 : -1;
  }
  await expect(cards(page).nth(to)).toBeFocused();
}

test('complete keyboard journey with accessibility-tree evidence', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeFocused();
  await expect(page.getByLabel('Grid size', { exact: true })).toBeVisible();
  await loadBoard(page);
  await page.getByText('Reproduce a game', { exact: true }).click();
  const evidence = [`Browser: ${browser.version()}`, 'Tool: Playwright 1.64.1', 'Screen reader: not used'];
  evidence.push('INITIAL TREE', await page.locator('body').ariaSnapshot());
  await page.getByRole('button', { name: 'New Game', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(cards(page).nth(0)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cards(page).nth(0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  evidence.push('FIRST REVEAL', await page.locator('body').ariaSnapshot());
  await move(page, 0, 11);
  await page.keyboard.press('Space');
  await expect(page.locator('[aria-live]')).toHaveText('Pair found. 1 pair matched.');
  evidence.push('FIRST MATCH', await page.locator('body').ariaSnapshot());
  const board = generateBoard('np1-4-1');
  if (!board) throw new Error('Invalid test board');
  let focused = 11;
  for (let face = 0; face < 8; face++) {
    if (face === 6) continue;
    const first = board.deck.indexOf(face);
    const second = board.deck.lastIndexOf(face);
    await move(page, focused, first);
    await page.keyboard.press('Enter');
    await move(page, first, second);
    await page.keyboard.press('Space');
    focused = second;
  }
  await expect(page.locator('[aria-live]')).toHaveText(/Pair found\. All pairs found in 8 moves and \d+:\d\d\./);
  evidence.push('WIN', await page.locator('body').ariaSnapshot());
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(focused)).toBeFocused();
  await page.getByRole('button', { name: 'New Game', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  evidence.push('NEW GAME', await page.locator('body').ariaSnapshot());
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/accessibility-journey.txt', evidence.join('\n\n'));
});

test('announces consecutive identical misses once each and ignores focus and timer renders', async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'));
  await loadBoard(page);
  const live = page.locator('[aria-live] span');
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  const first = await live.elementHandle();
  await expect(live).toHaveText('No match. Cards close after a short pause.');
  await page.keyboard.press('ArrowRight');
  await page.clock.runFor(800);
  expect(await first?.evaluate(node => node.isConnected)).toBe(true);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  expect(await first?.evaluate(node => node.isConnected)).toBe(false);
  await expect(live).toHaveText('No match. Cards close after a short pause.');
  await page.clock.runFor(1000);
  await expect(live).toHaveText('No match. Cards close after a short pause.');
});

test('native input leaves right-click, hover, cancellation and modifier keys inactive', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const card = cards(page).nth(0);
  await card.hover();
  await card.click({ button: 'right' });
  await page.keyboard.press('Escape');
  await card.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch' });
  await expect(card).toHaveAccessibleName('Row 1, column 1, closed');
  await card.focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Home');
  await expect(card).toBeFocused();
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.press('Control+Space');
  await expect(card).toHaveAccessibleName('Row 1, column 1, closed');
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(1)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(1)).toBeFocused();
});
