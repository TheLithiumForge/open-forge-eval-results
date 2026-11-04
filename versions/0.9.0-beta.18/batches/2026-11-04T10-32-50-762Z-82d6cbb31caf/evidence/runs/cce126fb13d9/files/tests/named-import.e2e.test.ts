import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

// Version comes last, as it can in pasted JSON. These states satisfy the documented
// constraints without claiming a reconstructed play history.
const PENDING = {
  boardCode: 'np1-4-1',
  matched: [11, 0],
  moves: 2,
  elapsedMs: 1500,
  started: true,
  selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
};

test('pasted snapshots accept reordered fields in both versions and failed imports preserve everything', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  const name = page.getByLabel('Deal name', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await draft.fill(JSON.stringify({ ...PENDING, name: 'Café', version: 2 }));
  await load.click();
  await expect(name).toHaveValue('Café');
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await page.locator('summary').click();
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  for (const invalid of [
    { ...PENDING, name: '', version: 2 },
    { ...PENDING, name: 'a\nb', version: 2 },
    { ...PENDING, name: 'x'.repeat(41), version: 2 },
    { ...PENDING, name: 'Café', version: 1 },
    { ...PENDING, name: 'Café', version: 2, extra: true },
    { ...PENDING, name: 'Café', version: 2, moves: 1 },
  ]) {
    const text = JSON.stringify(invalid);
    await draft.fill(text);
    await load.click();
    await expect(draft).toHaveValue(text);
    await expect(load).toBeFocused();
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(name).toHaveValue('Café');
    await page.locator('summary').click();
    expect(await exportedSnapshot(page)).toEqual(before);
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await page.locator('summary').click();
  }
  await draft.fill(JSON.stringify({ ...PENDING, version: 1 }));
  await load.click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  const unnamed = await exportedSnapshot(page);
  expect(unnamed).toMatchObject({ ...PENDING, matched: [0, 11], version: 1 });
  expect(unnamed).not.toHaveProperty('name');
});

test('named completed imports stay static and editable and resumed named play records a best', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  const name = page.getByLabel('Deal name', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  const completed = {
    name: 'Winner',
    boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, i) => i),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 3000,
    started: true,
    version: 2,
  };
  await draft.fill(JSON.stringify(completed));
  await load.click();
  await expect(name).toHaveValue(completed.name);
  await expect(page.locator('.load-notice')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await name.fill('  Completed  ');
  await page.locator('summary').click();
  await page.clock.runFor(1000);
  expect(await exportedSnapshot(page)).toEqual({ ...completed, name: '  Completed  ' });
  await page.locator('summary').click();
  await draft.fill(
    JSON.stringify({
      ...completed,
      matched: completed.matched.filter((i) => i !== 1 && i !== 9),
      moves: 7,
    }),
  );
  await load.click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.locator('.card').nth(1).click();
  await page.locator('.card').nth(9).click();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  await expect(page.locator('.victory')).toHaveClass(/celebrate/);
  await expect(name).toHaveValue('Winner');
});
