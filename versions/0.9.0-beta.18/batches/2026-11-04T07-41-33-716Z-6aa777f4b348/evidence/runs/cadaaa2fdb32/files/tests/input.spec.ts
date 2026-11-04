import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, keyboardTo, loadBoard, PAIRS } from './journey.ts';

test('complete keyboard journey and Chromium accessibility-tree evidence', async ({ page, browser }) => {
  await page.goto('/');
  const cdp = await page.context().newCDPSession(page);
  const evidence: { phase: string; tree: unknown; aria: string }[] = [];
  async function capture(phase: string) {
    const tree: unknown = await cdp.send('Accessibility.getFullAXTree');
    evidence.push({ phase, tree, aria: await page.locator('body').ariaSnapshot() });
  }
  await expect(page.getByLabel('Grid size')).toHaveAccessibleName('Grid size');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await loadBoard(page);
  await capture('closed board and native controls');
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('Enter');
  await capture('first card revealed by keyboard');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  let current = 0;
  for (const pair of PAIRS) {
    for (const index of pair) {
      current = await keyboardTo(page, current, index).then(() => index);
      await page.keyboard.press('Space');
    }
  }
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
  await expect(page.locator('[aria-live]')).toHaveText(/All pairs found in 8 moves/);
  await expect(cards(page).nth(current)).toHaveAttribute('aria-disabled', 'true');
  await capture('winning turn, final summary and matched card names');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(current)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(cards(page).first()).toBeFocused();
  await capture('new game and reset board tab stop');
  await mkdir('docs/evidence', { recursive: true });
  await writeFile('docs/evidence/accessibility-tree.json', JSON.stringify({
    browser: browser.version(), tool: 'Playwright 1.64.1 / Chromium CDP Accessibility.getFullAXTree',
    screenReaderUsed: false, evidence,
  }, null, 2));
});

test('pointer, cancellation, context menus, modifiers and remembered focus', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const first = cards(page).first();
  await first.hover();
  await first.click({ button: 'right' });
  await first.dispatchEvent('pointercancel', { pointerType: 'touch' });
  await expect(cards(page).locator('svg')).toHaveCount(0);
  await first.focus();
  await page.keyboard.press('Control+ArrowRight');
  await expect(first).toBeFocused();
  await page.keyboard.press('Control+Enter');
  await page.keyboard.press('Shift+Space');
  await expect(cards(page).locator('svg')).toHaveCount(0);
  await page.keyboard.press('End');
  await expect(first).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cards(page).nth(1).locator('svg')).toHaveCount(1);
});

test('completed touch tap activates once', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await loadBoard(page);
  await cards(page).nth(4).tap();
  await cards(page).nth(5).tap();
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await context.close();
});
