import { expect, test, TestTimeouts } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import type { Page } from '@playwright/test';

async function exportValue(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole('button', { name: 'Export tournament' }).click();
  const value: unknown = JSON.parse(
    await page.getByLabel('Tournament JSON', { exact: true }).inputValue(),
  );
  if (!isJsonObject(value)) throw new Error('Expected a tournament.');
  return value;
}

async function playTurn(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  const exported = await exportValue(page);
  if (typeof exported.snapshot !== 'string') throw new Error('Expected a turn snapshot.');
  const snapshot: unknown = JSON.parse(exported.snapshot);
  if (!isJsonObject(snapshot) || typeof snapshot.boardCode !== 'string')
    throw new Error('Expected a board code.');
  const code = snapshot.boardCode;
  const parts = code.split('-');
  const deck = specDeal(Number(parts[1]), Number(parts[2]));
  for (let face = 0; face < deck.length / 2; face++) {
    const first = deck.indexOf(face);
    const second = deck.lastIndexOf(face);
    await page.locator('.card').nth(first).click();
    await page.locator('.card').nth(second).click();
  }
  return code;
}

test(
  'four player tournament shares deals, advances the bracket and survives reload',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    for (let i = 1; i <= 4; i++)
      await page.getByLabel(`Player ${i}`, { exact: true }).fill(`Player ${i} name`);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    await expect(page.getByText('Now playing: Player 1 name')).toBeVisible();
    for (let match = 0; match < 3; match++) {
      const first = await playTurn(page);
      await page.getByRole('button', { name: 'Next turn' }).click();
      const second = await playTurn(page);
      expect(second).toBe(first);
      await expect(page.getByRole('button', { name: 'Next match' })).toBeVisible();
      await page.getByRole('button', { name: 'Next match' }).click();
    }
    await expect(page.locator('.champion')).toContainText('Champion: Player');
    await expect(page.locator('.match')).toHaveCount(3);
    const finished = await exportValue(page);
    expect(finished.phase).toBe('complete');
    await page.reload();
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Past tournaments' })).toBeVisible();
    await page.getByRole('button', { name: /^Champion:/ }).click();
    await expect(page.locator('.champion')).toBeVisible();
    await expect(page.locator('.match')).toHaveCount(3);
  },
  {},
  undefined,
  TestTimeouts.long,
);

test(
  'eight player setup and an unfinished turn can be exported and loaded',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await page.getByLabel('Players', { exact: true }).selectOption('8');
    for (let i = 1; i <= 8; i++)
      await page.getByLabel(`Player ${i}`, { exact: true }).fill(`Name ${i}`);
    await page.getByRole('button', { name: 'Start tournament' }).click();
    await expect(page.locator('.match')).toHaveCount(4);
    await page.getByRole('button', { name: 'Start turn' }).click();
    await page.locator('.card').first().click();
    await exportValue(page);
    const saved = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
    await page.getByRole('button', { name: 'Leave tournament' }).click();
    await page.getByLabel('Tournament JSON', { exact: true }).fill(saved);
    await page.getByRole('button', { name: 'Load tournament' }).click();
    await expect(page.getByText('Now playing: Name 1')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume turn' })).toBeVisible();
    await page.getByRole('button', { name: 'Resume turn' }).click();
    await expect(page.locator('.card').first()).toHaveClass(/revealed/);
  },
  {},
  undefined,
  TestTimeouts.long,
);
