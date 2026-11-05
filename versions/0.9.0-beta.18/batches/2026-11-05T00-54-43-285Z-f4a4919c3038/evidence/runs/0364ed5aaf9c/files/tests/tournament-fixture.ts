import { expect } from './browser-test.ts';
import { decodeTournament } from '../src/game/tournament/format.ts';
import { specDeal } from './deal-oracle.ts';
import { parseBoardCode } from '../src/game/deck.ts';
import type { Page } from '@playwright/test';

export async function exportTournament(page: Page) {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const text = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
  const decoded = decodeTournament(text);
  if (!decoded.state) throw new Error(decoded.error);
  return decoded.state;
}

export async function startTournament(page: Page, count: number): Promise<void> {
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await page.getByLabel('Players', { exact: true }).selectOption(String(count));
  for (let index = 0; index < count; index++)
    await page
      .getByLabel(`Player ${index + 1}`, { exact: true })
      .fill(['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'][index] ?? 'Unknown');
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
}

export async function solveTournamentTurn(page: Page, code: string): Promise<void> {
  const board = parseBoardCode(code);
  if (!board) throw new Error('Expected a match board code.');
  const deck = specDeal(board.size, board.seed);
  const order: number[] = [];
  for (let face = 0; face < deck.length / 2; face++)
    for (const [index, value] of deck.entries()) if (value === face) order.push(index);
  // Exercise pointer input, then batch the remaining public buttons to bound long-bracket automation.
  for (const index of order.slice(0, 2)) await page.locator('.card').nth(index).click();
  await page.locator('.card').evaluateAll((buttons, indices) => {
    for (const index of indices) {
      const button = buttons[index];
      if (!(button instanceof HTMLButtonElement)) throw new Error('Missing card.');
      button.click();
    }
  }, order.slice(2));
}

export async function checkTournamentTargets(page: Page): Promise<void> {
  const targets = await page
    .locator('.tournament button, .tournament select, .tournament input, .tournament textarea')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const bounds = element.getBoundingClientRect();
        return { label: element.textContent, width: bounds.width, height: bounds.height };
      }),
    );
  for (const target of targets) {
    expect(target.width, `${target.label} width`).toBeGreaterThanOrEqual(44);
    expect(target.height, `${target.label} height`).toBeGreaterThanOrEqual(44);
  }
}
