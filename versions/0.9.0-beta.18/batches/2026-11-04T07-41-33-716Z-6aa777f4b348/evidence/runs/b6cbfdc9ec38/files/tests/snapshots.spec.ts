import { expect, test } from '@playwright/test';
import { cards, loadBoard, loadSnapshot, openGame, progress, snapshot } from './gameHarness.ts';

test('drafts, validation and action focus preserve the current game', async ({ page }) => {
  await openGame(page);
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toHaveValue('4');
  expect(await page.getByRole('option').evaluateAll((options) => options.map((option) =>
    option instanceof HTMLOptionElement ? option.value : null))).toEqual(['4', '6', '8', '10', '12', '14', '16']);
  await loadBoard(page, '  np1-4-1  ');
  await expect(page.getByLabel('Board code')).toHaveValue('np1-4-1');
  await expect(page.getByLabel('Board code')).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON')).toHaveAttribute('maxlength', '65536');
  await page.getByLabel('Board code').fill('np1-6-01');
  await cards(page).nth(0).click();
  await expect(page.getByLabel('Board code')).toHaveValue('np1-6-01');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Load board', exact: true })).toBeFocused();
  await expect(page.locator('.reproduction-status')).toHaveText('Invalid board code.');
  await expect(cards(page).nth(0)).toHaveClass('card card--revealed');
  await expect(page.getByRole('combobox', { name: 'Grid size', exact: true })).toHaveValue('4');
  for (const text of ['{}', progress().replace('"moves":7', '"moves":0'), '"' + 'é'.repeat(33000) + '"']) {
    await loadSnapshot(page, text);
    await expect(page.locator('.reproduction-status')).toHaveText('Invalid snapshot.');
    await expect(page.getByLabel('Snapshot JSON')).toHaveValue(text);
    await expect(cards(page).nth(0)).toHaveClass('card card--revealed');
    await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  }
});

test('snapshot export roundtrip, paused navigation and exact Resume remainder', async ({ page }) => {
  await openGame(page); await loadBoard(page);
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await cards(page).nth(0).click({ force: true }); await cards(page).nth(11).click({ force: true });
  await cards(page).nth(1).click({ force: true }); await cards(page).nth(2).click({ force: true });
  await page.clock.runFor(500);
  const saved = await snapshot(page);
  expect(saved).toMatchObject({ elapsedMs: 500, selection: { remainingMs: 300 } });
  await expect(page.getByRole('button', { name: 'Export snapshot' })).toBeFocused();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await loadSnapshot(page, JSON.stringify(saved));
  await expect(page.locator('.reproduction-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await page.clock.runFor(2000);
  await cards(page).nth(3).click({ force: true });
  await page.keyboard.press('ArrowDown');
  await expect(cards(page).nth(7)).toBeFocused();
  expect(await snapshot(page)).toEqual(saved);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(7)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  expect(await snapshot(page)).toMatchObject({ elapsedMs: 800, moves: 2 });
});

test('caps remain playable, minutes pass 59, completed imports stay static', async ({ page }) => {
  await openGame(page);
  await loadSnapshot(page, progress(999999, false, 359999999));
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await cards(page).nth(8).click(); await cards(page).nth(15).click();
  await expect(page.locator('.win-banner')).toHaveText('All pairs found!999999 moves · 5999:59');
  await loadSnapshot(page, progress(8, true, 3600000));
  await expect(page.getByText('Time: 60:00', { exact: true })).toBeVisible();
  await expect(page.locator('.reproduction-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await expect(page.locator('.win-banner')).toHaveCSS('animation-name', 'none');
  await expect(page.getByText('Best: 999999', { exact: true })).toBeVisible();
});
