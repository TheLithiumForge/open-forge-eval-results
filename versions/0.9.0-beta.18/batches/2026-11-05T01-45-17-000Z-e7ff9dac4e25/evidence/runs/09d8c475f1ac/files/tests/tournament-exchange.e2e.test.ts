import { expect, test } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { encodeTournament } from '../src/game/tournament/format.ts';
import { TOURNAMENTS_KEY } from '../src/game/tournament/storage.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import {
  button,
  exportedTournament,
  finishedTournament,
  FOUR,
  openTournament,
  startTournament,
} from './tournament-fixture.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import type { Page } from '@playwright/test';

const STATUS = '[role="status"]';

function jsonBox(page: Page) {
  return page.getByLabel(TournamentControl.json, { exact: true });
}

function sortedAtEveryLevel(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(sortedAtEveryLevel);
  if (!isJsonObject(value)) return true;
  const keys = Object.keys(value);
  return keys.join() === [...keys].sort().join() && Object.values(value).every(sortedAtEveryLevel);
}

test('every tournament screen exports sorted version one JSON and loads it back', async ({
  page,
  gameURL,
}) => {
  await openTournament(page, gameURL);
  await page.getByLabel('Player 1', { exact: true }).fill('Ada');
  const draft = await exportedTournament(page);
  expect(draft).toMatchObject({ format: 'neon-pairs/tournament', version: 1, matches: [] });
  expect(draft.players).toEqual(['Ada', '', '', '']);
  await startTournament(page, FOUR);
  const started = await exportedTournament(page);
  expect(sortedAtEveryLevel(started)).toBe(true);
  expect(started.players).toEqual(FOUR);
  await button(page, TournamentControl.startTurn).click();
  expect(await exportedTournament(page)).toEqual(started);
  const box = await jsonBox(page).inputValue();
  await button(page, TournamentControl.leave).click();
  await button(page, TournamentControl.confirmLeave).click();
  await expect(page.locator('tbody')).toHaveCount(0);
  await button(page, TournamentControl.loadJson).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Round: Semifinal' })).toBeVisible();
  await expect(page.locator(STATUS)).toHaveText('Now playing: Ada Loaded tournament.');
  expect(await exportedTournament(page)).toEqual(started);
  await jsonBox(page).fill(box.replace('"version": 1', '"version": 1,\n  "extra": true'));
  await button(page, TournamentControl.loadJson).click();
  await expect(page.locator(STATUS)).toContainText('Unknown field: extra.');
  await jsonBox(page).fill('{"format":"neon-pairs/tournament"}');
  await button(page, TournamentControl.loadJson).click();
  await expect(page.locator(STATUS)).toContainText('Invalid tournament.');
  await expect(jsonBox(page)).toHaveValue('{"format":"neon-pairs/tournament"}');
  await expect(page.getByRole('heading', { level: 2, name: 'Round: Semifinal' })).toBeVisible();
});

test('a loaded finished tournament shows its champion and is not saved as played here', async ({
  page,
  gameURL,
}) => {
  await openTournament(page, gameURL);
  await jsonBox(page).fill(encodeTournament(finishedTournament('Mira', 3)));
  await button(page, TournamentControl.loadJson).click();
  await expect(page.getByText('Champion: Mira', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Tournament complete' })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(6);
  await expect(page.locator('tbody td', { hasText: 'Mira (winner)' })).toHaveCount(2);
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), TOURNAMENTS_KEY),
  ).toBeNull();
  await button(page, TournamentControl.back).click();
  await button(page, DealControl.tournament).click();
  await expect(page.getByText('No past tournaments yet.')).toBeVisible();
});

test('leaving asks first, Keep playing has focus and Escape keeps playing', async ({
  page,
  gameURL,
}) => {
  await openTournament(page, gameURL);
  await startTournament(page, FOUR);
  const leave = button(page, TournamentControl.leave);
  await leave.click();
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible();
  await expect(button(page, TournamentControl.keep)).toBeFocused();
  await expect(dialog.getByRole('button')).toHaveText(['Keep playing', 'Leave']);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(leave).toBeFocused();
  await expect(page.locator('tbody tr')).toHaveCount(6);
  await leave.click();
  await button(page, TournamentControl.keep).click();
  await expect(dialog).toHaveCount(0);
  await expect(leave).toBeFocused();
  await leave.click();
  await button(page, TournamentControl.confirmLeave).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Tournament' })).toBeFocused();
  await expect(page.locator('tbody')).toHaveCount(0);
});

test('one live region carries the turn owner and every turn result on each screen', async ({
  page,
  gameURL,
}) => {
  const regions = page.locator('[role="status"], [aria-live], [role="alert"]');
  await page.goto(gameURL);
  await expect(regions).toHaveCount(1);
  await button(page, DealControl.tournament).click();
  await expect(regions).toHaveCount(1);
  await startTournament(page, FOUR);
  await expect(regions).toHaveText('Now playing: Ada');
  await button(page, TournamentControl.startTurn).click();
  await page.locator('.card').nth(0).click();
  await expect(regions).toHaveText('Now playing: Ada');
  await expect(regions).toHaveCount(1);
});

test('the solo game keeps its clock stopped while the tournament screen is open', async ({
  page,
  gameURL,
}) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await openTournament(page, gameURL);
  await button(page, TournamentControl.back).click();
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(2000);
  await expect(page.locator('.stats dd').nth(2)).toHaveText('0:02');
  await button(page, DealControl.tournament).click();
  await page.clock.runFor(30_000);
  await button(page, TournamentControl.back).click();
  await expect(page.locator('.stats dd').nth(2)).toHaveText('0:02');
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.clock.runFor(1000);
  await expect(page.locator('.stats dd').nth(2)).toHaveText('0:03');
});
