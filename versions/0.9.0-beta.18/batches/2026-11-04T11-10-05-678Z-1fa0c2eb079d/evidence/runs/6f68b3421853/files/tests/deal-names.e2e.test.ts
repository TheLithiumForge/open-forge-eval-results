import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('Deal name uses a native limited input and preserves spaces and Unicode in named exports', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveJSProperty('tagName', 'INPUT');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await expect(name).toHaveValue('');
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  for (const value of ['  Café 😀  ', ' ', '😀'.repeat(20)]) {
    await name.fill(value);
    await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
    const snapshot: unknown = JSON.parse(await field.inputValue());
    expect(snapshot).toMatchObject({ version: 2, name: value, moves: 0, started: false });
    await expect(name).toHaveValue(value);
  }
  await name.press('End');
  await page.keyboard.insertText('x');
  await expect(name).toHaveValue('😀'.repeat(20));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const saved = await field.inputValue();
  await name.fill('Another name');
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('😀'.repeat(20));
  await expect(field).toHaveValue(saved);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await name.fill('');
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const unnamed: unknown = JSON.parse(await field.inputValue());
  expect(unnamed).toMatchObject({ version: 1, boardCode: 'np1-4-1' });
  expect(unnamed).not.toHaveProperty('name');
});

test('editing names preserves progress, mismatch timing and the remembered board tab stop', async ({
  page,
}) => {
  await loadTimedBoard(page);
  for (const index of [2, 6, 0, 1]) await page.locator('.card').nth(index).click();
  await page.locator('.card').nth(9).focus();
  const before = await exportedSnapshot(page);
  await page.clock.runFor(123);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('In progress');
  await expect(name).toBeFocused();
  await expect(page.locator('.card').nth(9)).toHaveAttribute('tabindex', '0');
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({
    ...before,
    version: 2,
    name: 'In progress',
    elapsedMs: 123,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 677 },
  });
  await page.clock.runFor(676);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  const cleared = await exportedSnapshot(page);
  expect(cleared).toMatchObject({ version: 1, moves: 2, elapsedMs: 799, matched: [2, 6] });
  expect(cleared).not.toHaveProperty('name');
  expect(cleared.selection).toEqual({ kind: 'mismatch', first: 0, second: 1, remainingMs: 1 });
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(page.locator('.card.matched')).toHaveCount(2);
});
