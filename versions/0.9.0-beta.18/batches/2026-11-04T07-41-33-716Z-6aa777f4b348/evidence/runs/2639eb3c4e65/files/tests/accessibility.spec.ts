import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, DECK, freezeTime, loadBoard } from './helpers.ts';

test('complete keyboard journey with accessibility-tree evidence', async ({ page, browser }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeFocused();
  await expect(page.getByLabel('Grid size')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await loadBoard(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  const evidence = [`Chromium ${browser.version()}; Playwright 1.64.1; Node ${process.version}.`,
    'Automated accessibility tree; no screen reader used. Spoken confirmation remains user acceptance.',
    '\nINITIAL\n' + await page.locator('main').ariaSnapshot()];
  let position = 0;
  async function moveTo(target: number) {
    while (Math.floor(position / 4) < Math.floor(target / 4)) { await page.keyboard.press('ArrowDown'); position += 4; }
    while (Math.floor(position / 4) > Math.floor(target / 4)) { await page.keyboard.press('ArrowUp'); position -= 4; }
    while (position % 4 < target % 4) { await page.keyboard.press('ArrowRight'); position++; }
    while (position % 4 > target % 4) { await page.keyboard.press('ArrowLeft'); position--; }
  }
  for (let face = 0; face < 8; face++) {
    for (const [index, id] of DECK.entries()) {
      if (id !== face) continue;
      await moveTo(index);
      await page.keyboard.press(index % 2 ? 'Space' : 'Enter');
      if (face === 0 && index === 2) {
        await expect(cards(page).nth(2)).toHaveAccessibleName('Row 1, column 3, cyan solid circle, marker top, revealed');
        evidence.push('\nFIRST REVEAL\n' + await page.locator('main').ariaSnapshot());
      }
    }
    await expect(page.locator('[aria-live="polite"]')).toHaveText(face === 7 ?
      /Pair found\. All pairs found in 8 moves and \d+:\d{2}\./ :
      `Pair found. ${face + 1} ${face === 0 ? 'pair' : 'pairs'} matched.`);
    if (face === 0) evidence.push('\nFIRST MATCH\n' + await page.locator('main').ariaSnapshot());
  }
  await expect(page.locator('.win-banner')).toBeVisible();
  evidence.push('\nWIN\n' + await page.locator('main').ariaSnapshot());
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(position)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  evidence.push('\nNEXT GAME\n' + await page.locator('main').ariaSnapshot());
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/accessibility.txt', evidence.join('\n'));
  await testInfo.attach('keyboard-accessibility-tree', { path: 'evidence/accessibility.txt', contentType: 'text/plain' });
});

test('roving focus, edge stops, browser keys, hidden identity and pointer cancellation', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const before = await cards(page).nth(0).evaluate(button => button.outerHTML);
  expect(before).not.toMatch(/cyan|solid|circle|data-face|face-id|marker/);
  await cards(page).nth(0).hover();
  await cards(page).nth(0).click({ button: 'right' });
  await page.keyboard.press('Escape');
  await cards(page).nth(0).dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch' });
  await expect(cards(page).nth(0)).toHaveClass(/closed/);
  await cards(page).nth(0).focus();
  for (const key of ['ArrowLeft', 'ArrowUp', 'Home', 'Control+ArrowRight', 'Shift+ArrowDown', 'Shift+Enter']) {
    await page.keyboard.press(key);
    await expect(cards(page).nth(0)).toBeFocused();
    await expect(cards(page).nth(0)).toHaveClass(/closed/);
  }
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(1)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(1)).toBeFocused();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  expect(await cards(page).evaluateAll(buttons => buttons.filter(button => button.tabIndex === 0).length)).toBe(1);
});

test('identical misses each announce once and clock/focus/closing do not repeat', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/');
  await loadBoard(page);
  await page.locator('[aria-live="polite"]').evaluate(region => {
    const results: string[] = [];
    new MutationObserver(() => {
      const text = region.textContent?.trim();
      if (text) results.push(text);
      region.setAttribute('data-observed', JSON.stringify(results));
    }).observe(region, { childList: true, characterData: true, subtree: true });
  });
  for (let turn = 0; turn < 2; turn++) {
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.keyboard.press('ArrowDown');
    await page.clock.runFor(832);
  }
  await expect(page.locator('[aria-live="polite"]')).toHaveAttribute('data-observed',
    JSON.stringify(['No match. Cards close after a short pause.', 'No match. Cards close after a short pause.']));
});

test.describe('touch', () => {
  test.use({ hasTouch: true, viewport: { width: 360, height: 800 } });
  test('completed taps use the same card action', async ({ page }) => {
    await page.goto('/');
    await loadBoard(page);
    await cards(page).nth(0).tap();
    await cards(page).nth(11).tap();
    await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
    await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible();
  });
});
