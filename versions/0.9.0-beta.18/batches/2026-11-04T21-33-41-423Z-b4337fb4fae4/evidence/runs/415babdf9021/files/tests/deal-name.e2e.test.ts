import { expect, test } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';

test('names survive snapshots, preserve play, and clear when a deal is replaced', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.clock.runFor(500);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const snapshot = page.getByLabel('Snapshot JSON', { exact: true });
  const exportButton = page.getByRole('button', { name: 'Export snapshot' });
  const load = page.getByRole('button', { name: 'Load snapshot' });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill(' Café ');
  await exportButton.click();
  const saved = JSON.parse(await snapshot.inputValue());
  expect(saved).toMatchObject({
    version: 2,
    name: ' Café ',
    moves: 0,
    elapsedMs: 500,
    selection: { kind: 'one', index: 2 },
  });
  await name.fill('changed');
  // Put version last to exercise pasted JSON in an independent order.
  const { version, ...fields } = saved;
  await snapshot.fill(JSON.stringify({ ...fields, version }));
  await load.click();
  await expect(name).toHaveValue(' Café ');
  await expect(page.locator('#load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await name.fill('paused');
  await page.clock.runFor(1000);
  await exportButton.click();
  expect(JSON.parse(await snapshot.inputValue())).toMatchObject({ name: 'paused', elapsedMs: 500 });
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(1000);
  await exportButton.click();
  expect(JSON.parse(await snapshot.inputValue())).toMatchObject({
    name: 'paused',
    elapsedMs: 1500,
  });
  await name.fill('');
  await exportButton.click();
  const unnamed = JSON.parse(await snapshot.inputValue());
  expect(unnamed.version).toBe(1);
  expect(unnamed).not.toHaveProperty('name');
  await name.fill('temporary');
  await load.click();
  await expect(name).toHaveValue('');
  for (const action of ['New Game', 'Restart']) {
    await name.fill('temporary');
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('temporary');
  await page.getByLabel('Grid size').selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('temporary');
  await page.getByLabel('Board code').fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board' }).click();
  await expect(name).toHaveValue('');
  await name.fill('temporary');
  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
});

test('completed named imports stay static and do not update best scores', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await page.getByLabel('Snapshot JSON').fill(
    JSON.stringify({
      boardCode: 'np1-4-1',
      matched: Array.from({ length: 16 }, (_, index) => index),
      selection: { kind: 'closed' },
      moves: 8,
      elapsedMs: 3000,
      started: true,
      name: 'Finished',
      version: 2,
    }),
  );
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(page.getByLabel('Deal name')).toHaveValue('Finished');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await page.getByLabel('Deal name').fill('Renamed');
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  expect(JSON.parse(await page.getByLabel('Snapshot JSON').inputValue()).name).toBe('Renamed');
});
