import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('pasted saves accept reordered fields and preserve progress after an invalid load', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const progress = {
    boardCode: 'np1-4-1',
    selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
    matched: [0, 11],
    started: true,
    elapsedMs: 1500,
    moves: 2,
    version: 1,
  };
  for (const snapshot of [progress, { ...progress, version: 2, name: 'Café' }]) {
    await page.locator('summary').click();
    const field = page.getByLabel('Snapshot JSON', { exact: true });
    await field.fill(JSON.stringify(snapshot));
    const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
    await load.click();
    await expect(page.locator('.load-notice')).toHaveText(
      'Loaded snapshot. Select Resume to continue.',
    );
    await expect(page.locator('.card.matched')).toHaveCount(2);
    await expect(page.locator('.card.revealed')).toHaveCount(2);
    await page.locator('summary').click();
    expect(await exportedSnapshot(page)).toEqual(snapshot);
    await page.locator('summary').click();
    const invalid = JSON.stringify({ extra: true, ...snapshot });
    await field.fill(invalid);
    await load.click();
    await expect(load).toBeFocused();
    await expect(field).toHaveValue(invalid);
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await page.locator('summary').click();
    expect(await exportedSnapshot(page)).toEqual(snapshot);
  }
});
