import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createGame } from '../../src/game/state.ts';
import { CARDS, keyboardTo, loadBoard } from './helpers.ts';

test('complete 4x4 keyboard journey with accessibility-tree evidence', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeFocused();
  const trees = [`Chromium ${browser.version()}; Playwright 1.64.1; Node ${process.versions.node}; no screen reader used.\n`];
  trees.push(`INITIAL\n${await page.locator('main').ariaSnapshot()}`);
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Grid size')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator(CARDS).nth(0)).toBeFocused();
  await expect(page.locator(CARDS).nth(0)).toHaveAccessibleName('Row 1, column 1, closed');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('np1-4-1');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator(CARDS).nth(0)).toBeFocused();
  const game = createGame('np1-4-1');
  for (let face = 0; face < 8; face++) {
    await keyboardTo(page, game.board.deck.indexOf(face));
    await page.keyboard.press(face % 2 ? 'Space' : 'Enter');
    if (face === 0) trees.push(`FIRST REVEAL\n${await page.locator('main').ariaSnapshot()}`);
    await keyboardTo(page, game.board.deck.lastIndexOf(face));
    await page.keyboard.press(face % 2 ? 'Enter' : 'Space');
    if (face === 0) {
      await expect(page.getByRole('status')).toHaveText('Pair found. 1 pair matched.');
      trees.push(`FIRST MATCH\n${await page.locator('main').ariaSnapshot()}`);
    }
  }
  await expect(page.getByRole('status')).toHaveText(/Pair found\. All pairs found in 8 moves and \d+:\d{2}\./);
  trees.push(`WIN\n${await page.locator('main').ariaSnapshot()}`);
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  trees.push(`NEW GAME\n${await page.locator('main').ariaSnapshot()}`);
  await writeFile('evidence/keyboard-accessibility.txt', trees.join('\n\n'));
});
test('roving focus, edge stops, blocked turns, browser keys and hidden identities', async ({ page }) => {
  await page.goto('/');
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(60000);
  await loadBoard(page);
  const cards = page.locator(CARDS);
  const html = await cards.nth(0).evaluate(element => element.outerHTML);
  expect(html).not.toMatch(/cyan|solid|marker|face-id|data-face|<circle/);
  await cards.nth(0).focus();
  for (const key of ['ArrowLeft', 'ArrowUp', 'Home', 'End', 'Control+ArrowRight', 'Shift+ArrowDown']) {
    await page.keyboard.press(key);
    await expect(cards.nth(0)).toBeFocused();
  }
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.press('Shift+Space');
  await expect(cards.nth(0)).toHaveAccessibleName('Row 1, column 1, closed');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
  await page.keyboard.press('ArrowDown');
  await expect(cards.nth(5)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cards.nth(5)).toHaveAccessibleName('Row 2, column 2, closed');
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards.nth(5)).toBeFocused();
});
test('each identical turn result replaces the live message exactly once', async ({ page }) => {
  await page.goto('/');
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(60000);
  await loadBoard(page);
  await page.evaluate(() => {
    const live = document.querySelector('[role="status"]');
    if (!live) throw new Error('Missing live region');
    const log = document.createElement('pre');
    log.id = 'announcement-evidence';
    log.hidden = true;
    document.body.append(log);
    new MutationObserver(() => { log.textContent += `${live.textContent}\n`; })
      .observe(live, { childList: true, subtree: true, characterData: true });
  });
  for (let turn = 0; turn < 2; turn++) {
    await page.locator(CARDS).nth(0).click();
    await page.locator(CARDS).nth(1).click();
    await page.clock.runFor(816);
    await page.keyboard.press('ArrowRight');
  }
  const text = await page.locator('#announcement-evidence').textContent();
  expect(text?.trim().split('\n')).toEqual(Array(2).fill('No match. Cards close after a short pause.'));
});
