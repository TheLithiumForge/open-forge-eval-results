import { expect, test } from './browser-test.ts';
import assert from 'node:assert/strict';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { loadTimedBoard } from './game-fixture.ts';

test('names round trip with progress, remain editable while paused, and clear for new deals', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.clock.runFor(300);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.name, { exact: true });
  const draft = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const button = (label: string) => page.getByRole('button', { name: label, exact: true });
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('  Café 🎮  ');
  await button(ReproductionControl.exportSnapshot).click();
  const saved: unknown = JSON.parse(await draft.inputValue());
  assert.ok(isJsonObject(saved));
  expect(saved).toMatchObject({
    version: 2,
    name: '  Café 🎮  ',
    boardCode: EXAMPLE_CODE,
    selection: { kind: 'one', index: 2 },
    moves: 0,
  });
  await name.fill('changed');
  await draft.fill(
    JSON.stringify({
      boardCode: saved.boardCode,
      matched: saved.matched,
      selection: saved.selection,
      moves: saved.moves,
      elapsedMs: saved.elapsedMs,
      started: saved.started,
      name: saved.name,
      version: saved.version,
    }),
  );
  await button(ReproductionControl.loadSnapshot).click();
  await expect(name).toHaveValue('  Café 🎮  ');
  await expect(button(ReproductionControl.resume)).toBeVisible();
  await name.fill('paused');
  await page.clock.runFor(1000);
  await button(ReproductionControl.exportSnapshot).click();
  expect(JSON.parse(await draft.inputValue())).toMatchObject({
    name: 'paused',
    elapsedMs: saved.elapsedMs,
  });
  await button(ReproductionControl.resume).click();
  await expect(page.locator('.card').nth(0)).toBeFocused();
  await button('Restart').click();
  await expect(name).toHaveValue('');
  await name.fill('temporary');
  await button('New Game').click();
  await expect(name).toHaveValue('');
  await name.fill('temporary');
  await page.getByLabel('Grid size', { exact: true }).selectOption('6');
  await expect(name).toHaveValue('');
  await name.fill('temporary');
  await page.getByLabel(ReproductionControl.board, { exact: true }).fill(EXAMPLE_CODE);
  await button(ReproductionControl.loadBoard).click();
  await expect(name).toHaveValue('');
  await name.fill('temporary');
  await draft.fill(
    JSON.stringify({
      version: 1,
      boardCode: EXAMPLE_CODE,
      matched: [],
      selection: { kind: 'closed' },
      moves: 0,
      elapsedMs: 0,
      started: false,
    }),
  );
  await button(ReproductionControl.loadSnapshot).click();
  await expect(name).toHaveValue('');
  await button(ReproductionControl.exportSnapshot).click();
  const unnamed: unknown = JSON.parse(await draft.inputValue());
  assert.ok(isJsonObject(unnamed));
  expect(unnamed.version).toBe(1);
  await name.fill('temporary');
  await page.reload();
  await page.locator('summary').click();
  await expect(name).toHaveValue('');
});

test('completed named snapshots load without celebration or a best score', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(
    JSON.stringify({
      name: 'Winner',
      version: 2,
      boardCode: EXAMPLE_CODE,
      matched: EXAMPLE_PAIRS.flat(),
      selection: { kind: 'closed' },
      moves: 8,
      elapsedMs: 500,
      started: true,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(page.getByLabel(ReproductionControl.name, { exact: true })).toHaveValue('Winner');
  await expect(page.locator('.card.matched')).toHaveCount(16);
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
});
