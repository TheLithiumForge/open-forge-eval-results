import { expect, test } from './browser-test.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { loadTimedBoard } from './game-fixture.ts';

const NAME = '  Café 🌌  ';
const UPDATED_NAME = '  Renamed Café 🌌  ';

async function currentSnapshot(page: Parameters<typeof loadTimedBoard>[0]) {
  const field = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await page
    .getByRole('button', {
      name: ReproductionControl.exportSnapshot,
      exact: true,
    })
    .click();
  const value: unknown = JSON.parse(await field.inputValue());
  if (!isJsonObject(value)) throw new Error('Expected an exported snapshot.');
  return value;
}

test('named reordered progress resumes at its saved mismatch deadline', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('Previous name');
  await page.locator('.card').nth(9).focus();
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  await name.fill(NAME);
  const snapshotField = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await page
    .getByRole('button', {
      name: ReproductionControl.exportSnapshot,
      exact: true,
    })
    .click();
  const ownExport = await snapshotField.inputValue();
  const saved: unknown = JSON.parse(ownExport);
  if (!isJsonObject(saved)) throw new Error('Expected a named exported snapshot.');
  expect(saved).toMatchObject({
    version: 2,
    name: NAME,
    moves: 1,
    selection: { kind: 'mismatch', remainingMs: 600 },
  });
  await name.fill('Changed after saving');
  await snapshotField.fill(ownExport);
  const load = page.getByRole('button', {
    name: ReproductionControl.loadSnapshot,
    exact: true,
  });
  await load.click();
  await expect(load).toBeFocused();
  await expect(name).toHaveValue(NAME);
  await expect(page.locator('.card.revealed')).toHaveCount(2);

  const { version, ...fields } = saved;
  await snapshotField.fill(JSON.stringify({ ...fields, version }));
  await load.click();
  await expect(name).toHaveValue(NAME);
  await expect(page.locator('.card.revealed')).toHaveCount(2);

  const resume = page.getByRole('button', { name: ReproductionControl.resume, exact: true });
  await page.locator('.card').nth(3).focus();
  await name.fill(UPDATED_NAME);
  const paused = await currentSnapshot(page);
  expect(paused).toMatchObject({
    version: 2,
    name: UPDATED_NAME,
    elapsedMs: 200,
    selection: { kind: 'mismatch', remainingMs: 600 },
  });
  await resume.click();
  await expect(page.locator('.card').nth(3)).toBeFocused();
  await page.clock.runFor(100);
  await name.fill(NAME);
  await page.clock.runFor(499);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await currentSnapshot(page)).toMatchObject({ version: 2, name: NAME });

  await name.fill('');
  const unnamed = await currentSnapshot(page);
  expect(unnamed).toMatchObject({ version: 1 });
  expect(unnamed).not.toHaveProperty('name');
});
