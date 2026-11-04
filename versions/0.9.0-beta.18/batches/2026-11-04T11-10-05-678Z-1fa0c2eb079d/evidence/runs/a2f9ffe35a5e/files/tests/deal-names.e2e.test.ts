import { expect, test } from './browser-test.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { openReproduction, readSnapshot } from './deal-name-fixture.ts';

test('Deal name preserves Unicode and spaces, enforces its limit and rejects pasted line breaks', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await openReproduction(page);
  const name = page.getByLabel('Deal name', { exact: true });
  await expect(name).toHaveValue('');
  await expect(name).toHaveAttribute('type', 'text');
  await expect(name).toHaveAttribute('maxlength', '40');
  await expect(page.locator('details input#deal-name')).toHaveCount(1);
  await name.fill('  Café 🎴  ');
  expect(await readSnapshot(page)).toMatchObject({ version: 2, name: '  Café 🎴  ' });
  await name.fill('🎴'.repeat(20));
  await name.press('End');
  await name.press('x');
  await expect(name).toHaveValue('🎴'.repeat(20));
  await name.fill('Keep');
  for (const text of ['line\rbreak', 'line\nbreak']) {
    const accepted = await name.evaluate((element, pasted) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', pasted);
      return element.dispatchEvent(
        new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData,
        }),
      );
    }, text);
    expect(accepted).toBe(false);
    await expect(name).toHaveValue('Keep');
  }
  await name.fill('');
  const unnamed = await readSnapshot(page);
  expect(unnamed.version).toBe(1);
  expect(unnamed).not.toHaveProperty('name');
});

test('renaming between timer ticks preserves active time, mismatch timing and board focus memory', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.locator('.card').nth(9).focus();
  const result = await page.getByRole('status').textContent();
  await page.clock.runFor(235);
  await openReproduction(page);
  await page.getByLabel(ReproductionControl.dealName, { exact: true }).fill('Timing');
  await expect(page.getByRole('status')).toHaveText(result ?? '');
  await expect(page.locator('.card').nth(9)).toHaveAttribute('tabindex', '0');
  expect(await readSnapshot(page)).toMatchObject({
    version: 2,
    name: 'Timing',
    boardCode: 'np1-4-1',
    matched: [],
    moves: 1,
    elapsedMs: 235,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 565 },
  });
  await page.clock.runFor(564);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await readSnapshot(page)).toMatchObject({ name: 'Timing', elapsedMs: 800, moves: 1 });
});

test('fresh-deal actions clear names and reload keeps only size and scores in browser preferences', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await openReproduction(page);
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  for (const action of ['Restart', 'New Game', 'size', 'board']) {
    await name.fill('Temporary');
    if (action === 'size')
      await page.getByLabel(DealControl.size, { exact: true }).selectOption('6');
    else if (action === 'board') {
      await page.getByLabel(ReproductionControl.board, { exact: true }).fill('np1-4-1');
      await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
    } else await page.getByRole('button', { name: action, exact: true }).click();
    await expect(name).toHaveValue('');
    const snapshot = await readSnapshot(page);
    expect(snapshot.version).toBe(1);
    expect(snapshot).not.toHaveProperty('name');
  }
  const before = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  await name.fill('Not a preference');
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(before);
  expect(before).not.toContain('name');
  await page.reload();
  await openReproduction(page);
  await expect(name).toHaveValue('');
  expect(await readSnapshot(page)).toMatchObject({ version: 1, started: false, moves: 0 });
});
