import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('names survive snapshot import and clear on deal replacement', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill(' Café ');
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  expect(saved).toMatchObject({ version: 2, name: ' Café ', moves: 0, started: true });

  await page.locator('summary').click();
  await name.fill('different');
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  await field.fill(JSON.stringify({ ...saved, version: 2 }));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  await expect(name).toHaveValue(' Café ');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await name.fill('paused');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(name).toHaveValue('paused');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('new');
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('board');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('size');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
});

test('invalid drafts retain the name, while unnamed and completed imports restore their own names', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await name.fill('current');
  const unnamed = {
    boardCode: 'np1-4-1',
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
    version: 1,
  };
  await field.fill(JSON.stringify({ ...unnamed, version: 2, name: '' }));
  await load.click();
  await expect(name).toHaveValue('current');
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
  await field.fill(JSON.stringify(unnamed));
  await load.click();
  await expect(name).toHaveValue('');
  const completed = {
    ...unnamed,
    matched: Array.from({ length: 16 }, (_, index) => index),
    moves: 8,
    started: true,
    name: 'finished',
    version: 2,
  };
  await field.fill(JSON.stringify(completed));
  await load.click();
  await expect(name).toHaveValue('finished');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.load-notice')).toHaveText('Loaded completed snapshot.');
  await name.fill('renamed');
  await expect(name).toHaveValue('renamed');
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
});
