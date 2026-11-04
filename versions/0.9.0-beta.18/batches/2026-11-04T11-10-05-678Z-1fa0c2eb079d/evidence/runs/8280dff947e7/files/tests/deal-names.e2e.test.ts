import { expect, test } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import type { Page } from '@playwright/test';

async function exportDraft(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const value: unknown = JSON.parse(
    await page.getByLabel('Snapshot JSON', { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected snapshot fields.');
  return value;
}

test('the native deal name preserves Unicode and spaces without restarting active progress', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  expect(await name.evaluate((element) => element.tagName)).toBe('INPUT');
  await name.fill('x'.repeat(39));
  await name.press('End');
  await name.pressSequentially('yz');
  await expect(name).toHaveValue('x'.repeat(39) + 'y');
  await name.fill('😀'.repeat(20));
  await name.press('End');
  await name.pressSequentially('x');
  await expect(name).toHaveValue('😀'.repeat(20));
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.locator('.card').nth(5).focus();
  await page.clock.runFor(200);
  const exactName = '  Café 😀  ';
  await name.fill(exactName);
  await expect(name).toBeFocused();
  await expect(page.locator('.card').nth(5)).toHaveAttribute('tabindex', '0');
  const named = await exportDraft(page);
  expect(named).toEqual({
    version: 2,
    name: exactName,
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 600 },
    moves: 1,
    elapsedMs: 200,
    started: true,
  });
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await name.fill('');
  const unnamed = await exportDraft(page);
  const { name: savedName, ...progress } = named;
  expect(savedName).toBe(exactName);
  expect(unnamed).toEqual({ ...progress, version: 1 });
  await page.clock.runFor(599);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect((await exportDraft(page)).elapsedMs).toBe(800);
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(named));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue(exactName);
  expect(await exportDraft(page)).toEqual(named);
});

test('starting another deal clears its name through every deal control', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const resets = [
    async () => page.getByRole('button', { name: 'New Game', exact: true }).click(),
    async () => page.getByRole('button', { name: 'Restart', exact: true }).click(),
    async () => page.getByLabel('Grid size', { exact: true }).selectOption('6'),
    async () => {
      await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
      await page.getByRole('button', { name: 'Load board', exact: true }).click();
    },
  ];
  for (const reset of resets) {
    await name.fill('A named deal');
    await reset();
    await expect(name).toHaveValue('');
    const snapshot = await exportDraft(page);
    expect(snapshot.version).toBe(1);
    expect(Object.hasOwn(snapshot, 'name')).toBe(false);
    expect(snapshot.moves).toBe(0);
  }
});

test('names stay out of saved preferences and reload starts an unnamed fresh deal', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  const storedBefore = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  await page.locator('summary').click();
  await page.getByLabel('Deal name', { exact: true }).fill('Private Café');
  await page.locator('.card').nth(2).click();
  expect((await exportDraft(page)).name).toBe('Private Café');
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(
    storedBefore,
  );
  await page.reload();
  await page.locator('summary').click();
  await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue('');
  const reloaded = await exportDraft(page);
  expect(reloaded).toMatchObject({
    version: 1,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
  expect(Object.hasOwn(reloaded, 'name')).toBe(false);
});
