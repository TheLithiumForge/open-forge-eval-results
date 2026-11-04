import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE, EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { DEFAULT_SIZE, PREFERENCES_KEY, PREFERENCES_VERSION } from '../src/game/session/storage.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { SessionNotice } from '../src/game/session/session.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

const NAMED_ORDERED =
  '{"name":"  Café ☕  ","matched":[],"selection":{"index":2,"kind":"one"},"moves":0,"elapsedMs":0,"started":true,"boardCode":"np1-4-1","version":2}';
const LEGACY_REORDERED =
  '{"matched":[],"selection":{"index":2,"kind":"one"},"moves":0,"elapsedMs":0,"started":true,"boardCode":"np1-4-1","version":1}';

async function openReproduction(page: Page): Promise<void> {
  await page.locator('summary').click();
}

async function exportCurrent(page: Page): Promise<Record<string, unknown>> {
  const open = (await page.locator('details').getAttribute('open')) !== null;
  if (open) await page.locator('summary').click();
  return exportedSnapshot(page);
}

async function pasteSnapshot(page: Page, text: string): Promise<void> {
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(text);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
}

test('named and legacy saves load when their JSON fields are reordered', async ({ page }) => {
  await loadTimedBoard(page);
  await openReproduction(page);
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveAttribute('maxlength', '40');
  await name.fill('Old name');
  await pasteSnapshot(page, NAMED_ORDERED);
  await expect(name).toHaveValue('  Café ☕  ');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();
  const named = await exportCurrent(page);
  expect(named).toMatchObject({ version: 2, name: '  Café ☕  ' });

  await openReproduction(page);
  await pasteSnapshot(page, LEGACY_REORDERED);
  await expect(name).toHaveValue('');
  await expect(page.locator('.load-notice')).toHaveText(SessionNotice.loaded);
  const legacy = await exportCurrent(page);
  expect(legacy).toMatchObject({ version: 1, boardCode: EXAMPLE_CODE });
  expect(legacy).not.toHaveProperty('name');
});

test('invalid named imports preserve the current game and editable name', async ({ page }) => {
  await loadTimedBoard(page);
  await openReproduction(page);
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await name.fill('Keep this name');
  await page.locator('.card').nth(2).click();
  const before = await exportCurrent(page);
  await openReproduction(page);
  const invalidText = JSON.stringify({
    version: 2,
    name: 'bad\nname',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
  });
  await pasteSnapshot(page, invalidText);
  await expect(page.locator('.load-notice')).toHaveText(SessionNotice.invalidSnapshot);
  await expect(page.getByLabel(ReproductionControl.snapshot, { exact: true })).toHaveValue(
    invalidText,
  );
  await expect(name).toHaveValue('Keep this name');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  expect(await exportCurrent(page)).toEqual(before);
});

test('a completed named import stays static and keeps the saved best', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  const saved = JSON.stringify({
    schemaVersion: PREFERENCES_VERSION,
    size: DEFAULT_SIZE,
    bestMoves: { [DEFAULT_SIZE]: EXAMPLE_PAIRS.length + 2 },
  });
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [
    PREFERENCES_KEY,
    saved,
  ] as const);
  await page.reload();
  const completed = {
    version: 2,
    name: 'A finished game',
    boardCode: EXAMPLE_CODE,
    matched: EXAMPLE_PAIRS.flat(),
    selection: { kind: SelectionKind.closed },
    moves: EXAMPLE_PAIRS.length,
    elapsedMs: 100,
    started: true,
  };
  await openReproduction(page);
  await pasteSnapshot(page, JSON.stringify(completed));
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('A finished game');
  await expect(name).toBeEnabled();
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory')).not.toHaveClass(/celebrate/);
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText(String(EXAMPLE_PAIRS.length + 2));
  await name.fill('Changed after the win');
  const exported = await exportCurrent(page);
  expect(exported).toMatchObject({ version: 2, name: 'Changed after the win' });
  await expect(page.locator('.stats dd').nth(3)).toHaveText(String(EXAMPLE_PAIRS.length + 2));
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(saved);
});

test('resuming a named game can win and record its improved best', async ({ page, gameURL }) => {
  await loadTimedBoard(page, gameURL);
  const saved = JSON.stringify({
    schemaVersion: PREFERENCES_VERSION,
    size: DEFAULT_SIZE,
    bestMoves: { [DEFAULT_SIZE]: EXAMPLE_PAIRS.length + 2 },
  });
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [
    PREFERENCES_KEY,
    saved,
  ] as const);
  await page.reload();
  const lastPair = EXAMPLE_PAIRS[EXAMPLE_PAIRS.length - 1];
  if (!lastPair) throw new Error('Expected the final documented pair.');
  const restored = {
    version: 2,
    name: 'Continue and win',
    boardCode: EXAMPLE_CODE,
    matched: EXAMPLE_PAIRS.slice(0, -1).flat(),
    selection: { kind: SelectionKind.one, index: lastPair[0] },
    moves: EXAMPLE_PAIRS.length - 1,
    elapsedMs: 100,
    started: true,
  };
  await openReproduction(page);
  await pasteSnapshot(page, JSON.stringify(restored));
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await page.locator('.card').nth(lastPair[1]).click();
  await expect(page.locator('.card.matched')).toHaveCount(16);
  await expect(page.locator('.stats dd').nth(3)).toHaveText(String(EXAMPLE_PAIRS.length));
  const updated = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  expect(updated).toContain('"4":8');
});
