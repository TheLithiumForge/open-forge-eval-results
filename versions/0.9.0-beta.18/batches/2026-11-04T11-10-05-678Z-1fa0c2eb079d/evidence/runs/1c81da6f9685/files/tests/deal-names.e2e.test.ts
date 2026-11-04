import { expect, test } from './browser-test.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import type { Page } from '@playwright/test';

function withVersionLast(snapshot: Record<string, unknown>): string {
  const { version, ...fields } = snapshot;
  return JSON.stringify({ ...fields, version });
}

async function loadDraft(page: Page, text: string): Promise<void> {
  const details = page.locator('details');
  if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(text);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
}

test('Deal name exports named progress and pasted snapshots accept either property order', async ({
  page,
}) => {
  await loadTimedBoard(page);
  const details = page.locator('details');
  await details.locator('summary').click();
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveAttribute('maxlength', '40');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveValue('');
  await name.fill('  Café 😀  ');
  await details.locator('summary').click();
  const first = await exportedSnapshot(page);
  expect(first).toMatchObject({ version: 2, name: '  Café 😀  ' });

  await page.locator('.card').nth(0).click();
  await page.clock.runFor(400);
  await details.locator('summary').click();
  await name.fill('Renamed while playing');
  await details.locator('summary').click();
  const before = await exportedSnapshot(page);
  expect(before).toMatchObject({
    version: 2,
    name: 'Renamed while playing',
    selection: { kind: 'one', index: 0 },
    elapsedMs: 400,
  });
  await page.clock.runFor(1000);
  expect(await exportedSnapshot(page)).toMatchObject({ ...before, elapsedMs: 1400 });

  const pasted = withVersionLast({
    name: '  Pasted café  ',
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'one', index: 0 },
    moves: 0,
    elapsedMs: 0,
    started: true,
    version: 2,
  });
  await loadDraft(page, pasted);
  await expect(name).toHaveValue('  Pasted café  ');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();

  const legacy = withVersionLast({
    boardCode: EXAMPLE_CODE,
    matched: [],
    selection: { kind: 'closed' },
    moves: 0,
    elapsedMs: 0,
    started: false,
    version: 1,
  });
  await loadDraft(page, legacy);
  await expect(name).toHaveValue('');
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

test('invalid named snapshots keep the game, name and corrective draft', async ({ page }) => {
  await loadTimedBoard(page);
  const name = page.getByLabel('Deal name', { exact: true });
  await page.locator('summary').click();
  await name.fill('Current name');
  await page.getByLabel('Snapshot JSON', { exact: true }).fill(
    withVersionLast({
      name: '',
      boardCode: EXAMPLE_CODE,
      matched: [],
      selection: { kind: 'closed' },
      moves: 0,
      elapsedMs: 0,
      started: false,
      version: 2,
    }),
  );
  const draft = await page.getByLabel('Snapshot JSON', { exact: true }).inputValue();
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('Current name');
  await expect(page.locator('.card.closed')).toHaveCount(16);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Snapshot JSON', { exact: true })).toHaveValue(draft);
  await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
});
