import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';

test('deal replacements and version one imports clear names without saving them in preferences', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const board = page.getByLabel('Board code', { exact: true });
  for (const action of ['New Game', 'Restart']) {
    await name.fill('Private name');
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('Private name');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Private name');
  await board.fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('Private name');
  await expect(board).toHaveValue('invalid');
  await board.fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Private name');
  // A valid older save can put version last and selection fields in a different order.
  await page
    .getByLabel('Snapshot JSON', { exact: true })
    .fill(
      '{"started":true,"selection":{"index":2,"kind":"one"},"elapsedMs":42,"moves":0,"matched":[],"boardCode":"np1-4-1","version":1}',
    );
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await expect(page.locator('.card').nth(2)).toHaveClass(/revealed/);
  await name.fill('Private name');
  const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  expect(preferences).not.toContain('Private name');
  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 1,
    moves: 0,
    elapsedMs: 0,
    started: false,
    selection: { kind: 'closed' },
  });
});
