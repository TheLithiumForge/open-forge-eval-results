import { expect, test } from '@playwright/test';
import { cards, loadBoard, loadSnapshot, partial, snapshot } from './helpers.ts';

const matched = [0, 11, 1, 9, 2, 6, 3, 7, 4, 5, 8, 15, 10, 14];
test('loads progress paused, blocks actions, resumes time and remembered focus', async ({ page }) => {
  await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'));
  const value = { ...partial([0, 11], { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 }), moves: 2 };
  await loadSnapshot(page, value);
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await page.clock.runFor(5000);
  await cards(page).nth(3).click();
  await page.keyboard.press('ArrowRight');
  await expect(cards(page).nth(3)).toBeFocused(); // Right edge stops.
  expect(await snapshot(page)).toEqual(value);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(3)).toBeFocused();
  await page.clock.runFor(299);
  expect(await snapshot(page)).toMatchObject({ elapsedMs: 1799, selection: { remainingMs: 1 } });
  await page.clock.runFor(1);
  expect(await snapshot(page)).toMatchObject({ elapsedMs: 1800, selection: { kind: 'closed' } });
});

test('rejects bad drafts without replacing current state or saved size', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page, 'np1-6-1');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-01');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('np1-4-01');
  await loadSnapshot(page, { invalid: true });
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(cards(page)).toHaveCount(36);
  await page.reload();
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
});

test('completed imports stay static and preserve best; resumed games can improve it', async ({ page }) => {
  await page.goto('/');
  const complete = { ...partial([...matched, 12, 13]), moves: 8 };
  await loadSnapshot(page, complete);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.win-banner')).toBeVisible();
  await expect(page.locator('.win-banner')).not.toHaveClass(/celebrate/);
  await expect(page.getByText('Best: none', { exact: true })).toBeVisible();
  await loadSnapshot(page, { ...partial(matched), moves: 20 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(12).click();
  await cards(page).nth(13).click();
  await expect(page.getByText('Best: 21', { exact: true })).toBeVisible();
  await loadSnapshot(page, { ...partial(matched), moves: 7 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await cards(page).nth(12).click();
  await cards(page).nth(13).click();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  for (const moves of [7, 30]) {
    await loadSnapshot(page, { ...partial(matched), moves });
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await cards(page).nth(12).click();
    await cards(page).nth(13).click();
    await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  }
  await loadSnapshot(page, { ...complete, moves: 999999 });
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Best: 8', { exact: true })).toBeVisible();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
});

test('storage failure keeps the game playable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
  });
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
});
