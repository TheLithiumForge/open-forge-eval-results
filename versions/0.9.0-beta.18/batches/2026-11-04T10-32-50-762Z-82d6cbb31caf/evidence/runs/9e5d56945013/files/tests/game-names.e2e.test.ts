import { expect, test } from './browser-test.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('a named game restores its name and paused progress from reordered JSON', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(175);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  const title = 'Café 🎮 "Friday pairs"';
  await name.fill(title);
  await expect(name).toBeFocused();
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  expect(saved).toMatchObject({
    name: title,
    moves: 1,
    elapsedMs: 175,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 625 },
  });
  await page.locator('summary').click();
  await name.fill('Another name');
  await page
    .getByLabel(ReproductionControl.snapshot, { exact: true })
    .fill(JSON.stringify(Object.fromEntries(Object.entries(saved).reverse())));
  const load = page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue(title);
  await page.locator('summary').click();
  await page.clock.runFor(2000);
  expect(await exportedSnapshot(page)).toEqual(saved);
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await page.clock.runFor(624);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await exportedSnapshot(page)).toMatchObject({ name: title, elapsedMs: 800 });
});

test('invalid loads preserve a name and an older unnamed save clears it', async ({ page }) => {
  await loadTimedBoard(page);
  const legacy = await exportedSnapshot(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const load = page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true });
  await name.fill('Keep this game');
  for (const draft of ['{', JSON.stringify({ ...legacy, name: 42 })]) {
    await snapshot.fill(draft);
    await load.click();
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(name).toHaveValue('Keep this game');
    await expect(snapshot).toHaveValue(draft);
  }
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...legacy, name: 'Keep this game' });
  await page.locator('summary').click();
  await snapshot.fill(JSON.stringify(Object.fromEntries(Object.entries(legacy).reverse())));
  await load.click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(legacy);
});

test('names can be cleared and each fresh game starts unnamed', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await name.fill('Temporary name');
  await name.fill('');
  await page.locator('summary').click();
  const cleared = await exportedSnapshot(page);
  expect(cleared.name).toBe('');
  await page.locator('summary').click();
  await page
    .getByLabel(ReproductionControl.snapshot, { exact: true })
    .fill(JSON.stringify(cleared));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('');
  for (const label of [DealControl.restart, DealControl.newGame]) {
    await name.fill('Previous game');
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(name).toHaveValue('');
  }
  await name.fill('Previous size');
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('Previous board');
  await page.getByLabel(ReproductionControl.board, { exact: true }).fill('np1-4-1');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
});
