import assert from 'node:assert/strict';
import { expect } from './browser-test.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { specDeal } from './deal-oracle.ts';
import type { Page } from '@playwright/test';

export async function enterTournament(page: Page, url: string, count = 4): Promise<void> {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto(url);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await page.getByLabel('Players', { exact: true }).selectOption(String(count));
  for (let index = 1; index <= count; index += 1)
    await page.getByLabel(`Player ${index}`, { exact: true }).fill(`Player ${index}`);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
}

export async function exportedTournament(page: Page): Promise<Record<string, unknown>> {
  await page.getByRole('button', { name: 'Export tournament', exact: true }).click();
  const value: unknown = JSON.parse(
    await page.getByLabel('Tournament JSON', { exact: true }).inputValue(),
  );
  assert.ok(isJsonObject(value));
  return value;
}

export async function tournamentDeal(page: Page): Promise<number[]> {
  const value = await exportedTournament(page);
  assert.ok(isJsonObject(value.tournament) && isJsonObject(value.tournament.game));
  const code = value.tournament.game.boardCode;
  assert.equal(typeof code, 'string');
  const parts = String(code).split('-');
  return specDeal(Number(parts[1]), Number(parts[2]));
}

export async function finishTournamentBoard(
  page: Page,
  extraMove = false,
  time = 1000,
): Promise<void> {
  const deck = await tournamentDeal(page);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(deck.length);
  if (extraMove) {
    await page.locator('.card').nth(0).click();
    await page
      .locator('.card')
      .nth(deck.findIndex((face) => face !== deck[0]))
      .click();
    await page.clock.runFor(800);
  }
  let first = true;
  for (let face = 0; face < deck.length / 2; face += 1) {
    for (const [index, value] of deck.entries()) {
      if (value !== face) continue;
      await page.locator('.card').nth(index).click();
      if (first) {
        await page.clock.runFor(time);
        first = false;
      }
    }
  }
}
