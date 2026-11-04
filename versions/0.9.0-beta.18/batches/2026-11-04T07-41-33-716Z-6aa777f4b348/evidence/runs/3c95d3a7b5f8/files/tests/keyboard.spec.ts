import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { createGame } from '../src/game/state.ts';
import { cards, frozenPage, keyboardTo, live, loadBoard, observeAnnouncements } from './support.ts';

test('supports the complete keyboard accessibility journey with tree evidence', async ({ page, browser }) => {
  await frozenPage(page);
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toHaveValue('4');
  await expect(page.locator('body')).toBeFocused();
  await page.getByRole('button', { name: 'New Game', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await loadBoard(page);
  const initial = await page.locator('main').ariaSnapshot();
  await expect(live(page)).toHaveCount(1);
  await expect(live(page)).toHaveAttribute('aria-atomic', 'true');
  const events = await observeAnnouncements(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(cards(page).first()).toBeFocused();
  await expect(cards(page).first()).toHaveAccessibleName('Row 1, column 1, closed');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(5)).toBeFocused();
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  const deck = createGame('np1-4-1').board.deck;
  let revealed = '';
  const results: string[] = [];
  for (let face = 0; face < 8; face += 1) {
    await keyboardTo(page, deck.indexOf(face));
    await page.keyboard.press('Enter');
    if (face === 0) {
      revealed = await page.locator('main').ariaSnapshot();
      await expect(cards(page).nth(2)).toHaveAccessibleName('Row 1, column 3, cyan solid circle, marker top, revealed');
      await page.clock.runFor(1000);
    }
    await keyboardTo(page, deck.lastIndexOf(face));
    await page.keyboard.press('Space');
    await expect.poll(() => events.length).toBe(face + 1);
    results.push(await live(page).innerText());
  }
  const completed = await page.locator('main').ariaSnapshot();
  expect(results[0]).toBe('Pair found. 1 pair matched.');
  expect(results[7]).toBe('Pair found. All pairs found in 8 moves and 0:01.');
  await expect(cards(page).nth(9)).toHaveAttribute('aria-disabled', 'true');
  await expect(cards(page).nth(9)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.clock.runFor(1000);
  expect(events).toEqual(results);
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(9)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  const restarted = await page.locator('main').ariaSnapshot();
  mkdirSync('evidence', { recursive: true });
  writeFileSync('evidence/accessibility.md', [
    '# Keyboard accessibility evidence', '',
    `Playwright 1.64.1; Chromium ${browser.version()}; Node ${process.version}.`,
    'No screen reader was used. These are browser accessibility-tree snapshots; spoken output remains user acceptance.', '',
    'Journey: find Grid size and New Game by name, activate New Game, load documented code np1-4-1, Tab into the board,',
    'move with arrows, reveal every pair with Enter and Space, Tab out, return to New Game, and start another deal.', '',
    ...[['Initial closed board', initial], ['First revealed face', revealed], ['Completed game', completed],
      ['New deal after native Tab exit', restarted]].flatMap(([heading, tree]) => [`## ${heading}`, '', '```yaml', tree ?? '', '```', '']),
    '## Turn announcements', '', ...results.map((result, index) => `${index + 1}. ${result}`), '',
    'Each turn produced exactly one live-region mutation. The final event combines the match and victory.',
    'Clock advancement, focus changes, and activating a matched card produced no further turn announcements.', '',
  ].join('\n'));
});

test('announces consecutive identical misses once each without expiry or focus repeats', async ({ page }) => {
  await frozenPage(page);
  await loadBoard(page);
  const events = await observeAnnouncements(page);
  for (let turn = 0; turn < 2; turn += 1) {
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await expect.poll(() => events.length).toBe(turn + 1);
    await cards(page).nth(2).focus();
    await page.keyboard.press('ArrowRight');
    await page.clock.runFor(816);
    expect(events).toHaveLength(turn + 1);
  }
  expect(events).toEqual(Array(2).fill('No match. Cards close after a short pause.'));
  await page.getByLabel('Board code', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect.poll(() => events.length).toBe(3);
  expect(events[2]).toBe('Invalid board code.');
  await page.clock.runFor(1000);
  expect(events).toHaveLength(3);
});
