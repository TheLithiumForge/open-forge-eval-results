import { expect, test } from '@playwright/test';
import { generateDeck, sizes } from '../src/game/deal.ts';
import { deck4, exported, loadBoard, openTools } from './helpers.ts';

test('native controls, hidden information, moves and reset focus', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.getByLabel('Grid size')).toHaveValue('4');
  await expect(page.locator('.card')).toHaveCount(16);
  await expect(page.locator('.card').first()).toHaveAccessibleName('Row 1, column 1, closed');
  await expect(page.locator('.card svg')).toHaveCount(0);
  const hidden = await page.locator('.board').innerHTML();
  expect(hidden).not.toMatch(/data-face|cyan|magenta|marker|<path|face-id/);
  await loadBoard(page, '  np1-4-1  ');
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await page.getByLabel('Board code', { exact: true }).fill('draft');
  const cards = page.locator('.card');
  await cards.nth(0).click();
  await cards.nth(0).click();
  await expect(page.locator('.status')).toContainText('Moves: 0');
  await cards.nth(11).click();
  await expect(page.locator('.status')).toContainText('Moves: 1');
  await expect(page.locator('.status')).toContainText('Pairs: 1/8');
  await expect(cards.nth(0)).toHaveAttribute('aria-disabled', 'true');
  await expect(cards.nth(0)).toHaveAccessibleName('Row 1, column 1, cyan solid plus, marker top, matched');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('draft');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
  await expect(cards.first()).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.status')).toContainText('Moves: 0');
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeFocused();
  expect(await page.getByLabel('Board code', { exact: true }).inputValue()).not.toBe('np1-4-1');
});

for (const size of sizes) {
  test(`completes all ${size}x${size} pairs through native card buttons`, async ({ page }) => {
    await page.goto('/');
    await loadBoard(page, `np1-${size}-1`);
    await expect(page.getByLabel('Grid size')).toHaveValue(String(size));
    await expect(page.locator('.card')).toHaveCount(size * size);
    const deck = size === 4 ? deck4 : generateDeck(size, 1);
    await page.locator('.card').nth(deck.indexOf(0)).click();
    await page.locator('.card').nth(deck.lastIndexOf(0)).click();
    // Complete the middle pairs with native DOM clicks; the first and final
    // pairs use real browser pointer events. The documented code supplies the deck.
    await page.locator('.card').evaluateAll((cards, knownDeck) => {
      for (let face = 1; face < knownDeck.length / 2 - 1; face++) {
        const first = cards[knownDeck.indexOf(face)];
        const second = cards[knownDeck.lastIndexOf(face)];
        if (first instanceof HTMLButtonElement && second instanceof HTMLButtonElement) {
          first.click(); second.click();
        }
      }
    }, [...deck]);
    const lastFace = size * size / 2 - 1;
    await page.locator('.card').nth(deck.indexOf(lastFace)).click();
    await page.locator('.card').nth(deck.lastIndexOf(lastFace)).click();
    await expect(page.locator('.win-banner')).toContainText(`${size * size / 2} moves`);
    await expect(page.locator('.card.matched')).toHaveCount(size * size);
    await expect(page.locator('.status')).toContainText(`Best: ${size * size / 2}`);
    const game = await exported(page);
    expect(game.matched.length).toBe(size * size);
    expect(game.selection.kind).toBe('closed');
    const elapsed = game.elapsedMs;
    await page.waitForTimeout(100);
    expect((await exported(page)).elapsedMs).toBe(elapsed);
  });
}

test('invalid loads preserve state, drafts, storage and one live region', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await page.locator('.card').first().click();
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-01');
  const saved = await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'));
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-01');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByLabel('Snapshot JSON').fill('{"version":2}');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON')).toHaveValue('{"version":2}');
  expect(await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1'))).toBe(saved);
  await expect(page.locator('[aria-live]')).toHaveCount(1);
  await expect(page.locator('[aria-live]')).toHaveAttribute('aria-atomic', 'true');
  await openTools(page);
  await expect(page.getByLabel('Board code', { exact: true })).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON')).toHaveAttribute('maxlength', '65536');
});
