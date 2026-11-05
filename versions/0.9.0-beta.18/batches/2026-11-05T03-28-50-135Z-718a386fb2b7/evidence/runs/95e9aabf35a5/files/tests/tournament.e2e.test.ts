import assert from 'node:assert/strict';
import { test, expect, TestTimeouts } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import type { Page } from '@playwright/test';

async function exportCode(page: Page): Promise<{ text: string; code: string }> {
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const text = await page.getByLabel('Tournament JSON').inputValue();
  const value: unknown = JSON.parse(text);
  assert.ok(isJsonObject(value) && typeof value.snapshot === 'string');
  const snapshot: unknown = JSON.parse(value.snapshot);
  assert.ok(isJsonObject(snapshot) && typeof snapshot.boardCode === 'string');
  return { text, code: snapshot.boardCode };
}

async function solve(page: Page, code: string): Promise<void> {
  const seed = Number(code.split('-')[2]);
  const deck = specDeal(4, seed);
  for (let face = 0; face < 8; face += 1) {
    const positions = deck.flatMap((value, index) => (value === face ? [index] : []));
    for (const index of positions) await page.locator('.card').nth(index).click();
  }
}

test(
  'four players share deals, finish a bracket, and recover it after reload',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    for (let i = 1; i <= 4; i += 1)
      await page.getByLabel(`Player ${i}`, { exact: true }).fill(`Person ${i}`);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    for (let match = 0; match < 3; match += 1) {
      await expect(page.getByText('Now playing:', { exact: false })).toBeVisible();
      await page.getByRole('button', { name: 'Start turn' }).click();
      const first = await exportCode(page);
      if (match === 0) {
        const deck = specDeal(4, Number(first.code.split('-')[2]));
        await page.locator('.card').nth(deck.indexOf(0)).click();
        const progress = await exportCode(page);
        await page.getByLabel('Tournament JSON').fill(progress.text);
        await page.getByRole('button', { name: 'Load tournament' }).click();
        await expect(page.getByText('Tournament loaded.')).toBeVisible();
      }
      await solve(page, first.code);
      await page.getByRole('button', { name: 'Next turn' }).click();
      await page.getByRole('button', { name: 'Start turn' }).click();
      const second = await exportCode(page);
      assert.equal(second.code, first.code);
      await solve(page, second.code);
      if (match < 2) await page.getByRole('button', { name: 'Next match' }).click();
    }
    await expect(page.getByText(/^Champion: /)).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Past tournaments' })).toBeVisible();
    await page.getByRole('button', { name: /^Champion: / }).click();
    await expect(page.getByText(/^Champion: /)).toBeVisible();
    await expect(page.locator('.match')).toHaveCount(3);
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('eight player setup and invalid tournament imports are safe', async ({ page, gameURL }) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByLabel('Players', { exact: true }).selectOption('8');
  await expect(page.getByLabel('Player 8', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Export tournament' }).click();
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByText('Tournament loaded.')).toBeVisible();
  await page.getByLabel('Tournament JSON').fill('{bad');
  await page.getByRole('button', { name: 'Load tournament' }).click();
  await expect(page.getByText('Invalid tournament JSON.')).toBeVisible();
});
