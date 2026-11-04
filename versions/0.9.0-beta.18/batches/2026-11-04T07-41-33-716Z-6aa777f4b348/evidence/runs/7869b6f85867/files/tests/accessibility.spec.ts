import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, freezeClock, live, loadBoard } from './journey.ts';

test('complete keyboard journey exposes positions, faces, results and win in the accessibility tree', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeFocused();
  await loadBoard(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).first()).toBeFocused();
  await expect(cards(page).first()).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(cards(page).locator('svg')).toHaveCount(0);
  const evidence = [`Browser: Chromium ${browser.version()}`, 'Tool: Playwright 1.64.1',
    'Screen reader: not used; spoken output remains user acceptance.', await page.locator('main').ariaSnapshot()];
  const observation = await page.evaluateHandle(() => {
    const messages: string[] = [];
    const region = document.querySelector('[aria-live]');
    const observer = new MutationObserver(() => { if (region?.textContent) messages.push(region.textContent); });
    if (region) observer.observe(region, { childList: true, subtree: true });
    return { messages, observer };
  });
  const deck = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
  let current = 0;
  const moveTo = async (target: number) => {
    while (Math.floor(current / 4) !== Math.floor(target / 4)) {
      const step = target > current ? 4 : -4;
      await page.keyboard.press(step > 0 ? 'ArrowDown' : 'ArrowUp'); current += step;
    }
    while (current !== target) {
      const step = target > current ? 1 : -1;
      await page.keyboard.press(step > 0 ? 'ArrowRight' : 'ArrowLeft'); current += step;
    }
  };
  for (let face = 0; face < 8; face++) {
    const first = deck.indexOf(face);
    const second = deck.lastIndexOf(face);
    await moveTo(first);
    await page.keyboard.press('Enter');
    await expect(cards(page).nth(first)).toHaveAccessibleName(/revealed$/);
    if (face === 0) evidence.push(await cards(page).nth(first).ariaSnapshot());
    await moveTo(second);
    await page.keyboard.press('Space');
    await expect(cards(page).nth(first)).toHaveAttribute('aria-disabled', 'true');
    await expect(live(page)).toContainText(face === 7 ? 'All pairs found in 8 moves' : `${face + 1} pair`);
  }
  await expect(page.locator('.win-banner')).toHaveText(/All pairs found!8 moves/);
  evidence.push(await page.locator('main').ariaSnapshot());
  const messages = await observation.evaluate(value => { value.observer.disconnect(); return value.messages; });
  expect(messages).toHaveLength(8);
  expect(messages[0]).toBe('Pair found. 1 pair matched.');
  expect(messages[7]).toMatch(/^Pair found\. All pairs found in 8 moves and \d+:\d{2}\.$/);
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await expect(cards(page).first()).toHaveAttribute('tabindex', '0');
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/keyboard-accessibility.txt', evidence.join('\n\n'));
});

test('arrows stop at edges, Tab leaves, modifiers stay with the browser', async ({ page }) => {
  await page.goto('/'); await loadBoard(page);
  await cards(page).first().focus();
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp');
  await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(cards(page).nth(5)).toBeFocused();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.keyboard.press('Tab'); await expect(cards(page).first()).toBeFocused();
});

test('consecutive identical misses are announced once each', async ({ page }) => {
  await page.goto('/'); await freezeClock(page); await loadBoard(page);
  const observation = await page.evaluateHandle(() => {
    const messages: string[] = [];
    const region = document.querySelector('[aria-live]');
    const observer = new MutationObserver(() => { if (region?.textContent) messages.push(region.textContent); });
    if (region) observer.observe(region, { childList: true, subtree: true });
    return { messages, observer };
  });
  for (let turn = 0; turn < 2; turn++) {
    await cards(page).nth(0).click(); await cards(page).nth(1).click();
    await page.clock.runFor(800);
  }
  const messages = await observation.evaluate(value => { value.observer.disconnect(); return value.messages; });
  expect(messages).toEqual(Array(2).fill('No match. Cards close after a short pause.'));
});
