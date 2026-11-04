import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { DEAL_NAME_MAX_LENGTH } from '../src/game/deal-name.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('renaming preserves a running mismatch and clearing the name exports version 1', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(250);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', String(DEAL_NAME_MAX_LENGTH));
  await name.fill(' Café ');
  await page.locator('summary').click();
  const named = await exportedSnapshot(page);
  expect(named).toMatchObject({ version: 2, name: ' Café ', moves: 1, elapsedMs: 250 });
  expect(named.selection).toMatchObject({ kind: 'mismatch', remainingMs: 550 });

  await page.clock.runFor(549);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await page.locator('summary').click();
  await name.fill('');
  await page.locator('summary').click();
  const unnamed = await exportedSnapshot(page);
  expect(unnamed.version).toBe(1);
  expect(Object.hasOwn(unnamed, 'name')).toBe(false);
});

test('completed version 2 imports remain named and static, and allow editing', async ({ page }) => {
  await loadTimedBoard(page);
  const completed = JSON.stringify({
    version: 2,
    name: 'Finished game',
    boardCode: EXAMPLE_CODE,
    matched: EXAMPLE_PAIRS.flat(),
    selection: { kind: 'closed' },
    moves: EXAMPLE_PAIRS.length,
    elapsedMs: 500,
    started: true,
  });
  await page.locator('summary').click();
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(completed);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await expect(name).toHaveValue('Finished game');
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(page.getByRole('button', { name: ReproductionControl.resume })).toHaveCount(0);
  await name.fill('Edited after completion');
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  expect(saved).toMatchObject({ version: 2, name: 'Edited after completion' });
  expect(saved.elapsedMs).toBe(500);
});

test('new games, restart, size and board loads clear names without saving them', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await expect(name).toHaveValue('');

  await name.fill('Café');
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const exported = await snapshot.inputValue();
  expect(JSON.parse(exported)).toMatchObject({ version: 2, name: 'Café' });
  const stored = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  expect(stored?.includes('Café')).toBe(false);
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Before restart');
  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(name).toHaveValue('');

  await name.fill('Before size change');
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');

  await name.fill('Before board load');
  const boardCode = page.getByLabel(ReproductionControl.board, { exact: true });
  await boardCode.fill('invalid');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Invalid board code.');
  await expect(name).toHaveValue('Before board load');
  await expect(page.locator('.card')).toHaveCount(36);
  await page.getByLabel(ReproductionControl.board, { exact: true }).fill('np1-6-1');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');

  await snapshot.fill(exported);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('Café');
  await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('4');
  await expect(page.getByRole('button', { name: ReproductionControl.resume })).toBeVisible();
  await name.fill('Still local only');
  await page.reload();
  await page.locator('summary').click();
  await expect(page.getByLabel(ReproductionControl.name, { exact: true })).toHaveValue('');
});
