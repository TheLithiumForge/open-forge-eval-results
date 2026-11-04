import { expect, test } from '@playwright/test';
import { cards, loadBoard, openTools, snapshot, solve } from './helpers.ts';
import { SIZES } from '../src/game/boardCode.ts';

test('turns, draft retention, reset timers and exact active mismatch interval', async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'));
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(11).click();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await expect(cards(page).nth(0)).toHaveAttribute('aria-disabled', 'true');
  await page.getByLabel('Board code', { exact: true }).fill('my draft');
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await cards(page).nth(3).click();
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('my draft');
  await page.clock.runFor(799);
  await expect(cards(page).nth(1)).toHaveAttribute('aria-label', /revealed$/);
  await page.clock.runFor(1);
  // An action synchronizes the monotonic clock even between rendering ticks.
  await cards(page).nth(3).click();
  await expect(cards(page).nth(1)).toHaveAttribute('aria-label', /closed$/);
  await expect(cards(page).nth(3)).toHaveAttribute('aria-label', /revealed$/);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-1');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await cards(page).nth(2).click();
  await page.clock.runFor(1000);
  await expect(cards(page).nth(2)).toHaveAttribute('aria-label', /revealed$/);
  expect(await snapshot(page)).toMatchObject({ moves: 0, selection: { kind: 'one', index: 2 } });
  await cards(page).nth(1).click(); // Create a mismatch before replacing the deal.
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue('np1-4-1');
  await expect(page.getByText('Time: 0:00', { exact: true })).toBeVisible();
});

test('hidden-page time pauses both clocks and continues the remaining interval', async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'));
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(10000);
  expect(await snapshot(page)).toMatchObject({ elapsedMs: 300, selection: { remainingMs: 500 } });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  expect(await snapshot(page)).toMatchObject({ elapsedMs: 799, selection: { remainingMs: 1 } });
  await page.clock.runFor(1);
  expect(await snapshot(page)).toMatchObject({ elapsedMs: 800, selection: { kind: 'closed' } });
});

for (const size of SIZES) test(`complete all pairs on ${size}x${size}`, async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, `np1-${size}-1`);
  await solve(page, `np1-${size}-1`);
  await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Best: ${size * size / 2}`, { exact: true })).toBeVisible();
  await expect(cards(page)).toHaveCount(size * size);
  await openTools(page);
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue(String(size));
});
