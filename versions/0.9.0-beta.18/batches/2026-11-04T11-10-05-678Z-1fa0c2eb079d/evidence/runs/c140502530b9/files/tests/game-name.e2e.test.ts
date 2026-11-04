import { expect, test } from './browser-test.ts';
import { DealControl, ReproductionControl } from '../src/game/controls/control-labels.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

const GAME_NAME = '  Musée 🎲 <&>  ';

test('a named mismatch round trips in reordered JSON and resumes its saved interval', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.gameName, { exact: true });
  await expect(name).toHaveAttribute('maxLength', '120');
  await expect(name).toBeVisible();
  const field = await name.boundingBox();
  const contentWidth = await page.locator('.reproduction-body').evaluate((element) => {
    const style = getComputedStyle(element);
    return (
      element.clientWidth -
      Number.parseFloat(style.paddingLeft) -
      Number.parseFloat(style.paddingRight)
    );
  });
  expect(field?.width).toBeGreaterThan(contentWidth - 2);
  await name.fill(GAME_NAME);
  await page.locator('summary').click();
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(200);
  const saved = await exportedSnapshot(page);
  expect(saved).toMatchObject({
    name: GAME_NAME,
    moves: 1,
    elapsedMs: 200,
    selection: { kind: 'mismatch', first: 0, second: 1, remainingMs: 600 },
  });

  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
  const reordered = JSON.stringify(Object.fromEntries(Object.entries(saved).reverse()));
  await page.locator('summary').click();
  await page.getByLabel(ReproductionControl.snapshot, { exact: true }).fill(reordered);
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue(GAME_NAME);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await expect(
    page.getByRole('button', { name: ReproductionControl.resume, exact: true }),
  ).toBeVisible();
  await page.locator('summary').click();
  await page.clock.runFor(5000);
  expect(await exportedSnapshot(page)).toMatchObject({
    name: GAME_NAME,
    elapsedMs: 200,
    selection: { kind: 'mismatch', remainingMs: 600 },
  });
  await page.getByRole('button', { name: ReproductionControl.resume, exact: true }).click();
  await page.clock.runFor(599);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.closed')).toHaveCount(16);
  expect(await exportedSnapshot(page)).toMatchObject({ name: GAME_NAME, elapsedMs: 800 });
});

test('invalid snapshots preserve the active name and legacy saves clear it', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const name = page.getByLabel(ReproductionControl.gameName, { exact: true });
  await name.fill('Current game');
  await page.locator('summary').click();
  await page.locator('.card').nth(0).click();
  const current = await exportedSnapshot(page);
  await page.locator('summary').click();
  const snapshot = page.getByLabel(ReproductionControl.snapshot, { exact: true });
  for (const invalid of [
    { ...current, name: 1 },
    { ...current, extra: true },
  ]) {
    await snapshot.fill(JSON.stringify(invalid));
    await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
    await expect(page.locator('.load-notice')).toHaveText('Invalid snapshot.');
    await expect(name).toHaveValue('Current game');
    await expect(page.locator('.card.revealed')).toHaveCount(1);
    await page.locator('summary').click();
    expect(await exportedSnapshot(page)).toEqual(current);
    await page.locator('summary').click();
  }

  await page.getByRole('button', { name: DealControl.restart, exact: true }).click();
  await expect(name).toHaveValue('Current game');
  await page.getByRole('button', { name: DealControl.newGame, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Board name');
  await page.getByLabel(ReproductionControl.board, { exact: true }).fill('np1-6-1');
  await page.getByRole('button', { name: ReproductionControl.loadBoard, exact: true }).click();
  await expect(name).toHaveValue('');
  await name.fill('Legacy name');
  await snapshot.fill(
    JSON.stringify({
      version: SNAPSHOT_VERSION,
      boardCode: EXAMPLE_CODE,
      matched: [],
      selection: { kind: 'closed' },
      moves: 0,
      elapsedMs: 0,
      started: false,
    }),
  );
  await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
  await expect(name).toHaveValue('');
});
