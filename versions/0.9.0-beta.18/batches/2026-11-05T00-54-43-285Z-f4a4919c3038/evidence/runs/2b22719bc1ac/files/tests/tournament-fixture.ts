import assert from 'node:assert/strict';
import { expect } from './browser-test.ts';
import { specDeal } from './deal-oracle.ts';
import { decodeTournament } from '../src/game/tournament/format.ts';
import type { Page } from '@playwright/test';
import type { TournamentDocument } from '../src/game/tournament/format.ts';

export async function tournamentExport(page: Page): Promise<TournamentDocument> {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const result = decodeTournament(
    await page.getByLabel('Tournament JSON', { exact: true }).inputValue(),
  );
  assert.ok(result.data, result.error);
  return result.data;
}

export async function enterTournament(page: Page, count: number): Promise<void> {
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await page.getByLabel('Players', { exact: true }).selectOption(String(count));
  for (let i = 1; i <= count; i += 1)
    await page.getByLabel(`Player ${i}`, { exact: true }).fill(`Name ${i}`);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
}

export async function finishTournamentTurn(
  page: Page,
  code: string,
  keyboard = false,
): Promise<void> {
  const parts = code.split('-');
  const deck = specDeal(Number(parts[1]), Number(parts[2]));
  const pairs = new Map<number, number[]>();
  deck.forEach((face, index) => pairs.set(face, [...(pairs.get(face) ?? []), index]));
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(deck.length);
  await expect(page.locator('.card.closed svg')).toHaveCount(0);
  const turns = [...pairs.values()];
  // Exercise real input for each handoff, then finish through the same native buttons in one task.
  // This keeps a full fourteen-attempt event within the browser journey's time budget.
  for (const position of turns[0] ?? []) {
    const card = page.locator('.card').nth(position);
    if (keyboard) {
      await card.focus();
      await page.keyboard.press('Enter');
    } else await card.click();
  }
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await page.locator('.card').evaluateAll((cards, positions) => {
    for (const position of positions) {
      const card = cards[position];
      if (!(card instanceof HTMLButtonElement)) throw new Error('Expected a card button.');
      card.click();
    }
  }, turns.slice(1).flat());
}
