import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { GAME_NAME_MAX_CHARACTERS } from '../src/game/game.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

const NAME = 'Café "Neon" 🃏';

test('a name is saved with live progress and restored from reordered JSON before Resume', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(175);
  await page.locator('summary').click();
  const name = page.getByRole('textbox', { name: ReproductionControl.name, exact: true });
  await expect(name).toHaveAttribute('maxlength', String(GAME_NAME_MAX_CHARACTERS));
  await name.fill(NAME);
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  expect(saved).toMatchObject({
    name: NAME,
    moves: 1,
    elapsedMs: 175,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 625 },
  });
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await snapshot.fill(JSON.stringify(Object.fromEntries(Object.entries(saved).reverse())));
  const load = page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue(NAME);
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await page.locator('summary').click();
  await page.clock.runFor(1000);
  expect(await exportedSnapshot(page)).toEqual(saved);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(624);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await exportedSnapshot(page)).toMatchObject({
    name: NAME,
    moves: 1,
    elapsedMs: 800,
    selection: { kind: 'closed' },
  });
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  expect(await exportedSnapshot(page)).toMatchObject({
    name: NAME,
    boardCode: EXAMPLE_CODE,
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
});

test('invalid named saves keep the name and progress while legacy saves clear the name', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('.card').nth(6).click();
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await name.fill(NAME);
  await page.locator('summary').click();
  const saved = await exportedSnapshot(page);
  await page.locator('summary').click();
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const load = page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true });
  for (const invalid of [null, 7, 'a'.repeat(GAME_NAME_MAX_CHARACTERS + 1)]) {
    const draft = JSON.stringify({ ...saved, name: invalid });
    await snapshot.fill(draft);
    await load.click();
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(snapshot).toHaveValue(draft);
    await expect(name).toHaveValue(NAME);
    await expect(page.locator('.card.matched')).toHaveCount(2);
  }
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(saved);
  const legacy = Object.fromEntries(Object.entries(saved).filter(([key]) => key !== 'name'));
  await page.locator('summary').click();
  await snapshot.fill(JSON.stringify(Object.fromEntries(Object.entries(legacy).reverse())));
  await load.click();
  await expect(name).toHaveValue('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual(legacy);
});

test('clearing a name omits it from exports and new deals clear the current name', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await name.fill(NAME);
  await name.fill('');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).not.toHaveProperty('name');
  await page.locator('summary').click();
  await name.fill(NAME);
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill(NAME);
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill(NAME);
  await page.getByLabel(ReproductionControl.board, { exact: true }).fill(EXAMPLE_CODE);
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
});
