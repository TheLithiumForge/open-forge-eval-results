import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cards, frozenClock, game, loadBoard, watchAnnouncements } from './helpers.ts';

test('complete keyboard accessibility-tree journey and one result per turn', async ({ page, browser }) => {
  await frozenClock(page);
  await page.goto('/');
  const stages: string[] = [`Neon Pairs automated keyboard evidence\nPlaywright 1.64.1; Chromium ${browser.version()}\nNo screen reader used.\n`];
  const capture = async (label: string) => {
    stages.push(`\n${label}\n${await page.locator('body').ariaSnapshot()}\n`);
  };
  await capture('Initial accessible controls');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await loadBoard(page);
  await page.clock.runFor(200);
  const messages = await watchAnnouncements(page);
  await page.getByRole('button', { name: 'Restart', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Row 1, column 1, closed', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cards(page).first()).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, revealed');
  await capture('First revealed face');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await page.clock.runFor(100);
  await capture('Mismatch and live result');
  await page.clock.runFor(700);
  let current = 1;
  async function moveTo(index: number): Promise<void> {
    while (Math.floor(current / 4) < Math.floor(index / 4)) { await page.keyboard.press('ArrowDown'); current += 4; }
    while (Math.floor(current / 4) > Math.floor(index / 4)) { await page.keyboard.press('ArrowUp'); current -= 4; }
    while (current % 4 < index % 4) { await page.keyboard.press('ArrowRight'); current++; }
    while (current % 4 > index % 4) { await page.keyboard.press('ArrowLeft'); current--; }
  }
  const deck = game().deck;
  for (let face = 0; face < 8; face++) {
    await moveTo(deck.indexOf(face));
    await page.keyboard.press('Enter');
    await moveTo(deck.lastIndexOf(face));
    await page.keyboard.press('Space');
    await page.clock.runFor(200);
    if (face === 0) {
      await expect(cards(page).nth(2)).toHaveAttribute('aria-disabled', 'true');
      await capture('First pair remains focusable and disabled for play');
    }
  }
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
  expect(messages).toHaveLength(9);
  expect(messages[0]).toBe('No match. Cards close after a short pause.');
  expect(messages[8]).toBe('Pair found. All pairs found in 9 moves and 0:02.');
  await capture('Final match, win, final moves and elapsed time');
  const cdp = await page.context().newCDPSession(page);
  const tree = await cdp.send('Accessibility.getFullAXTree');
  const liveNodes = tree.nodes.filter(node => node.properties?.some(p => p.name === 'live' && p.value.value === 'polite'));
  expect(liveNodes).toHaveLength(1);
  stages.push(`\nCDP live region properties\n${JSON.stringify(liveNodes, null, 2)}\n`);
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(current)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await capture('Exited board with Tab and started another game');
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/accessibility-tree.txt', stages.join('\n'));
});
