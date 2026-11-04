import { expect, test } from './browser-test.ts';
import { loadTimedBoard, finishBoard } from './game-fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { isJsonObject } from '../src/game/saved-format.ts';

test('deal names round trip with progress and reset with each new deal', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.clock.runFor(500);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  const draft = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const exportButton = page.getByRole('button', {
    name: ReproductionControl.exportSnapshot,
    exact: true,
  });
  const load = page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true });
  await name.fill('  Café 🎮  ');
  await exportButton.click();
  const saved: unknown = JSON.parse(await draft.inputValue());
  if (!isJsonObject(saved) || typeof saved.name !== 'string')
    throw new Error('Expected a named snapshot');
  expect(saved.version).toBe(2);
  expect(saved.name).toBe('  Café 🎮  ');
  expect(saved.selection).toEqual({ kind: 'one', index: 2 });
  await name.fill('other');
  await draft.fill(JSON.stringify(Object.fromEntries(Object.entries(saved).reverse())));
  await load.click();
  await expect(name).toHaveValue(saved.name);
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await name.fill('paused edit');
  await page.clock.runFor(1000);
  await exportButton.click();
  const paused: unknown = JSON.parse(await draft.inputValue());
  if (!isJsonObject(paused)) throw new Error('Expected a snapshot');
  expect(paused.elapsedMs).toBe(saved.elapsedMs);
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await expect(page.locator('.card').nth(0)).toBeFocused();
  await name.fill('');
  await exportButton.click();
  const unnamed: unknown = JSON.parse(await draft.inputValue());
  if (!isJsonObject(unnamed)) throw new Error('Expected a snapshot');
  expect(unnamed.version).toBe(1);
  expect(unnamed).not.toHaveProperty('name');
  await name.fill('clear me');
  await load.click();
  await expect(name).toHaveValue('');
  for (const action of [DealControl.restart, DealControl.newGame]) {
    await name.fill('clear me');
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('clear me');
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('clear me');
  await page.getByLabel(ReproductionControl.board, { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
});

test('completed named imports stay static, keep bests, and allow name edits', async ({ page }) => {
  await loadTimedBoard(page);
  await finishBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  const draft = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await name.fill('Finished');
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('Finished');
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
  await name.fill('Renamed');
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const renamed: unknown = JSON.parse(await draft.inputValue());
  if (!isJsonObject(renamed)) throw new Error('Expected a snapshot');
  expect(renamed.name).toBe('Renamed');
});
