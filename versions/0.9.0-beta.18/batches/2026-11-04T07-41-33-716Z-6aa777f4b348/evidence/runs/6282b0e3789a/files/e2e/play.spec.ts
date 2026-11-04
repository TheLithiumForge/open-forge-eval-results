import { expect, test } from '@playwright/test';
import { cards, exportValue, finish, freezeClock, live, loadBoard } from './gameFixtures.ts';

for (const size of [4, 6, 8, 10, 12, 14, 16]) {
  test(`finishes every pair on a ${size}x${size} board`, async ({ page }) => {
    test.setTimeout(180000);
    await freezeClock(page);
    await page.goto('/');
    await loadBoard(page, `np1-${size}-1`);
    await expect(cards(page)).toHaveCount(size * size);
    await finish(page, size);
    await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Best: ${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(cards(page).filter({ has: page.locator('.card-check') })).toHaveCount(size * size);
    await expect(live(page)).toContainText(`Pair found. All pairs found in ${size * size / 2} moves and `);
  });
}

test('counts second valid activations and resolves an exact active mismatch deadline', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadBoard(page);
  await page.clock.runFor(5000);
  await expect(page.getByText('Time: 0:00', { exact: true })).toBeVisible();
  await cards(page).nth(0).click();
  await cards(page).nth(0).click();
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(11).click();
  await expect(page.getByText('Pairs: 1/8', { exact: true })).toBeVisible();
  await cards(page).nth(0).click({ force: true });
  await cards(page).nth(1).click();
  await cards(page).nth(2).click();
  await cards(page).nth(3).click();
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await expect(cards(page).nth(3)).toHaveAccessibleName('Row 1, column 4, closed');
  await page.clock.runFor(799);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(cards(page).nth(1)).toHaveAccessibleName(/closed$/);
  await expect(cards(page).nth(2)).toHaveAccessibleName(/closed$/);
  await expect(exportValue(page)).resolves.toMatchObject({ moves: 2, elapsedMs: 800 });
});

test('pauses the same mismatch and elapsed clock while hidden', async ({ page }) => {
  await freezeClock(page);
  await page.goto('/');
  await loadBoard(page);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(10000);
  await expect(exportValue(page)).resolves.toMatchObject({ elapsedMs: 300, selection: { remainingMs: 500 } });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
  await page.clock.runFor(1);
  await expect(cards(page).nth(0)).toHaveAccessibleName(/closed$/);
  await expect(exportValue(page)).resolves.toMatchObject({ elapsedMs: 800 });
});

for (const action of ['Restart', 'New Game', 'size', 'load']) {
  test(`invalidates a pending mismatch after ${action}`, async ({ page }) => {
    await freezeClock(page);
    await page.goto('/');
    await loadBoard(page);
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    const oldCode = await page.getByLabel('Board code', { exact: true }).inputValue();
    if (action === 'size') await page.getByLabel('Grid size').selectOption('6');
    else if (action === 'load') await loadBoard(page, 'np1-8-1');
    else {
      const button = page.getByRole('button', { name: action, exact: true });
      await button.click();
      await expect(button).toBeFocused();
    }
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
    if (action === 'Restart') await expect(page.getByLabel('Board code', { exact: true })).toHaveValue(oldCode);
    if (action === 'New Game') await expect(page.getByLabel('Board code', { exact: true })).not.toHaveValue(oldCode);
    await cards(page).nth(0).click();
    await page.clock.runFor(1600);
    await expect(cards(page).nth(0)).toHaveAccessibleName(/revealed$/);
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  });
}
