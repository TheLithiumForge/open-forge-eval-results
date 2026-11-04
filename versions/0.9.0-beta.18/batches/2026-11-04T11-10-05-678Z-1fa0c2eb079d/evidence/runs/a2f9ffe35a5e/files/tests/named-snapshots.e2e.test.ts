import { expect, test } from './browser-test.ts';
import { EXAMPLE_PAIRS } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { NAMED_PROGRESS, pasteSnapshot, readSnapshot } from './deal-name-fixture.ts';

test('a pasted named snapshot pauses its exact progress, permits renaming, resumes focus and records a win', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await pasteSnapshot(page, NAMED_PROGRESS);
  const name = page.getByLabel(ReproductionControl.dealName, { exact: true });
  await expect(name).toHaveValue('  Café 🎴  ');
  await expect(page.getByRole('status')).toHaveText('Loaded snapshot. Select Resume to continue.');
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.locator('.card').nth(8).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card').nth(9)).toBeFocused();
  await name.fill('  Paused Café 🎴  ');
  await page.clock.runFor(2000);
  expect(await readSnapshot(page)).toEqual({ ...NAMED_PROGRESS, name: '  Paused Café 🎴  ' });
  const resume = page.getByRole('button', { name: ReproductionControl.resume, exact: true });
  await resume.click();
  await expect(page.locator('.card').nth(9)).toBeFocused();
  await page.clock.runFor(299);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  expect(await readSnapshot(page)).toMatchObject({ elapsedMs: 1800, name: '  Paused Café 🎴  ' });
  // The imported pair is already aria-disabled; finish only the remaining seven pairs.
  for (const pair of EXAMPLE_PAIRS)
    if (pair[0] !== 0) for (const index of pair) await page.locator('.card').nth(index).click();
  await expect(page.locator('.card.matched')).toHaveCount(16);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('9');
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toContain('9');
});

test('named completed imports keep their static win and best score when renamed', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  const before = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  await pasteSnapshot(page, {
    ...NAMED_PROGRESS,
    matched: EXAMPLE_PAIRS.flat(),
    selection: { kind: 'closed' },
    moves: 8,
  });
  await expect(page.getByRole('status')).toHaveText('Loaded completed snapshot.');
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.victory')).toBeVisible();
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  await expect(page.locator('.stats dd').nth(3)).toHaveText('none');
  await page.getByLabel(ReproductionControl.dealName, { exact: true }).fill('Completed');
  await page.clock.runFor(2000);
  expect(await readSnapshot(page)).toMatchObject({ name: 'Completed', elapsedMs: 1500, moves: 8 });
  await expect(page.locator('.victory.celebrate')).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(before);
});

test('reordered unnamed imports clear a current name and invalid named drafts retain the paused game', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await pasteSnapshot(page, NAMED_PROGRESS);
  const before = await readSnapshot(page);
  const preferences = await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY);
  for (const fields of [
    { name: '' },
    { name: 'line\nbreak' },
    { version: 3 },
    { extra: true },
    { matched: [0] },
  ]) {
    const invalid = { ...NAMED_PROGRESS, ...fields };
    await pasteSnapshot(page, invalid);
    await expect(page.getByLabel(ReproductionControl.snapshot, { exact: true })).toHaveValue(
      JSON.stringify(invalid),
    );
    await expect(page.getByRole('status')).toHaveText('Invalid snapshot.');
    await expect(page.getByLabel(ReproductionControl.dealName, { exact: true })).toHaveValue(
      NAMED_PROGRESS.name,
    );
    await page.clock.runFor(1000);
    expect(await readSnapshot(page)).toEqual(before);
    await expect(
      page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
    ).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(
      preferences,
    );
  }
  const { name, ...unnamed } = NAMED_PROGRESS;
  expect(name).toBe('  Café 🎴  ');
  await pasteSnapshot(page, { ...unnamed, version: 1 });
  await expect(page.getByLabel(ReproductionControl.dealName, { exact: true })).toHaveValue('');
  expect(await readSnapshot(page)).toEqual({ ...unnamed, version: 1 });
});
