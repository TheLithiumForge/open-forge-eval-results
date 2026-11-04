import { expect, test } from '@playwright/test';
import { SIZES } from '../src/game/boardCode.ts';
import { cards, frozen, game, loadBoard, pairs, readSnapshot, visibility } from './gameDriver.ts';

for (const size of SIZES) test(`finishes a complete ${size}x${size} deal`, async ({ page }) => {
  await frozen(page);
  await loadBoard(page, `np1-${size}-1`);
  const state = game(`np1-${size}-1`);
  await cards(page).evaluateAll((elements, order) => {
    for (const index of order) {
      const button = elements[index];
      if (!(button instanceof HTMLButtonElement)) throw new Error('Missing native card');
      button.click();
    }
  }, pairs(state).flat());
  await expect(page.getByRole('heading', { name: 'All pairs found!' })).toBeVisible();
  await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`, { exact: true })).toBeVisible();
  await expect(page.locator('.card.matched')).toHaveCount(size * size);
  await expect(page.getByText(`Best: ${size * size / 2}`, { exact: true })).toBeVisible();
});

test('one reveal, repeats, matches and the exact active mismatch interval', async ({ page }) => {
  await frozen(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(11).click();
  await cards(page).nth(0).press('Enter');
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await cards(page).nth(3).press('Enter');
  await page.clock.runFor(799);
  expect((await readSnapshot(page)).selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 1 });
  await page.clock.runFor(1);
  expect((await readSnapshot(page)).selection).toEqual({ kind: 'closed' });
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
});

test('hiding pauses both elapsed time and a pending mismatch', async ({ page }) => {
  await frozen(page);
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(250);
  await visibility(page, true);
  await page.clock.runFor(5000);
  expect(await readSnapshot(page)).toMatchObject({ elapsedMs: 250, selection: { kind: 'mismatch', remainingMs: 550 } });
  await visibility(page, false);
  await page.clock.runFor(549);
  expect((await readSnapshot(page)).selection.kind).toBe('mismatch');
  await page.clock.runFor(1);
  expect(await readSnapshot(page)).toMatchObject({ elapsedMs: 800, selection: { kind: 'closed' } });
});
