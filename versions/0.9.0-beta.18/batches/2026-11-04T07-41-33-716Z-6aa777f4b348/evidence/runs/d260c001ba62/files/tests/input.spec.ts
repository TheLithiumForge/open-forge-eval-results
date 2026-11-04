import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, loadBoard, VECTOR } from './helpers.ts';

test('native Tab exit, edge stops, card names, keyboard completion and accessibility evidence', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.getByLabel('Grid size', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await loadBoard(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(5)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(5)).toBeFocused();
  const trees = [`Browser: Chromium ${browser.version()}\nTool: Playwright 1.64.1\nScreen reader: not used\n`,
    `CLOSED BOARD\n${await page.locator('body').ariaSnapshot()}`];
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const nativeTrees: unknown[] = [await cdp.send('Accessibility.getFullAXTree')];
  let position = 5;
  for (let face = 0; face < 8; face++) {
    for (const target of [VECTOR.indexOf(face), VECTOR.lastIndexOf(face)]) {
      while (Math.floor(position / 4) !== Math.floor(target / 4)) {
        const step = target > position ? 4 : -4;
        await page.keyboard.press(step > 0 ? 'ArrowDown' : 'ArrowUp'); position += step;
      }
      while (position !== target) {
        const step = target > position ? 1 : -1;
        await page.keyboard.press(step > 0 ? 'ArrowRight' : 'ArrowLeft'); position += step;
      }
      await page.keyboard.press(face % 2 ? 'Space' : 'Enter');
      await expect(cards(page).nth(target)).toHaveAccessibleName(/(revealed|matched)$/);
      if (face === 0 && target === VECTOR.indexOf(face)) {
        trees.push(`REVEALED FACE\n${await page.locator('body').ariaSnapshot()}`);
        nativeTrees.push(await cdp.send('Accessibility.getFullAXTree'));
      }
    }
    await expect(page.locator('[aria-live]')).toContainText(face === 7 ? 'All pairs found in 8 moves' : `Pair found. ${face + 1}`);
  }
  await expect(page.locator('.win-banner')).toBeVisible();
  trees.push(`COMPLETED BOARD\n${await page.locator('body').ariaSnapshot()}`);
  nativeTrees.push(await cdp.send('Accessibility.getFullAXTree'));
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await mkdir('tests/evidence', { recursive: true });
  await writeFile('tests/evidence/accessibility.txt', trees.join('\n\n'));
  await writeFile('tests/evidence/accessibility-tree.json', JSON.stringify(nativeTrees, null, 2));
});

test('right click, hover, pointer cancellation and modified keys never reveal', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const first = cards(page).first();
  await first.hover();
  await first.click({ button: 'right' });
  await page.keyboard.press('Escape');
  await first.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' });
  await first.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch' });
  await first.focus();
  for (const key of ['Shift+ArrowRight', 'Control+ArrowDown', 'Shift+Enter', 'Shift+Space']) await first.press(key);
  await expect(first).toBeFocused();
  await expect(page.locator('.card svg')).toHaveCount(0);
  await expect(page.locator('.scoreboard')).toContainText('Moves: 0');
});

test('consecutive identical misses each mutate the single live region once', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const mutations: string[] = [];
  await page.exposeFunction('recordResult', (text: string) => { mutations.push(text); });
  await page.locator('[aria-live]').evaluate(element => {
    new MutationObserver(() => {
      const callback: unknown = Reflect.get(window, 'recordResult');
      if (typeof callback === 'function') callback(element.textContent ?? '');
    }).observe(element, { childList: true, subtree: true, characterData: true });
  });
  for (let i = 0; i < 2; i++) {
    await cards(page).nth(0).click(); await cards(page).nth(1).click();
    await expect(page.locator('.card.revealed')).toHaveCount(2);
    await expect(page.locator('.card.revealed')).toHaveCount(0);
  }
  expect(mutations).toEqual(Array(2).fill('No match. Cards close after a short pause.'));
  await expect(page.locator('[aria-live]')).toHaveCount(1);
});
