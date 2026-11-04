import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { NAMED_SNAPSHOT_VERSION, SNAPSHOT_VERSION } from '../src/game/snapshot.ts';

const NAME = 'Deal name';

async function exportOpenSnapshot(page: Parameters<typeof loadTimedBoard>[0]) {
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const value: unknown = JSON.parse(
    await page.getByLabel(ReproductionControl.snapshot, { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected an exported snapshot.');
  return value;
}

test('naming live progress preserves its clock and a named import resumes the saved turn', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(NAME, { exact: true });
  const draft = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('Draft');
  await page.locator('summary').click();
  await page.locator('.card').nth(2).click();
  await page.locator('.card').nth(6).click();
  await page.clock.runFor(125);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  await page.locator('summary').click();
  await name.fill('  Café 🎲  ');
  await page.clock.runFor(100);
  const named = await exportOpenSnapshot(page);
  expect(named).toMatchObject({
    version: NAMED_SNAPSHOT_VERSION,
    name: '  Café 🎲  ',
    boardCode: EXAMPLE_CODE,
    matched: [2, 6],
    moves: 2,
    elapsedMs: 425,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 500 },
  });
  await name.fill('A different draft');
  await draft.fill(JSON.stringify(named));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('  Café 🎲  ');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();
  await page.clock.runFor(1000);
  await name.fill('Paused edit');
  const paused = await exportOpenSnapshot(page);
  expect(paused).toMatchObject({
    version: NAMED_SNAPSHOT_VERSION,
    name: 'Paused edit',
    elapsedMs: 425,
    selection: { kind: 'mismatch', remainingMs: 500 },
  });
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await expect(page.locator('.card').first()).toBeFocused();
  await page.clock.runFor(499);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(14);
});

test('pasted property orders restore named and unnamed progress and completed names stay editable', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(NAME, { exact: true });
  const field = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await name.fill('Replaced by paste');
  await field.fill(
    '{"name":"Café","boardCode":"np1-4-1","matched":[],"selection":{"kind":"one","index":2},"moves":0,"elapsedMs":50,"started":true,"version":2}',
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('Café');
  await expect(page.locator('.card.revealed')).toHaveCount(1);

  await field.fill(
    '{"boardCode":"np1-4-1","matched":[],"selection":{"kind":"one","index":0},"moves":0,"elapsedMs":50,"started":true,"version":1}',
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('');
  const unnamed = await exportOpenSnapshot(page);
  expect(unnamed.version).toBe(SNAPSHOT_VERSION);
  expect(Object.hasOwn(unnamed, 'name')).toBe(false);

  const completed =
    '{"name":"Won Café","boardCode":"np1-4-1","matched":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],"selection":{"kind":"closed"},"moves":8,"elapsedMs":500,"started":true,"version":2}';
  await field.fill(completed);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('Won Café');
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
  await name.fill('Renamed win');
  expect(await exportOpenSnapshot(page)).toMatchObject({
    version: NAMED_SNAPSHOT_VERSION,
    name: 'Renamed win',
    elapsedMs: 500,
  });
});

test('invalid pastes keep the name and fresh deals clear it without saving it in preferences', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel(NAME, { exact: true });
  const field = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await expect(name).toHaveValue('');
  await name.fill('Keep my name');
  await field.fill('{"name":"Still valid","version":3}');
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
  await expect(name).toHaveValue('Keep my name');

  await page.getByLabel(ReproductionControl.board, { exact: true }).fill('invalid');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('Keep my name');
  await expect(page.getByLabel(ReproductionControl.board, { exact: true })).toHaveValue('invalid');
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Restart clears me');
  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Board load clears me');
  await page.getByLabel(ReproductionControl.board, { exact: true }).fill('np1-6-1');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Size change clears me');
  await page.getByLabel(DealControl.size, { exact: true }).selectOption('8');
  await expect(name).toHaveValue('');
  await name.fill('Names are not preferences');
  const saved = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  expect(saved).not.toContain('Names are not preferences');
  await page.reload();
  await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('8');
  await page.locator('summary').click();
  await expect(page.getByLabel(NAME, { exact: true })).toHaveValue('');
});
