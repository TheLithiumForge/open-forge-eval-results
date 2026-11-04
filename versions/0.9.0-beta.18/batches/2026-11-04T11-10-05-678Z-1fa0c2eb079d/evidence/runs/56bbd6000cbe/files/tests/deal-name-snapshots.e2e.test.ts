import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

async function savedDraft(page: Page): Promise<Record<string, unknown>> {
  const value: unknown = JSON.parse(
    await page.getByLabel(ReproductionControl.snapshot, { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected a saved snapshot.');
  return value;
}

test('deal names round trip and leave active and paused progress intact', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('.card').nth(2).click();
  await page.clock.runFor(375);
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await expect(page.locator('details')).toHaveAttribute('open', '');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('  Café ☕  ');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.locator('.stats dd').nth(0)).toHaveText('0');

  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  await expect(snapshot).toHaveValue(/"version": 2/);
  await expect(snapshot).toHaveValue(/"name": "  Café ☕  "/);
  const active = await savedDraft(page);
  expect(active).toMatchObject({ version: 2, name: '  Café ☕  ', elapsedMs: 375 });

  await name.fill('');
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const unnamed = await savedDraft(page);
  expect(unnamed.version).toBe(1);
  expect(Object.hasOwn(unnamed, 'name')).toBe(false);
  expect(unnamed).toMatchObject({
    boardCode: EXAMPLE_CODE,
    selection: { kind: 'one', index: 2 },
    moves: 0,
    elapsedMs: 375,
    started: true,
  });

  const reordered = JSON.stringify({
    started: true,
    name: '  Café ☕  ',
    selection: { second: 1, remainingMs: 300, kind: 'mismatch', first: 0 },
    moves: 1,
    version: 2,
    elapsedMs: 500,
    matched: [],
    boardCode: EXAMPLE_CODE,
  });
  await snapshot.fill(reordered);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('  Café ☕  ');
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  const resume = page.getByRole('button', { name: ReproductionControl.resume, exact: true });
  await expect(resume).toBeVisible();
  await name.fill('paused name');
  await page.clock.runFor(1000);
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const paused = await savedDraft(page);
  expect(paused).toMatchObject({ version: 2, name: 'paused name', elapsedMs: 500 });
  expect(paused.selection).toMatchObject({ kind: 'mismatch', remainingMs: 300 });

  await resume.click();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await name.fill('active edit');
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  expect(await savedDraft(page)).toMatchObject({ name: 'active edit', elapsedMs: 800 });

  await name.fill('still named');
  const reorderedLegacy = JSON.stringify({
    started: false,
    selection: { kind: 'closed' },
    boardCode: EXAMPLE_CODE,
    elapsedMs: 0,
    moves: 0,
    matched: [],
    version: 1,
  });
  await snapshot.fill(reorderedLegacy);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('');
  const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  expect(preferences).not.toContain('name');
});

test('invalid version two drafts keep the current game and restored name', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  const valid = {
    version: 2,
    name: 'current name',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'one', index: 2 },
    moves: 0,
    elapsedMs: 100,
    started: true,
  };
  await snapshot.fill(JSON.stringify(valid));
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const before = await savedDraft(page);

  const invalid = JSON.stringify({ ...valid, name: '', extra: true });
  await snapshot.fill(invalid);
  const load = page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true });
  await load.click();
  await expect(load).toBeFocused();
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
  await expect(snapshot).toHaveValue(invalid);
  await expect(name).toHaveValue('current name');
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const after = await savedDraft(page);
  expect(after).toEqual(before);
});

test('completed named imports remain static and allow renaming', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  await snapshot.fill(
    JSON.stringify({
      version: 2,
      name: 'finished deal',
      boardCode: EXAMPLE_CODE,
      matched: EXAMPLE_PAIRS.flat(),
      selection: { kind: 'closed' },
      moves: EXAMPLE_PAIRS.length,
      elapsedMs: 500,
      started: true,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('finished deal');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await name.fill('  edited  ');
  await expect(name).toHaveValue('  edited  ');
  await page.getByRole('button', { name: ReproductionControl.exportSnapshot, exact: true }).click();
  const saved = await savedDraft(page);
  expect(saved).toMatchObject({ version: 2, name: '  edited  ' });
  expect(await page.locator('.stats dd').nth(3).textContent()).toBe('none');
});
