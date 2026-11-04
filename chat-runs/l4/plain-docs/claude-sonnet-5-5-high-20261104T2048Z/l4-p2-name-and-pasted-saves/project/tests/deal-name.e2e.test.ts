import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

const NAMED = {
  version: 2,
  name: ' Café ',
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: 'one', index: 2 },
  moves: 0,
  elapsedMs: 700,
  started: true,
};

async function loadText(page: Parameters<typeof loadTimedBoard>[0], text: string): Promise<void> {
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(text);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
}

test('a named game exports version 2 and its name returns on load', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.clock.runFor(700);
  await page.locator('summary').click();
  const field = page.getByLabel(ReproductionControl.name, { exact: true });
  await expect(field).toHaveValue('');
  await expect(field).toHaveAttribute('maxlength', '40');
  await field.fill(NAMED.name);
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const exported = await page
    .getByLabel(ReproductionControl.snapshot, { exact: true })
    .inputValue();
  expect(JSON.parse(exported)).toEqual(NAMED);
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(field).toHaveValue('');
  await loadText(page, exported);
  await expect(field).toHaveValue(NAMED.name);
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(field).toHaveValue('');
  await page.locator('summary').click();
  expect((await exportedSnapshot(page)).version).toBe(1);
});

test('a pasted snapshot loads whatever order its keys have', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const reordered = Object.fromEntries(Object.entries(NAMED).reverse());
  await loadText(page, JSON.stringify(reordered, null, 1));
  await expect(page.locator('.load-notice')).toHaveText(
    'Loaded snapshot. Select Resume to continue.',
  );
  await expect(page.getByLabel(ReproductionControl.name, { exact: true })).toHaveValue(NAMED.name);
  await loadText(page, JSON.stringify({ ...NAMED, name: '' }));
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
});
