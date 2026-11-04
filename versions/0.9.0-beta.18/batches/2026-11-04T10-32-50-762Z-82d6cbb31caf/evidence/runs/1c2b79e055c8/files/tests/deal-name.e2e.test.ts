import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';

test('named progress round trips with reordered fields and preserves paused mismatch timing', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(500);
  const before = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await page.getByLabel('Board code', { exact: true }).fill('keep this draft');
  await name.fill('  Café 😀  ');
  await expect(page.getByLabel('Board code', { exact: true })).toHaveValue('keep this draft');
  const exportButton = page.getByRole('button', { name: 'Export snapshot', exact: true });
  await exportButton.click();
  await expect(exportButton).toBeFocused();
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const saved: unknown = JSON.parse(await field.inputValue());
  expect(saved).toEqual({ ...before, version: 2, name: '  Café 😀  ' });
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(name).toHaveValue('');
  await field.fill(JSON.stringify({ name: '  Café 😀  ', ...before, version: 2 }));
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue('  Café 😀  ');
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await name.fill('Renamed while paused');
  await page.locator('.card').nth(2).click();
  await page.keyboard.press('ArrowRight');
  await page.clock.runFor(2000);
  await exportButton.click();
  const paused: unknown = JSON.parse(await field.inputValue());
  expect(paused).toEqual({ ...before, version: 2, name: 'Renamed while paused' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await name.fill('Renamed while running');
  await page.clock.runFor(200);
  await exportButton.click();
  const running: unknown = JSON.parse(await field.inputValue());
  expect(running).toEqual({
    ...before,
    version: 2,
    name: 'Renamed while running',
    selection: { kind: 'closed' },
    elapsedMs: 1000,
  });
});

test('completed named imports stay static and unfinished named imports can record a local best', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const field = page.getByLabel('Snapshot JSON', { exact: true });
  const completed = {
    name: 'Winner',
    boardCode: 'np1-4-1',
    matched: EXAMPLE_PAIRS.flat(),
    moves: 8,
    elapsedMs: 3000,
    started: true,
    selection: { kind: 'closed' },
    version: 2,
  };
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await field.fill(JSON.stringify(completed));
  await load.click();
  await expect(name).toHaveValue('Winner');
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.stats > div').nth(3)).toHaveText('Best: none');
  await name.fill('Completed and renamed');
  await page.clock.runFor(2000);
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const saved: unknown = JSON.parse(await field.inputValue());
  expect(saved).toEqual({
    ...completed,
    name: 'Completed and renamed',
    matched: Array.from({ length: 16 }, (_, i) => i),
  });
  await name.fill('');
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const unnamed: unknown = JSON.parse(await field.inputValue());
  expect(unnamed).toMatchObject({ version: 1, elapsedMs: 3000, moves: 8 });
  expect(unnamed).not.toHaveProperty('name');
  await field.fill(
    JSON.stringify({ ...completed, matched: EXAMPLE_PAIRS.slice(0, -1).flat(), moves: 7 }),
  );
  await load.click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  for (const index of EXAMPLE_PAIRS[7]) await page.locator('.card').nth(index).click();
  await expect(page.locator('.stats > div').nth(3)).toHaveText('Best: 8');
  await expect(page.locator('.victory')).toHaveClass(/celebrate/);
  await expect(name).toHaveValue('Winner');
});
