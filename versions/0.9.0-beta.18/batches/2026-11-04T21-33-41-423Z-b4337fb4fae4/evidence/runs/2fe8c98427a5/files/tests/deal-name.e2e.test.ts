import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';

test('deal names round trip with progress, pause and new deals', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(300);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill(' Café ');
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const field = page.getByLabel('Snapshot JSON');
  const saved = JSON.parse(await field.inputValue());
  expect(saved).toMatchObject({
    version: 2,
    name: ' Café ',
    moves: 0,
    elapsedMs: 300,
    selection: { kind: 'one', index: 0 },
  });
  await name.fill('changed');
  // Pasted snapshots may put another field first.
  await field.fill(JSON.stringify({ name: saved.name, ...saved, version: 2 }));
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(name).toHaveValue(' Café ');
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await page.clock.runFor(1000);
  await name.fill('paused name');
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  expect(JSON.parse(await field.inputValue())).toMatchObject({
    name: 'paused name',
    elapsedMs: 300,
  });
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor(200);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ name: 'paused name', elapsedMs: 500 });
  await page.locator('summary').click();
  await name.fill('');
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const unnamed = JSON.parse(await field.inputValue());
  expect(unnamed.version).toBe(1);
  expect(unnamed).not.toHaveProperty('name');
  await name.fill('will clear');
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(name).toHaveValue('');
  for (const action of ['Restart', 'New Game']) {
    await name.fill('will clear');
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('will clear');
  await page.getByLabel('Grid size').selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('will clear');
  await page.getByLabel('Board code').fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board' }).click();
  await expect(name).toHaveValue('');
  await name.fill('not saved');
  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
});

test('completed named snapshots remain static and invalid names keep the current game', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name');
  const field = page.getByLabel('Snapshot JSON');
  await name.fill('current');
  const saved = {
    name: 'Winner',
    started: true,
    elapsedMs: 500,
    moves: 8,
    selection: { kind: 'closed' },
    matched: EXAMPLE_PAIRS.flat(),
    boardCode: 'np1-4-1',
    version: 2,
  };
  await field.fill(JSON.stringify({ ...saved, name: 'bad\nname' }));
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(name).toHaveValue('current');
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
  await field.fill(JSON.stringify(saved));
  await page.getByRole('button', { name: 'Load snapshot' }).click();
  await expect(name).toHaveValue('Winner');
  await expect(page.locator('.load-notice')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
  await name.fill('renamed winner');
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  expect(JSON.parse(await field.inputValue())).toMatchObject({
    name: 'renamed winner',
    version: 2,
  });
});
