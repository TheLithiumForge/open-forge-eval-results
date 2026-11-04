import { expect, test } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';

test('deal names round trip with progress and clear on deal changes', async ({ page, gameURL }) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(1200);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const snapshot = page.getByLabel('Snapshot JSON', { exact: true });
  const exportButton = page.getByRole('button', { name: 'Export snapshot', exact: true });
  const loadButton = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('  Café 🎮  ');
  await exportButton.click();
  const saved = JSON.parse(await snapshot.inputValue());
  expect(saved).toMatchObject({ version: 2, name: '  Café 🎮  ', elapsedMs: 1200, moves: 0 });
  await name.fill('changed');
  await snapshot.fill(JSON.stringify({ ...saved, version: undefined, name: undefined, extra: 1 }));
  await loadButton.click();
  await expect(name).toHaveValue('changed');
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
  // Put version last to exercise JSON objects produced by other exporters.
  const { version, ...rest } = saved;
  await snapshot.fill(JSON.stringify({ ...rest, version }));
  await loadButton.click();
  await expect(name).toHaveValue('  Café 🎮  ');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await name.fill('paused name');
  await page.clock.runFor(900);
  await exportButton.click();
  expect(JSON.parse(await snapshot.inputValue())).toMatchObject({
    name: 'paused name',
    elapsedMs: 1200,
  });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(800);
  await exportButton.click();
  expect(JSON.parse(await snapshot.inputValue())).toMatchObject({
    name: 'paused name',
    elapsedMs: 2000,
  });
  await name.fill('');
  await exportButton.click();
  expect(JSON.parse(await snapshot.inputValue())).toMatchObject({ version: 1 });
  expect(JSON.parse(await snapshot.inputValue())).not.toHaveProperty('name');
  for (const action of ['Restart', 'New Game']) {
    await name.fill('temporary');
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('temporary');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('temporary');
  await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('temporary');
  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
});

test('completed named imports remain static and version 1 imports clear a name', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const snapshot = page.getByLabel('Snapshot JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  const completed = {
    version: 2,
    name: 'Finished',
    boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, i) => i),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 3000,
    started: true,
  };
  await snapshot.fill(JSON.stringify(completed));
  await load.click();
  await expect(name).toHaveValue('Finished');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await name.fill('edited after win');
  const { name: omitted, ...v1 } = completed;
  expect(omitted).toBe('Finished');
  await snapshot.fill(JSON.stringify({ ...v1, version: 1 }));
  await load.click();
  await expect(name).toHaveValue('');
});
