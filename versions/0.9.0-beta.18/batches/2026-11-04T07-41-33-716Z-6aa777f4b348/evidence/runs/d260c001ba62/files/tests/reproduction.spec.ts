import { expect, test } from '@playwright/test';
import { cards, exported, finish, loadBoard, sample } from './helpers.ts';

test('board drafts survive play; invalid loads preserve game, draft and saved size', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const code = page.getByLabel('Board code', { exact: true });
  await code.fill('np1-6-01');
  await cards(page).first().click();
  await expect(code).toHaveValue('np1-6-01');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid board code.');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(code).toHaveValue('np1-6-01');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('4');
  await code.fill('  np1-6-1  ');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(code).toHaveValue('np1-6-1');
  await expect(page.getByLabel('Grid size', { exact: true })).toHaveValue('6');
  await expect(code).toHaveAttribute('maxlength', '32');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveAttribute('maxlength', '65536');
});

test('import pauses both clocks and card actions; Resume restores remembered focus', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(sample));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Load snapshot', exact: true })).toBeFocused();
  await page.clock.runFor(10000);
  await cards(page).nth(3).click();
  await cards(page).nth(3).press('ArrowRight');
  await expect(cards(page).nth(3)).toBeFocused();
  expect(JSON.parse(await exported(page))).toEqual(sample);
  await cards(page).nth(5).focus();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(5)).toBeFocused();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await cards(page).nth(3).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
});

test('completed import is static, has no Resume and never writes a best', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const completed = { ...sample, matched: Array.from({ length: 16 }, (_, i) => i), selection: { kind: 'closed' }, moves: 8 };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(completed));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.win-banner')).toBeVisible();
  await expect(page.locator('.win-banner')).not.toHaveClass(/celebrate/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.scoreboard')).toContainText('Best: none');
  const before = await exported(page);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill('{"broken":true}');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(page.locator('.load-status')).toHaveText('Invalid snapshot.');
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue('{"broken":true}');
  expect(await exported(page)).toBe(before);
});

test('resumed unfinished import can earn a local best', async ({ page }) => {
  await page.goto('/');
  await loadBoard(page);
  const start = { ...sample, matched: [], selection: { kind: 'closed' }, moves: 0, elapsedMs: 0, started: false };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(start));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await finish(page);
  await expect(page.locator('.scoreboard')).toContainText('Best: 8');
  await expect(page.locator('.win-banner')).toHaveClass(/celebrate/);
  await page.waitForTimeout(650);
  expect(await page.locator('.win-banner').evaluate(element => element.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
});
