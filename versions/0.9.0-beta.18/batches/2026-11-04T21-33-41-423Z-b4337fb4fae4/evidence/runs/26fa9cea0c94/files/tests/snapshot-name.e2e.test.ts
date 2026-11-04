import { expect, test } from './browser-test.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { isJsonObject } from '../src/game/saved-format.ts';

test('deal names export with progress, return on import, and clear on a new deal', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await name.fill('Café');
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const exported: unknown = JSON.parse(await snapshot.inputValue());
  expect(
    isJsonObject(exported) &&
      exported.version === 2 &&
      exported.name === 'Café' &&
      typeof exported.boardCode === 'string',
  ).toBe(true);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('Café');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();

  await snapshot.fill(
    JSON.stringify({
      started: true,
      selection: { kind: 'one', index: 0 },
      elapsedMs: 0,
      moves: 0,
      matched: [],
      boardCode: EXAMPLE_CODE,
      name: 'Pasted game',
      version: 2,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('Pasted game');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();

  await snapshot.fill(
    JSON.stringify({
      selection: { kind: 'closed' },
      started: false,
      elapsedMs: 0,
      matched: [],
      moves: 0,
      boardCode: EXAMPLE_CODE,
      version: 1,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('');

  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(name).toHaveValue('');
});
