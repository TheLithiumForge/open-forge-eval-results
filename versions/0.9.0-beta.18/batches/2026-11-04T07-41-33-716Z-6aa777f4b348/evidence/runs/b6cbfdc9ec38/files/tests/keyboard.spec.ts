import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { cards, gameFor, live, loadBoard, openGame, pairsFor } from './gameHarness.ts';
import { faceIdentity } from '../src/game/board/faceIdentity.ts';

async function moveTo(page: Page, from: number, to: number): Promise<number> {
  let current = from;
  while (Math.floor(current / 4) !== Math.floor(to / 4)) {
    const down = current < to;
    await page.keyboard.press(down ? 'ArrowDown' : 'ArrowUp'); current += down ? 4 : -4;
  }
  while (current !== to) {
    const right = current < to;
    await page.keyboard.press(right ? 'ArrowRight' : 'ArrowLeft'); current += right ? 1 : -1;
  }
  await expect(cards(page).nth(to)).toBeFocused();
  return current;
}

test('complete keyboard accessibility-tree journey and start another game', async ({ page, browser }) => {
  await openGame(page);
  await expect(page.locator('body')).toBeFocused();
  await loadBoard(page);
  await page.getByRole('combobox', { name: 'Grid size', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  const code = await page.getByLabel('Board code').inputValue();
  const evidence = [`Chromium ${browser.version()}, Playwright 1.64.1; no screen reader used.`,
    'Initial controls and closed board:', await page.locator('body').ariaSnapshot()];
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  await expect(cards(page).nth(0)).toBeFocused();
  await expect(cards(page).nth(0)).toHaveAccessibleName('Row 1, column 1, closed');
  let current = 0;
  let turn = 0;
  for (const pair of pairsFor(code)) {
    for (const position of pair) {
      current = await moveTo(page, current, position);
      await page.keyboard.press(position % 2 ? 'Space' : 'Enter');
      const face = gameFor(code).deck[position];
      if (face === undefined) throw new Error('Invalid test index.');
      await expect(cards(page).nth(position)).toHaveAccessibleName(new RegExp(faceIdentity(face).name));
      if (turn === 0) evidence.push('First reveal:', await cards(page).nth(position).ariaSnapshot());
    }
    turn += 1;
    await expect(live(page)).toHaveText(turn === 8 ? /Pair found\. All pairs found in 8 moves and / :
      turn === 1 ? 'Pair found. 1 pair matched.' : `Pair found. ${turn} pairs matched.`);
    evidence.push(`Turn ${turn}:`, await live(page).ariaSnapshot());
  }
  await expect(page.locator('.card--matched')).toHaveCount(16);
  await expect(cards(page).nth(current)).toHaveAttribute('aria-disabled', 'true');
  evidence.push('Completed game:', await page.locator('body').ariaSnapshot());
  await page.keyboard.press('Tab');
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(current)).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  evidence.push('After starting another game:', await page.locator('body').ariaSnapshot());
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/accessibility-tree.txt', evidence.join('\n\n') + '\n');
});

test('bounded navigation, remembered tab stop and reset focus', async ({ page }) => {
  await openGame(page); await loadBoard(page);
  await cards(page).nth(0).focus();
  for (const key of ['ArrowLeft', 'ArrowUp', 'Control+ArrowRight']) {
    await page.keyboard.press(key); await expect(cards(page).nth(0)).toBeFocused();
  }
  await page.keyboard.press('Control+Enter'); await page.keyboard.press('Shift+Space');
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  await moveTo(page, 0, 15);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(15)).toBeFocused();
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(cards(page).nth(15)).toBeFocused();
  for (const name of ['Restart', 'New Game']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('button', { name, exact: true })).toBeFocused();
    await expect(cards(page).nth(0)).toHaveAttribute('tabindex', '0');
  }
});
