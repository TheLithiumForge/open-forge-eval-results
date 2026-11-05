import assert from 'node:assert/strict';
import { expect, test, TestTimeouts } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import type { Page } from '@playwright/test';

async function deal(page: Page): Promise<number[]> {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).first().click();
  const data: unknown = JSON.parse(await page.getByLabel('Tournament JSON').inputValue());
  assert.ok(isJsonObject(data) && isJsonObject(data.tournament));
  const t = data.tournament;
  assert.ok(
    Array.isArray(t.matches) &&
      typeof t.currentRound === 'number' &&
      typeof t.currentMatch === 'number',
  );
  const match: unknown = t.matches[t.currentRound][t.currentMatch];
  assert.ok(isJsonObject(match) && typeof match.code === 'string');
  const [, size, seed] = match.code.split('-');
  return specDeal(Number(size), Number(seed));
}
async function finish(page: Page, deck: number[]) {
  const pairs = Array.from(new Set(deck)).flatMap((face) =>
    deck.flatMap((value, i) => (value === face ? [i] : [])),
  );
  await page.evaluate((positions) => {
    const cards = document.querySelectorAll<HTMLButtonElement>('.card');
    for (const position of positions) cards[position]?.click();
  }, pairs);
}
test(
  'four players complete a tournament, exchange progress and keep history',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.getByLabel('Grid size').selectOption('10');
    const preferences = await page.evaluate(() =>
      localStorage.getItem('neon-pairs.preferences.v1'),
    );
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
    for (const [i, name] of ['Ada', 'Bo', 'Cora', 'Dev'].entries())
      await page.getByLabel(`Player ${i + 1}`, { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    await expect(page.getByText('Round: Semifinal')).toBeVisible();
    await expect(page.getByText('Now playing: Ada').first()).toBeVisible();
    await page.getByRole('button', { name: 'Start turn' }).click();
    const first = await deal(page);
    await page.getByRole('button', { name: 'Load tournament' }).click();
    await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await page.getByRole('button', { name: 'Resume' }).click();
    await finish(page, first);
    for (let turn = 1; turn < 6; turn++) {
      await page.getByRole('button', { name: turn % 2 ? 'Next turn' : 'Next match' }).click();
      const deck = await deal(page);
      if (turn === 1) assert.deepEqual(deck, first);
      await page.getByRole('button', { name: 'Start turn' }).click();
      await finish(page, deck);
    }
    const champion = await page
      .locator('p')
      .filter({ hasText: /^Champion: / })
      .first()
      .textContent();
    assert.ok(champion);
    await expect(page.getByText(champion).first()).toBeVisible();
    assert.equal(
      await page.evaluate(() => localStorage.getItem('neon-pairs.preferences.v1')),
      preferences,
    );
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.locator('summary').filter({ hasText: champion })).toBeVisible();
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('eight-player setup validates names and protects an unfinished event', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  for (const [i, name] of ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'ADA'].entries()) {
    await page.getByLabel(`Player ${i + 1}`, { exact: true }).fill(name);
  }
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByRole('status')).toHaveText('Each name must be different.');
  await page.getByLabel('Player 8', { exact: true }).fill('Hal');
  await page.getByRole('button', { name: 'Start tournament' }).click();
  await expect(page.getByText('Round: Quarterfinal')).toBeVisible();
  await expect(page.getByText('Hal', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Leave tournament' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Round: Quarterfinal')).toBeVisible();
  await page.getByRole('button', { name: 'Leave tournament' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game', exact: true })).toBeFocused();
});
