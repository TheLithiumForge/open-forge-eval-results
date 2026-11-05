import { expect, test, TestTimeouts } from './browser-test.ts';
import { generateBoard } from '../src/game/deck.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { loadTimedBoard, exportedSnapshot } from './game-fixture.ts';
import type { Page } from '@playwright/test';

async function exportData(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const value: unknown = JSON.parse(await page.getByLabel('Tournament JSON').inputValue());
  if (!isJsonObject(value)) throw new Error('Invalid tournament export');
  return value;
}
async function solveTurn(page: Page, makeExtraMove: boolean): Promise<string> {
  await page.getByRole('button', { name: 'Start turn' }).click();
  const data = await exportData(page);
  if (typeof data.snapshot !== 'string') throw new Error('Missing snapshot');
  const snapshot: unknown = JSON.parse(data.snapshot);
  if (!isJsonObject(snapshot) || typeof snapshot.boardCode !== 'string')
    throw new Error('Missing deal');
  const { boardCode, deck } = generateBoard(snapshot.boardCode);
  const cards = page.locator('.card');
  if (makeExtraMove) {
    const other = deck.findIndex((face) => face !== deck[0]);
    await cards.nth(0).click();
    await cards.nth(other).click();
    await page.waitForTimeout(850);
  }
  for (let face = 0; face < deck.length / 2; face++) {
    const indexes = deck.flatMap((value, i) => (value === face ? [i] : []));
    for (const index of indexes) await cards.nth(index).click();
  }
  return boardCode;
}

test(
  'plays a tournament on shared deals, transfers a turn, and keeps the champion after reload',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await page.getByLabel('Players', { exact: true }).selectOption('8');
    await expect(page.getByLabel('Player 8', { exact: true })).toBeVisible();
    await page.getByLabel('Players', { exact: true }).selectOption('4');
    for (let i = 1; i <= 4; i++)
      await page.getByLabel(`Player ${i}`, { exact: true }).fill(`Player ${i}`);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    await expect(page.getByText('Now playing: Player 1')).toBeVisible();
    for (let match = 0; match < 3; match++) {
      const firstCode = await solveTurn(page, false);
      await page.getByRole('button', { name: 'Next turn' }).click();
      const secondCode = await solveTurn(page, true);
      expect(secondCode).toBe(firstCode);
      if (match < 2) await page.getByRole('button', { name: 'Next match' }).click();
    }
    await expect(page.getByRole('heading', { name: 'Champion: Player 1' })).toBeVisible();
    await expect(page.locator('.bracket')).toContainText(/8 moves, \d+:\d{2}\.\d{3}/);
    await exportData(page);
    const saved = await page.getByLabel('Tournament JSON').inputValue();
    await page.getByRole('button', { name: 'Back to game' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Champion: Player 1' })).toBeVisible();
    await page.getByLabel('Tournament JSON').fill(saved);
    await page.getByRole('button', { name: 'Load tournament' }).click();
    await expect(page.getByRole('heading', { name: 'Champion: Player 1' })).toBeVisible();
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('exports and loads a partially played turn without changing its deal or progress', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  for (let i = 1; i <= 4; i++)
    await page.getByLabel(`Player ${i}`, { exact: true }).fill(`Player ${i}`);
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await page.getByRole('button', { name: 'Start turn' }).click();
  await page.locator('.card').first().click();
  const first = await exportData(page);
  const saved = await page.getByLabel('Tournament JSON').inputValue();
  await page.getByRole('button', { name: 'Leave tournament' }).click();
  await page.getByLabel('Tournament JSON').fill(saved);
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  const second = await exportData(page);
  if (typeof first.snapshot !== 'string' || typeof second.snapshot !== 'string')
    throw new Error('Missing snapshots');
  const before: unknown = JSON.parse(first.snapshot);
  const after: unknown = JSON.parse(second.snapshot);
  if (!isJsonObject(before) || !isJsonObject(after)) throw new Error('Invalid snapshots');
  expect(after.boardCode).toBe(before.boardCode);
  expect(after.selection).toEqual(before.selection);
  expect(after.moves).toBe(before.moves);
  expect(Number(after.elapsedMs)).toBeGreaterThanOrEqual(Number(before.elapsedMs));
  await page.getByRole('button', { name: 'Leave tournament' }).click();
  await expect(page.getByRole('heading', { name: 'Past tournaments' })).toBeVisible();
});

test('pauses the regular game clock while a tournament is open', async ({ page }) => {
  await loadTimedBoard(page);
  await page.locator('.card').first().click();
  await page.clock.runFor(1000);
  const before = await exportedSnapshot(page);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.clock.runFor(5000);
  await page.getByRole('button', { name: 'Back to game' }).click();
  expect((await exportedSnapshot(page)).elapsedMs).toBe(before.elapsedMs);
  await page.clock.runFor(1000);
  expect((await exportedSnapshot(page)).elapsedMs).toBe(Number(before.elapsedMs) + 1000);
});
