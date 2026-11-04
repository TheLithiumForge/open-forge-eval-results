import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('externally ordered named and unnamed snapshots load every selection form', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const selections = [
    { selection: { kind: 'closed' }, moves: 1 },
    { selection: { index: 2, kind: 'one' }, moves: 0 },
    { selection: { remainingMs: 300, second: 1, first: 0, kind: 'mismatch' }, moves: 1 },
  ];
  for (const version of [1, 2]) {
    for (const progress of selections) {
      // These objects deliberately put version last and selection discriminants after data.
      const snapshot = {
        elapsedMs: 1500,
        started: true,
        moves: progress.moves,
        selection: progress.selection,
        matched: [],
        boardCode: 'np1-4-1',
        ...(version === 2 ? { name: '  External Café  ' } : {}),
        version,
      };
      await page.locator('summary').click();
      await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(snapshot));
      const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
      await load.click();
      await expect(load).toBeFocused();
      await expect(page.getByLabel('Deal name', { exact: true })).toHaveValue(
        version === 2 ? '  External Café  ' : '',
      );
      await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
      await expect(page.locator('.load-notice')).toHaveText(
        'Loaded snapshot. Select Resume to continue.',
      );
      await page.locator('summary').click();
      expect(await exportedSnapshot(page)).toEqual(snapshot);
    }
  }
});

test('invalid pasted snapshots preserve named progress and the draft for correction', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('.card').nth(6).click();
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(1200);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('Keep this name');
  await page.locator('summary').click();
  const original = await exportedSnapshot(page);
  const drafts = [
    '{',
    JSON.stringify({ ...original, extra: true }),
    JSON.stringify({ ...original, version: 1 }),
    JSON.stringify({ ...original, version: 3 }),
    JSON.stringify({ ...original, name: '' }),
    JSON.stringify({ ...original, name: 'Bad\rname' }),
    JSON.stringify({ ...original, name: 'Bad\nname' }),
    JSON.stringify({ ...original, name: '🚀'.repeat(21) }),
    JSON.stringify({ ...original, selection: { kind: 'one', index: 0, extra: true } }),
  ];
  for (const draft of drafts) {
    await page.locator('summary').click();
    const field = page.getByLabel('Snapshot JSON', { exact: true });
    await field.fill(draft);
    const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
    await load.click();
    await expect(load).toBeFocused();
    await expect(field).toHaveValue(draft);
    await expect(name).toHaveValue('Keep this name');
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
    await page.locator('summary').click();
    expect(await exportedSnapshot(page)).toEqual(original);
  }
  await page.locator('summary').click();
  await page.getByLabel('Board code', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('Keep this name');
  await expect(page.locator('.load-notice')).toHaveText('Invalid board code.');
});
