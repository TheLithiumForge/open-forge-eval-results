import { expect, test } from '@playwright/test';
import { cards, exported, loadCode, loadSnapshot } from './fixtures.ts';

test.beforeEach(async ({ page }) => {
  const time = new Date('2026-11-04T12:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
  await page.goto('/');
  await loadCode(page);
});

test('mismatch uses 800 active milliseconds, pauses while hidden, then resumes', async ({ page }) => {
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.clock.runFor(300);
  const before = await exported(page);
  expect(before.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 500 });
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  expect((await exported(page)).elapsedMs).toBe(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(499);
  expect((await exported(page)).selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  await page.clock.runFor(1);
  expect((await exported(page)).selection).toEqual({ kind: 'closed' });
  expect((await exported(page)).elapsedMs).toBe(800);
});

test('restarting and replacing deals invalidate earlier turn updates', async ({ page }) => {
  for (const action of ['Restart', 'New Game']) {
    await loadCode(page);
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.clock.runFor(300);
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByRole('button', { name: action, exact: true })).toBeFocused();
    await cards(page).nth(3).click();
    await page.clock.runFor(1000);
    const snapshot = await exported(page);
    expect(snapshot.moves).toBe(0);
    expect(snapshot.selection).toEqual({ kind: 'one', index: 3 });
    expect(snapshot.elapsedMs).toBe(1000);
  }
});

test('snapshot pauses input and clock, keeps navigation, and resumes remembered focus', async ({ page }) => {
  await loadSnapshot(page, { version: 1, boardCode: 'np1-4-1', matched: [0, 11],
    selection: { kind: 'mismatch', first: 1, second: 2, remainingMs: 300 },
    moves: 2, elapsedMs: 1500, started: true });
  await expect(page.getByText('Loaded snapshot. Select Resume to continue.', { exact: true })).toBeVisible();
  await cards(page).nth(3).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(cards(page).nth(7)).toBeFocused();
  await page.clock.runFor(5000);
  expect((await exported(page)).elapsedMs).toBe(1500);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(cards(page).nth(7)).toBeFocused();
  await page.clock.runFor(299);
  expect((await exported(page)).selection).toEqual({ kind: 'mismatch', first: 1, second: 2, remainingMs: 1 });
  await page.clock.runFor(1);
  expect((await exported(page)).selection).toEqual({ kind: 'closed' });
});

test('one live region announces identical turns separately and ignores clock and focus', async ({ page }) => {
  await page.evaluate(() => {
    const region = document.querySelector('[aria-live]');
    if (!region) throw new Error('No live region');
    const messages: string[] = [];
    new MutationObserver(() => { if (region.textContent) messages.push(region.textContent); })
      .observe(region, { childList: true, subtree: true, characterData: true });
    document.documentElement.setAttribute('data-announcements', JSON.stringify(messages));
    new MutationObserver(() => document.documentElement.setAttribute('data-announcements', JSON.stringify(messages)))
      .observe(region, { childList: true, subtree: true, characterData: true });
  });
  for (let turn = 0; turn < 2; turn++) {
    await cards(page).nth(0).click();
    await cards(page).nth(1).click();
    await page.clock.runFor(800);
  }
  await cards(page).nth(3).focus();
  await page.keyboard.press('ArrowDown');
  await page.clock.runFor(1000);
  expect(JSON.parse(await page.locator('html').getAttribute('data-announcements') ?? '[]')).toEqual([
    'No match. Cards close after a short pause.', 'No match. Cards close after a short pause.',
  ]);
});

test('time and move caps keep display stable while the last pair still completes', async ({ page }) => {
  await loadSnapshot(page, { version: 1, boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, i) => i).filter(i => i !== 0 && i !== 11),
    selection: { kind: 'closed' }, moves: 999999, elapsedMs: 359999999, started: true });
  await expect(page.getByText('Time: 5999:59', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(1000);
  await cards(page).nth(0).click();
  await cards(page).nth(11).click();
  await expect(page.locator('.win-banner')).toHaveText('All pairs found! 999999 moves · 5999:59');
  await expect(page.getByText('Moves: 999999', { exact: true })).toBeVisible();
  const finished = await exported(page);
  await page.clock.runFor(5000);
  expect(await exported(page)).toEqual(finished);
});
