import { expect, test } from '@playwright/test';

test('snapshot pause, mismatch restart, resumed wins, and best scores follow the session rules', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('neon-pairs.best.v1', JSON.stringify({ 4: 9 })));
  await page.reload();
  await expect(page.locator('.game-stats')).toContainText('Best: 9');
  const hiddenCard = page.getByRole('button', { name: 'Row 1, column 1, closed' });
  const hiddenMarkup = await hiddenCard.evaluate((button) => button.outerHTML);
  expect(hiddenMarkup).not.toContain('cyan');
  expect(hiddenMarkup).not.toContain('faceId');

  await page.locator('summary').click();
  await page.getByLabel('Board code').fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board' }).click();
  await page.getByRole('button', { name: 'Row 1, column 1, closed' }).click();
  await page.getByRole('button', { name: 'Row 1, column 2, closed' }).click();
  await expect(page.locator('.game-stats')).toContainText('Moves: 1');
  const firstMiss = await page.getByRole('status').locator('span').elementHandle();
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.locator('.game-stats')).toContainText('Moves: 0');
  await page.getByRole('button', { name: 'Row 1, column 1, closed' }).click();
  await page.waitForTimeout(850);
  await expect(page.getByRole('button', { name: 'Row 1, column 1, cyan solid plus, marker top, revealed' })).toBeVisible();
  await expect(page.locator('.game-stats')).toContainText('Moves: 0');
  await page.getByRole('button', { name: 'Row 1, column 3, closed' }).click();
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
  if (firstMiss) expect(await firstMiss.evaluate((element) => element.isConnected)).toBe(false);

  const mismatchSnapshot = {
    version: 1, boardCode: 'np1-4-1', matched: [],
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 300 },
    moves: 1, elapsedMs: 62_000, started: true,
  };
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify(mismatchSnapshot));
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  const stats = page.locator('.game-stats');
  await expect(stats).toContainText('Time: 1:02');
  await page.getByRole('button', { name: 'Row 1, column 3, closed' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Row 1, column 4, closed' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(stats).toContainText('Moves: 1');
  await page.waitForTimeout(350);
  await expect(stats).toContainText('Time: 1:02');
  await expect(page.locator('.field-hint')).toContainText('Pending mismatch: 300ms.');
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Row 1, column 4, closed' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Row 1, column 1, closed' })).toBeVisible({ timeout: 1200 });
  await expect(stats).toContainText('Moves: 1');

  const nearlyComplete = {
    version: 1, boardCode: 'np1-4-1', matched: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15],
    selection: { kind: 'one', index: 0 }, moves: 7, elapsedMs: 5_000, started: true,
  };
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify(nearlyComplete));
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Row 1, column 1, cyan solid plus, marker top, revealed' })).toBeFocused();
  for (const key of ['ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight']) await page.keyboard.press(key);
  await page.keyboard.press('Space');
  await expect(page.getByRole('status')).toHaveText(/^Pair found\. All pairs found in 8 moves and \d+:\d{2}\.$/);
  await expect(stats).toContainText('Best: 8');
  const savedBest = await page.evaluate(() => localStorage.getItem('neon-pairs.best.v1'));
  expect(savedBest).toBe('{"4":8}');

  const completed = {
    version: 1, boardCode: 'np1-4-1', matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' }, moves: 8, elapsedMs: 16_000, started: true,
  };
  await page.getByLabel('Snapshot JSON').fill(JSON.stringify(completed));
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await expect(page.locator('.win-banner')).not.toHaveClass(/win-banner--pulse/);
  await expect(stats).toContainText('Best: 8');
  await page.getByLabel('Board code').fill('invalid');
  await page.getByRole('button', { name: 'Load board' }).click();
  await expect(page.getByRole('status')).toHaveText('Invalid board code.');
  await expect(stats).toContainText('Pairs: 8/8');
  await page.getByLabel('Snapshot JSON').fill('{invalid');
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
  await expect(stats).toContainText('Best: 8');
});
