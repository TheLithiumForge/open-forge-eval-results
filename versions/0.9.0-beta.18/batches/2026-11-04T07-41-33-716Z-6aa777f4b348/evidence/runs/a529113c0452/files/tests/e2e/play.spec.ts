import { expect, test } from '@playwright/test';
import { GRID_SIZES } from '../../src/game/boardCode.ts';
import { cards, deal, finish, loadBoard, openGame, stat } from './support.ts';

for (const size of GRID_SIZES) {
  test(`finishes every pair on ${size}x${size}`, async ({ page }) => {
    await openGame(page, true);
    const code = `np1-${size}-1`;
    await loadBoard(page, code);
    await expect(cards(page)).toHaveCount(size * size);
    await finish(page, deal(code));
    await expect(stat(page, 'Moves')).toHaveText(`Moves: ${size * size / 2}`);
    await expect(stat(page, 'Pairs')).toHaveText(`Pairs: ${size * size / 2}/${size * size / 2}`);
    await expect(cards(page).filter({ has: page.locator('.card-check') })).toHaveCount(size * size);
    await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
    const time = await stat(page, 'Time').textContent();
    await page.clock.runFor(1500);
    await expect(stat(page, 'Time')).toHaveText(time ?? '');
    await expect(stat(page, 'Best')).toHaveText(`Best: ${size * size / 2}`);
  });
}

test('first reveal repeats, matches, and matched activation preserve exact moves', async ({ page }) => {
  await openGame(page, true);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(stat(page, 'Moves')).toHaveText('Moves: 0');
  await cards(page).nth(11).click();
  await expect(stat(page, 'Moves')).toHaveText('Moves: 1');
  await expect(stat(page, 'Pairs')).toHaveText('Pairs: 1/8');
  await cards(page).nth(0).focus();
  await page.keyboard.press('Enter');
  await expect(stat(page, 'Moves')).toHaveText('Moves: 1');
  await expect(cards(page).nth(0)).toHaveAttribute('aria-disabled', 'true');
  await expect(cards(page).nth(0)).toBeFocused();
});
