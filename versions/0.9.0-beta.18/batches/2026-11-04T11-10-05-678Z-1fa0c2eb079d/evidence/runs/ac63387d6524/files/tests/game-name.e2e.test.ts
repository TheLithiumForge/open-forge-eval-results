import { expect, test } from './browser-test.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

async function exportDraft(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const value: unknown = JSON.parse(
    await page.getByLabel(ReproductionControl.snapshot, { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected an exported snapshot.');
  return value;
}

async function loadDraft(page: Page, snapshot: Record<string, unknown>): Promise<void> {
  await page
    .getByLabel(ReproductionControl.snapshot, { exact: true })
    .fill(JSON.stringify(snapshot));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
}

test('editing and loading a name preserves running progress and the pending mismatch interval', async ({
  page,
}) => {
  await loadTimedBoard(page);
  for (const index of [2, 6, 0, 1]) await page.locator('.card').nth(index).click();
  await page.clock.runFor(175);
  await page.locator('summary').click();
  const name = page.getByLabel('Game name', { exact: true });
  const title = '  Friday "pairs" — 星🌙 <b>play</b>  ';
  await name.fill(title);
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('maxlength', '100');
  expect(await exportDraft(page)).toMatchObject({
    name: title,
    matched: [2, 6],
    moves: 2,
    elapsedMs: 175,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 625 },
  });
  await page.clock.runFor(100);
  await name.fill(title + ' next');
  const saved = await exportDraft(page);
  expect(saved).toMatchObject({ name: title + ' next', elapsedMs: 275 });
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
  await loadDraft(page, Object.fromEntries(Object.entries(saved).reverse()));
  await expect(name).toHaveValue(title + ' next');
  await expect(
    page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();
  await page.clock.runFor(2000);
  expect(await exportDraft(page)).toEqual(saved);
  await name.fill('Resumed game');
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await page.clock.runFor(524);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await exportDraft(page)).toMatchObject({ name: 'Resumed game', elapsedMs: 800, moves: 2 });
});

test('restart retains the name while fresh deals and legacy snapshots clear it', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel('Game name', { exact: true });
  const legacy = await exportDraft(page);
  expect(legacy).not.toHaveProperty('name');
  await name.fill('Keep on restart');
  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(name).toHaveValue('Keep on restart');
  expect(await exportDraft(page)).toMatchObject({
    name: 'Keep on restart',
    started: false,
    moves: 0,
  });
  await loadDraft(page, legacy);
  await expect(name).toHaveValue('');
  for (const action of ['board', 'size', 'new']) {
    await name.fill('Previous game');
    if (action === 'board') {
      await page.getByLabel(ReproductionControl.board, { exact: true }).fill(EXAMPLE_CODE);
      await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
    } else if (action === 'size') {
      await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
    } else {
      await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
    }
    await expect(name).toHaveValue('');
    expect(await exportDraft(page)).not.toHaveProperty('name');
  }
});

test('invalid named imports keep the game and a named completed import stays completed', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('.card').nth(6).click();
  await page.locator('summary').click();
  const name = page.getByLabel('Game name', { exact: true });
  await name.fill('Current game');
  const original = await exportDraft(page);
  await loadDraft(page, { ...original, name: 42 });
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
  await expect(name).toHaveValue('Current game');
  expect(await exportDraft(page)).toEqual(original);
  await loadDraft(page, {
    ...original,
    name: 'Finished game',
    matched: EXAMPLE_PAIRS.flat(),
    moves: 8,
    elapsedMs: 500,
    selection: { kind: 'closed' },
  });
  await expect(name).toHaveValue('Finished game');
  await expect(page.locator('.card.matched')).toHaveCount(16);
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await page.clock.runFor(2000);
  expect(await exportDraft(page)).toMatchObject({ name: 'Finished game', elapsedMs: 500 });
});
