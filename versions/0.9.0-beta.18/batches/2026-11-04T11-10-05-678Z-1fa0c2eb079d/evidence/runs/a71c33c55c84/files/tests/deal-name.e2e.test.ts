import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('a native deal name preserves spaces and Unicode and clearing it exports unnamed progress', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const initial = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('  Café 😀  ');
  await expect(name).toBeFocused();
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...initial, version: 2, name: '  Café 😀  ' });
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.locator('summary').click();
  await name.fill('😀'.repeat(20));
  await name.press('End');
  await name.pressSequentially('x');
  await expect(name).toHaveValue('😀'.repeat(20));
  await name.fill('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(initial);
});

test('renaming during a mismatch keeps its original deadline and active clock', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  // Rename between clock ticks, so resetting its browser baseline would lose active time.
  await page.clock.runFor(125);
  await page.locator('summary').click();
  await page.getByLabel('Deal name', { exact: true }).fill('Remember this miss');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 2,
    name: 'Remember this miss',
    boardCode: 'np1-4-1',
    matched: [],
    moves: 1,
    elapsedMs: 125,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 675 },
  });
  await page.clock.runFor(674);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await exportedSnapshot(page)).toMatchObject({
    name: 'Remember this miss',
    elapsedMs: 800,
    moves: 1,
    selection: { kind: 'closed' },
  });
});

test('a named export restores its exact name and progress with load and export focus intact', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.clock.runFor(1150);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('  Café 😀  ');
  const exportButton = page.getByRole('button', { name: 'Export snapshot', exact: true });
  await exportButton.click();
  await expect(exportButton).toBeFocused();
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  const saved = await draft.inputValue();
  expect(saved).toContain('\n');
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(name).toHaveValue('');
  await draft.fill(saved);
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue('  Café 😀  ');
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(JSON.parse(saved));
});
