import { expect } from './browser-test.ts';
import { generateBoard } from '../src/game/deck.ts';
import type { Page } from '@playwright/test';

interface Pair {
  readonly first: number;
  readonly second: number;
}

export function boardPairs(code: string): readonly Pair[] {
  const positions = new Map<number, number[]>();
  generateBoard(code).deck.forEach((face, index) => {
    const pair = positions.get(face) ?? [];
    pair.push(index);
    positions.set(face, pair);
  });
  return [...positions.values()].flatMap((indices) => {
    const first = indices[0];
    const second = indices[1];
    return first === undefined || second === undefined ? [] : [{ first, second }];
  });
}

export async function playTurn(
  page: Page,
  code: string,
  finishesTournament = false,
): Promise<void> {
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  const cards = page.locator('.board .card');
  await expect(cards).toHaveCount(generateBoard(code).deck.length);
  for (const pair of boardPairs(code)) {
    await cards.nth(pair.first).click();
    await cards.nth(pair.second).click();
  }
  if (finishesTournament) {
    await expect(page.locator('.tournament-champion')).toContainText('Champion:');
  } else {
    await expect(page.locator('.victory')).toContainText('Game complete in');
  }
}

export async function matchCode(
  page: Page,
  roundIndex: number,
  matchIndex: number,
): Promise<string> {
  const code = await page
    .locator('.tournament-round')
    .nth(roundIndex)
    .locator('tbody tr')
    .nth(matchIndex)
    .locator('.tournament-code')
    .textContent();
  if (!code) throw new Error('Tournament bracket did not show a deal code.');
  return code.trim();
}

export async function finalPlayerName(page: Page, cellIndex: number): Promise<string> {
  const text = await page
    .locator('.tournament-round')
    .nth(1)
    .locator('tbody tr')
    .nth(0)
    .locator('td')
    .nth(cellIndex)
    .textContent();
  if (!text) throw new Error('Tournament bracket did not show a finalist.');
  return text.split(' — ')[0]?.trim() ?? '';
}
