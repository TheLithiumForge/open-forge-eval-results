import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, live, loadBoard, moveTo, openGame, statistics } from './game.ts';

declare global { interface Window { recordAnnouncement: (text: string) => Promise<void> } }

test('complete keyboard journey with accessibility-tree evidence (I05–I17)', async ({ page, browser }) => {
  await openGame(page);
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
  await page.getByLabel('Grid size', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await loadBoard(page);
  await page.getByText('Reproduce a game', { exact: true }).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
  await expect(cards(page).first()).toBeFocused();
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  const evidence = [`# Keyboard accessibility-tree evidence\n\nPlaywright 1.64.1; Chromium ${browser.version()}. No screen reader used.\n\nThis automated journey uses native keyboard actions and the built distribution. Spoken output remains user acceptance.\n`];
  const capture = async (title: string) => { evidence.push(`## ${title}\n\n\`\`\`yaml\n${await page.locator('body').ariaSnapshot()}\n\`\`\`\n`); };
  await capture('Start: named controls and closed positions');
  const events: string[] = [];
  await page.exposeFunction('recordAnnouncement', (text: string) => { events.push(text); });
  await page.evaluate(() => {
    const region = document.querySelector('[role="status"]');
    if (!region) throw new Error('Missing result region');
    new MutationObserver(() => { if (region.textContent) void window.recordAnnouncement(region.textContent); })
      .observe(region, { childList: true, subtree: true, characterData: true });
  });
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp');
  await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cards(page).first()).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  await capture('First reveal: face name and state');
  await page.keyboard.press('Space');
  await expect(statistics(page)).toContainText('Moves: 0');
  await moveTo(page, 11); await page.keyboard.press('Space');
  await expect(cards(page).first()).toHaveAttribute('aria-disabled', 'true');
  await capture('First match: focusable matched cards and one turn result');
  const pairs = [[2, 6], [10, 14], [4, 5], [8, 15], [12, 13], [3, 7], [1, 9]];
  for (const [first, second] of pairs) {
    if (first === undefined || second === undefined) throw new Error('Invalid literal pair');
    await moveTo(page, first); await page.keyboard.press('Enter');
    await moveTo(page, second); await page.keyboard.press('Space');
  }
  await expect(live(page)).toHaveText('Pair found. All pairs found in 8 moves and 0:00.');
  await expect(statistics(page)).toContainText('Best: 8');
  await capture('Final match: unified result, win banner, moves and time');
  expect(events).toHaveLength(8);
  expect(events[0]).toBe('Pair found. 1 pair matched.');
  expect(events[7]).toBe('Pair found. All pairs found in 8 moves and 0:00.');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(cards(page).nth(9)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await expect(statistics(page)).toContainText('Moves: 0');
  await capture('Native Tab exit and another game');
  evidence.push(`## Turn event log\n\n\`\`\`json\n${JSON.stringify(events, null, 2)}\n\`\`\`\n`);
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/accessibility.md', evidence.join('\n'));
});

test('identical misses each announce once; focus, time and expiry stay silent (I16)', async ({ page }) => {
  await openGame(page); await loadBoard(page);
  const events: string[] = [];
  await page.exposeFunction('recordAnnouncement', (text: string) => { events.push(text); });
  await page.evaluate(() => {
    const region = document.querySelector('[role="status"]');
    if (!region) throw new Error('Missing result region');
    new MutationObserver(() => { if (region.textContent) void window.recordAnnouncement(region.textContent); })
      .observe(region, { childList: true, subtree: true, characterData: true });
  });
  for (let turn = 0; turn < 2; turn++) {
    await cards(page).nth(0).click(); await cards(page).nth(1).click();
    await page.keyboard.press('ArrowRight'); await page.clock.runFor(1000);
  }
  expect(events).toEqual(['No match. Cards close after a short pause.', 'No match. Cards close after a short pause.']);
  await expect(live(page)).toHaveAttribute('aria-live', 'polite');
  await expect(live(page)).toHaveAttribute('aria-atomic', 'true');
  await expect(live(page)).toHaveCount(1);
});
