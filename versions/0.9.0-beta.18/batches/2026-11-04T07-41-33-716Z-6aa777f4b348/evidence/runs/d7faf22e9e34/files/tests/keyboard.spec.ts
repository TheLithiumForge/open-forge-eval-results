import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createGame } from '../src/game/state.ts';
import { faceIdentity } from '../src/game/board/faces.ts';
import { loadBoard, start } from './helpers.ts';
import { moveKeyboard } from './keyboardNavigation.ts';

test('complete native keyboard journey exposes positions, faces, results and victory in the accessibility tree', async ({ page, browser }) => {
  await start(page);
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.getByLabel('Grid size').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  const code = await page.getByLabel('Board code', { exact: true }).inputValue();
  const game = createGame(code);
  if (!game) throw new Error('Current board code must be valid');
  const phases: string[] = [`# Chromium ${browser.version()}, Playwright 1.64.1; no screen reader used.`];
  phases.push(`# Closed board\n${await page.locator('main').ariaSnapshot()}`);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.card').first()).toBeFocused();
  let current = 0;
  for (let face = 0; face < 8; face += 1) {
    const first = game.deck.indexOf(face);
    const second = game.deck.lastIndexOf(face);
    current = await moveKeyboard(page, current, first, 4);
    await page.keyboard.press('Enter');
    await expect(page.locator('.card').nth(first)).toHaveAccessibleName(new RegExp(`${faceIdentity(face).name}, revealed$`));
    if (face === 0) phases.push(`# First reveal\n${await page.locator('main').ariaSnapshot()}`);
    current = await moveKeyboard(page, current, second, 4);
    await page.keyboard.press('Space');
    await expect(page.locator('.card').nth(first)).toHaveAttribute('aria-disabled', 'true');
    if (face === 0) phases.push(`# First pair\n${await page.locator('main').ariaSnapshot()}`);
  }
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
  await expect(page.locator('[aria-live="polite"]')).toHaveText(/Pair found\. All pairs found in 8 moves and \d+:\d{2}\./);
  phases.push(`# Victory\n${await page.locator('main').ariaSnapshot()}`);
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.card').nth(current)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.card.closed')).toHaveCount(16);
  phases.push(`# New game\n${await page.locator('main').ariaSnapshot()}`);
  await mkdir('evidence', { recursive: true });
  await writeFile('evidence/keyboard-journey.aria.yml', `${phases.join('\n\n')}\n`);
});

test('one remembered tab stop, edge stops and no hidden face identities', async ({ page }) => {
  await start(page);
  await loadBoard(page);
  await expect(page.locator('.card[tabindex="0"]')).toHaveCount(1);
  await expect(page.locator('.card-face')).toHaveCount(0);
  const backs = await page.locator('.card').evaluateAll((cards) => cards.map((card) => card.innerHTML));
  expect(new Set(backs).size).toBe(1);
  for (const button of await page.locator('.card').all()) {
    await expect(button).toHaveAccessibleName(/^Row [1-4], column [1-4], closed$/);
    expect(await button.evaluate((element) => [...element.attributes].some((attribute) => /face|seed/.test(attribute.name)))).toBe(false);
  }
  await page.locator('.card').first().focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.card').first()).toBeFocused();
  for (let count = 0; count < 3; count += 1) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.card').nth(7)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByText('Reproduce a game', { exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.card').nth(7)).toBeFocused();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});
