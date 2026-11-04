import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { card, frozenClock, literalPairs, moveFocus, observeAnnouncements, openBoard } from './helpers.ts';

test('complete keyboard journey delivers accessibility-tree evidence', async ({ page, browser }) => {
  await frozenClock(page);
  await openBoard(page);
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveAccessibleName('Grid size');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.keyboard.press('Tab');
  await expect(card(page, 0)).toBeFocused();
  const initial = await page.locator('body').ariaSnapshot();
  const events = await observeAnnouncements(page);
  const turns: string[] = [];
  let position = 0;
  let revealed = '';
  for (const [first, second] of literalPairs) {
    await moveFocus(page, position, first);
    await page.keyboard.press('Enter');
    if (!revealed) revealed = await page.locator('body').ariaSnapshot();
    await moveFocus(page, first, second);
    await page.keyboard.press('Space');
    position = second;
    await expect(card(page, first)).toHaveAttribute('aria-disabled', 'true');
    await expect(card(page, second)).toBeFocused();
    turns.push(await page.getByRole('status').innerText());
  }
  await expect.poll(() => events.length).toBe(8);
  expect(events).toEqual(turns);
  expect(events.at(-1)).toBe('Pair found. All pairs found in 8 moves and 0:00.');
  const completed = await page.locator('body').ariaSnapshot();
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(card(page, position)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.card-closed')).toHaveCount(16);
  const reset = await page.locator('body').ariaSnapshot();
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/accessibility.md', [
    '# Keyboard accessibility evidence', '',
    `Chromium ${browser.version()}, Playwright 1.64.1; automated accessibility tree via Locator.ariaSnapshot().`, '',
    'No screen reader was used. Spoken output remains user acceptance. Board: np1-4-1; controlled active clock: 0ms.', '',
    'Native Tab entered the board after Restart. Arrow keys moved to both cards in every literal pair; Enter and Space revealed them. Matched cards remained focused and aria-disabled. Tab left for the reproduction summary; Shift+Tab returned to the remembered card, then reached New Game, which started another deal.', '',
    '## Initial closed board', '', '```yaml', initial, '```', '',
    '## First reveal', '', '```yaml', revealed, '```', '',
    '## Exactly one announcement per turn', '', ...turns.map((text, index) => `${index + 1}. ${text}`), '',
    'The live region is polite and atomic. Separate browser checks cover consecutive identical misses and verify that time, focus and mismatch closure add no announcement.', '',
    '## Completed board', '', '```yaml', completed, '```', '',
    '## New Game through keyboard', '', '```yaml', reset, '```', '',
  ].join('\n'));
});
