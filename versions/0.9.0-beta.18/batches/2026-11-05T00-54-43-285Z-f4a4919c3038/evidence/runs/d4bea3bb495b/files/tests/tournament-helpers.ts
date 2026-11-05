import assert from 'node:assert/strict';
import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import type { Page } from '@playwright/test';

export async function tournamentExport(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const value: unknown = JSON.parse(
    await page.getByLabel('Tournament JSON', { exact: true }).inputValue(),
  );
  assert.ok(isJsonObject(value));
  return value;
}

export async function tournamentDeal(page: Page): Promise<{ code: string; deck: number[] }> {
  const value = await tournamentExport(page);
  assert.ok(isJsonObject(value.tournament) && isJsonObject(value.tournament.game));
  const code = value.tournament.game.boardCode;
  assert.equal(typeof code, 'string');
  if (typeof code !== 'string') throw new Error('Expected a tournament deal.');
  const [, , side, seed] = /^(np1)-(\d+)-(\d+)$/.exec(code) ?? [];
  return { code, deck: specDeal(Number(side), Number(seed)) };
}

export async function enterTournament(page: Page, count: number): Promise<void> {
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await page.getByLabel('Players', { exact: true }).selectOption(String(count));
  const names = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];
  for (let index = 0; index < count; index += 1)
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(names[index]!);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
}

export async function finishTournamentBoard(page: Page, deck: readonly number[]): Promise<void> {
  const pairs = new Map<number, number[]>();
  deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
  const indices = [...pairs.values()].flat();
  // Exercise pointer activation, then finish the deal through the same native click path.
  for (const index of indices.slice(0, 2)) await page.locator('.card').nth(index).click();
  await page.locator('.board').evaluate((board, remaining) => {
    const cards = board.querySelectorAll('button');
    for (const index of remaining) cards[index]?.click();
  }, indices.slice(2));
}

export async function expectTournamentLayout(page: Page): Promise<void> {
  const layout = await page.evaluate(() => ({
    pageFits: document.documentElement.scrollWidth <= window.innerWidth,
    controlsFit: [...document.querySelectorAll<HTMLElement>('.tournament .control, .card')].every(
      (element) => {
        const rect = element.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44;
      },
    ),
  }));
  assert.deepEqual(layout, { pageFits: true, controlsFit: true });
}
