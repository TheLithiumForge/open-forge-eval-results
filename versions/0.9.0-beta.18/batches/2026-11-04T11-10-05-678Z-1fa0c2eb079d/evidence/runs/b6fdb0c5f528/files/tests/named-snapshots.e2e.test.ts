import { expect, test } from './browser-test.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { exportedSnapshot, finishBoard, loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

async function loadDraft(page: Page, text: string): Promise<void> {
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(text);
  const load = page.getByRole('button', { name: 'Load snapshot', exact: true });
  await load.click();
  await expect(load).toBeFocused();
}

test('exported named progress restores its name, remains editable while paused and completes locally', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('.card').nth(2).click();
  await page.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await name.fill('  Café 🎮  ');
  await page.getByRole('button', { name: 'Export snapshot', exact: true }).click();
  const saved = await page.getByLabel('Snapshot JSON', { exact: true }).inputValue();
  await name.fill('Another name');
  await loadDraft(page, saved);
  await expect(name).toHaveValue('  Café 🎮  ');
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await name.fill('Paused edit');
  await page.locator('.card').nth(6).click();
  await page.clock.runFor(2000);
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 2,
    name: 'Paused edit',
    selection: { kind: 'one', index: 2 },
    moves: 0,
    elapsedMs: 0,
  });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.card').nth(6)).toBeFocused();
  await finishBoard(page);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: 'Paused edit', moves: 8 });
  await page.reload();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('8');
});

test('pasted named JSON accepts reordered keys and rejects bad names without replacing paused progress', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const pending = {
    name: 'Café',
    selection: { remainingMs: 300, second: 2, first: 1, kind: 'mismatch' },
    matched: [0, 11],
    started: true,
    elapsedMs: 1500,
    moves: 2,
    boardCode: 'np1-4-1',
    version: 2,
  };
  await loadDraft(page, JSON.stringify(pending));
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('Café');
  await name.fill('Still paused');
  for (const invalid of ['', 'x'.repeat(41), 'Bad\rname', 'Bad\nname']) {
    const draft = JSON.stringify({ ...pending, name: invalid });
    await loadDraft(page, draft);
    await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue(draft);
    await expect(name).toHaveValue('Still paused');
    await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
  }
  await page.clock.runFor(2000);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toEqual({ ...pending, name: 'Still paused' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

test('completed named imports stay static and editable without recording a best', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await page.locator('summary').click();
  await loadDraft(
    page,
    JSON.stringify({
      name: 'Finished',
      matched: EXAMPLE_PAIRS.flat(),
      selection: { kind: 'closed' },
      moves: 8,
      elapsedMs: 1500,
      started: true,
      boardCode: 'np1-4-1',
      version: 2,
    }),
  );
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await page.getByLabel('Deal name', { exact: true }).fill('  Completed edit  ');
  await page.clock.runFor(2000);
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.locator('.card.matched')).toHaveCount(16);
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({
    version: 2,
    name: '  Completed edit  ',
    moves: 8,
    elapsedMs: 1500,
  });
  await page.reload();
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
});
