import { expect, test } from './browser-test.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

const NAMED = {
  version: 2,
  name: 'Café',
  boardCode: 'np1-4-1',
  matched: [],
  selection: { kind: 'one', index: 2 },
  moves: 0,
  elapsedMs: 0,
  started: true,
};

test('a name exports as version 2, survives import, and resets with new deals', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('maxlength', '40');
  await page.locator('summary').click();
  expect((await exportedSnapshot(page))['version']).toBe(1);
  await page.locator('summary').click();
  await name.fill(' Café ');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: ' Café ', moves: 0 });
  await page.locator('summary').click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(name).toHaveValue('');
});

test('a pasted snapshot restores its name even when its fields are reordered', async ({ page }) => {
  await loadTimedBoard(page);
  const reordered = Object.fromEntries(Object.entries(NAMED).toReversed());
  await page.locator('summary').click();
  await page
    .getByLabel(ReproductionControl.snapshot, { exact: true })
    .fill(JSON.stringify(reordered));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('Café');
  await name.fill('');
  await page.locator('summary').click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  expect((await exportedSnapshot(page))['version']).toBe(1);
});
