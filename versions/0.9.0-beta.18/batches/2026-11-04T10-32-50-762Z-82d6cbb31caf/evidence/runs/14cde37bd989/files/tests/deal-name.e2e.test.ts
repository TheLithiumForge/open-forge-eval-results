import { expect, test } from './browser-test.ts';
import { exportedSnapshot, finishBoard, loadTimedBoard } from './game-fixture.ts';

const NAME = '  Café 🃏  ';

test('names survive export, reordered import, paused edits, Resume and completion', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(100);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await expect(name).toHaveValue('');
  const board = page.getByLabel('Board code', { exact: true });
  await board.fill('edited board draft');
  await name.fill(NAME);
  await expect(board).toHaveValue('edited board draft');
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  expect(saved).toEqual({ ...before, version: 2, name: NAME });
  await page.clock.runFor(200);
  expect(await exportedSnapshot(page)).toMatchObject({ elapsedMs: 300, name: NAME });
  await page.locator('summary').click();
  await name.fill('replace me');
  const { version, ...fields } = saved;
  await page
    .getByLabel('Snapshot JSON', { exact: true })
    .fill(JSON.stringify({ ...fields, version }));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue(NAME);
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await name.fill('paused edit');
  await page.locator('.card').nth(4).click();
  await page.clock.runFor(2000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...saved, name: 'paused edit' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(4)).toBeFocused();
  await page.clock.runFor(699);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await finishBoard(page);
  expect(await exportedSnapshot(page)).toMatchObject({ name: 'paused edit', moves: 9 });
  await expect(page.locator('.stats dd').nth(3)).toHaveText('9');
});

test('completed named imports remain static and editable without recording a best', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const completed = {
    name: NAME,
    boardCode: 'np1-4-1',
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: 'closed' },
    moves: 8,
    elapsedMs: 3000,
    started: true,
    version: 2,
  };
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(JSON.stringify(completed));
  await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue(NAME);
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.load-notice')).toHaveText('Loaded completed snapshot.');
  await name.fill('completed edit');
  await page.clock.runFor(1000);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...completed, name: 'completed edit' });
  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  const { name: ignored, ...unnamed } = completed;
  expect(ignored).toBe(NAME);
  expect(await exportedSnapshot(page)).toEqual({ ...unnamed, version: 1 });
});

test('fresh deals, old imports and reload clear names while failed loads preserve them', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('🃏'.repeat(20));
  await name.press('End');
  await name.pressSequentially('x');
  await expect(name).toHaveValue('🃏'.repeat(20));
  for (const action of ['New Game', 'Restart', 'size', 'board', 'old snapshot', 'reload']) {
    await name.fill(NAME);
    if (action === 'size') await page.getByLabel('Grid size', { exact: true }).selectOption('6');
    else if (action === 'board') {
      await page.getByLabel('Board code', { exact: true }).fill('np1-4-1');
      await page.getByRole('button', { name: 'Load board', exact: true }).click();
    } else if (action === 'old snapshot') {
      await page.getByLabel('Snapshot JSON', { exact: true }).fill(
        JSON.stringify({
          boardCode: 'np1-4-1',
          matched: [],
          selection: { kind: 'closed' },
          moves: 0,
          elapsedMs: 0,
          started: false,
          version: 1,
        }),
      );
      await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
    } else if (action === 'reload') {
      await page.reload();
      await page.locator('summary').click();
    } else await page.getByRole('button', { name: action, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill(NAME);
  await page.getByLabel('Board code', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Load board', exact: true }).click();
  await expect(name).toHaveValue(NAME);
  await page.locator('summary').click();
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  for (const invalid of [
    { ...before, name: 'bad\nname' },
    { ...before, name: 'a'.repeat(41) },
    { ...before, extra: true },
    { ...before, version: 3 },
  ]) {
    const draft = JSON.stringify(invalid);
    await field.fill(draft);
    await page.getByRole('button', { name: 'Load snapshot', exact: true }).click();
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(field).toHaveValue(draft);
    await expect(name).toHaveValue(NAME);
  }
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(before);
});
