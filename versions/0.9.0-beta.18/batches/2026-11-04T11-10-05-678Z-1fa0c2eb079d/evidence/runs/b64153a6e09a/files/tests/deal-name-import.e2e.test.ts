import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('pasted reordered named progress stays paused during rename and resumes its saved interval', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const field = page.getByLabel('Deal name', { exact: true });
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  const snapshot = {
    name: ' Café ',
    started: true,
    moves: 2,
    elapsedMs: 1500,
    selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
    matched: [0, 11],
    boardCode: 'np1-4-1',
    version: 2,
  };
  await draft.fill(JSON.stringify(snapshot));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(field).toHaveValue(snapshot.name);
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await field.fill('Renamed while paused');
  await page.locator('.card').nth(2).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({
    ...snapshot,
    name: 'Renamed while paused',
  });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await exportedSnapshot(page)).toMatchObject({
    name: 'Renamed while paused',
    elapsedMs: 1800,
    selection: { kind: 'closed' },
  });
  await page.locator('summary').click();
  const { name: _name, ...unnamed } = snapshot;
  await draft.fill(JSON.stringify({ ...unnamed, version: 1 }));
  await load.click();
  await expect(field).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
});

test('invalid named imports keep the current name, game and draft available for correction', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.clock.runFor(125);
  await page.locator('summary').click();
  const field = page.getByLabel('Deal name', { exact: true });
  await field.fill('Keep me');
  await page.locator('summary').click();
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const invalid = JSON.stringify({ ...before, name: 'bad\nname' });
  const draft = page.getByLabel('Snapshot JSON', { exact: true });
  await draft.fill(invalid);
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(draft).toHaveValue(invalid);
  await expect(field).toHaveValue('Keep me');
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(before);
  await page.clock.runFor(100);
  expect(await exportedSnapshot(page)).toMatchObject({ ...before, elapsedMs: 225 });
});
