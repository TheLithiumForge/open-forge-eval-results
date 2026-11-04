import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { card, DECK, freezeClock, loadBoard } from './helpers.ts';

test('complete keyboard and accessibility-tree journey with distinct announcements', async ({ page, browser }, info) => {
  const announcements: string[] = [];
  await page.exposeBinding('recordAnnouncement', (_source, text: unknown) => {
    if (typeof text === 'string') announcements.push(text);
  });
  await page.goto('/');
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
  await page.evaluate(() => {
    const region = document.querySelector('[aria-live]');
    const record: unknown = Reflect.get(window, 'recordAnnouncement');
    if (!region || typeof record !== 'function') throw new Error('Missing live region');
    new MutationObserver(() => { if (region.textContent) record(region.textContent); })
      .observe(region, { childList: true, characterData: true, subtree: true });
  });
  await loadBoard(page);
  await freezeClock(page);
  await page.clock.runFor(200);
  const evidence: string[] = [`Chromium ${browser.version()}; Playwright 1.64.1. No screen reader used.`];
  const capture = async (label: string) => evidence.push(`\n${label}\n${await page.locator('main').ariaSnapshot()}`);
  await capture('Hidden board, closed position names');
  expect(await page.locator('.board-grid svg').count()).toBe(0);
  expect(await page.locator('.board-grid').innerHTML()).not.toMatch(/cyan|magenta|data-face|face-id/);
  await page.getByLabel('Grid size').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(card(page, 0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(card(page, 0)).toBeFocused();
  await page.keyboard.press('Control+ArrowRight');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.press('Control+Space');
  await expect(card(page, 0)).toHaveAccessibleName('Row 1, column 1, closed');
  await page.keyboard.press('Enter');
  await expect(card(page, 0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  await capture('First reveal, face and state available');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await page.clock.runFor(800);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.clock.runFor(800);
  expect(announcements.filter((text) => text === 'No match. Cards close after a short pause.')).toHaveLength(2);
  let position = 1;
  const move = async (target: number) => {
    while (Math.floor(position / 4) < Math.floor(target / 4)) { await page.keyboard.press('ArrowDown'); position += 4; }
    while (Math.floor(position / 4) > Math.floor(target / 4)) { await page.keyboard.press('ArrowUp'); position -= 4; }
    while (position % 4 < target % 4) { await page.keyboard.press('ArrowRight'); position += 1; }
    while (position % 4 > target % 4) { await page.keyboard.press('ArrowLeft'); position -= 1; }
  };
  for (let face = 0; face < 8; face += 1) {
    for (const index of DECK.flatMap((value, index) => value === face ? [index] : [])) {
      await move(index);
      await page.keyboard.press('Enter');
    }
    await page.clock.runFor(200);
    if (face === 0) await capture('First pair, matched cards remain focusable');
  }
  await expect(page.getByText('All pairs found!', { exact: true })).toBeVisible();
  expect(announcements.filter((text) => text.startsWith('Pair found.'))).toHaveLength(8);
  expect(announcements.filter((text) => text.includes('All pairs found in 10 moves and'))).toHaveLength(1);
  await capture('Completed board, final turn and win in one announcement');
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(card(page, position)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(card(page, 0)).toBeFocused();
  await capture('New deal, native Tab exit and reset tab stop');
  evidence.push(`\nAnnouncements, in order:\n${announcements.join('\n')}`);
  const text = evidence.join('\n');
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/keyboard-journey.txt', text);
  await info.attach('accessibility-tree', { body: text, contentType: 'text/plain' });
});
