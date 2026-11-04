import { expect, test } from '@playwright/test';
import { SIDES } from '../src/game/boardCode.ts';
import { cards, finish, loadBoard, openGame, snapshot } from './gameHarness.ts';

for (const size of SIDES) {
  test(`complete ${size}x${size} with exactly one move per pair`, async ({ page }) => {
    await openGame(page);
    const code = `np1-${size}-1`;
    await loadBoard(page, code);
    await expect(cards(page)).toHaveCount(size * size);
    await finish(page, code);
    await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.locator('.card--matched')).toHaveCount(size * size);
    const saved = await snapshot(page);
    expect(saved).toMatchObject({ moves: size * size / 2, selection: { kind: 'closed' }, started: true });
  });
}

test('exact mismatch interval, ignored actions and active hidden time', async ({ page }) => {
  await openGame(page); await loadBoard(page);
  await page.clock.install(); await page.clock.pauseAt(new Date());
  await cards(page).nth(0).click({ force: true });
  await cards(page).nth(0).click({ force: true });
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  await cards(page).nth(11).click({ force: true });
  await expect(page.locator('.card--matched')).toHaveCount(2);
  await cards(page).nth(1).click({ force: true }); await cards(page).nth(2).click({ force: true });
  await cards(page).nth(3).click({ force: true });
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible();
  await page.clock.runFor(250);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(5000);
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(549);
  await expect(page.locator('.card--revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card--revealed')).toHaveCount(0);
  expect(await snapshot(page)).toMatchObject({ moves: 2, elapsedMs: 800, matched: [0, 11] });
});

for (const action of ['Restart', 'New Game']) {
  test(`${action} during a mismatch invalidates earlier updates`, async ({ page }) => {
    await openGame(page); await loadBoard(page);
    await page.clock.install(); await page.clock.pauseAt(new Date());
    await cards(page).nth(0).click({ force: true }); await cards(page).nth(1).click({ force: true });
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByRole('button', { name: action, exact: true })).toBeFocused();
    await expect(page.getByLabel('Board code')).toHaveValue(action === 'Restart' ? 'np1-4-1' : /np1-4-/);
    if (action === 'New Game') await expect(page.getByLabel('Board code')).not.toHaveValue('np1-4-1');
    await cards(page).nth(2).click({ force: true });
    await page.clock.runFor(1000);
    await expect(cards(page).nth(2)).toHaveClass('card card--revealed');
    await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible();
  });
}
