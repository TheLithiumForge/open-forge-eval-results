import { expect, test } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { TOURNAMENTS_KEY } from '../src/game/tournament/records.ts';
import {
  LeaveQuestion,
  TournamentControl,
  TournamentText,
} from '../src/game/tournament/tournament-labels.ts';
import { GAME_URL } from './game-fixture.ts';
import { button, openTournament, startTournament } from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

const FOUR = ['Ada', 'Bo', 'Cora', 'Dev'];
const EIGHT = [...FOUR, 'Emi', 'Finn', 'Gia', 'Hal'];
const result = (moves: number, elapsedMs: number) => ({ elapsedMs, moves });
const FINISHED = {
  format: 'neon-pairs/tournament',
  matches: [
    { boardCode: 'np1-6-1', results: [result(20, 1000), result(18, 900)] },
    { boardCode: 'np1-6-2', results: [result(18, 500), result(18, 500)] },
    { boardCode: 'np1-8-1', results: [result(32, 1000), result(32, 2000)] },
  ],
  players: FOUR,
  version: 1,
};
const QUARTERFINALS = {
  ...FINISHED,
  matches: ['np1-4-1', 'np1-4-2', 'np1-4-3', 'np1-4-4', 'np1-6-1', 'np1-6-2', 'np1-8-1'].map(
    (boardCode) => ({ boardCode, results: [null, null] }),
  ),
  players: EIGHT,
};

async function loadTournament(page: Page, value: unknown): Promise<void> {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  await page.getByLabel(TournamentControl.json, { exact: true }).fill(text);
  await button(page, TournamentControl.loadTournament).click();
}

test('setup offers 4 or 8 named players and blocks short or repeated names', async ({ page }) => {
  await openTournament(page, GAME_URL);
  const players = page.getByLabel(TournamentControl.players, { exact: true });
  await expect(players.locator('option')).toHaveText(['4', '8']);
  await expect(page.getByLabel(/^Player \d$/)).toHaveCount(4);
  await players.selectOption('8');
  await expect(page.getByLabel(/^Player \d$/)).toHaveCount(8);
  await startTournament(page, ['A', 'Bo', 'Cora', 'Dev']);
  await expect(page.getByRole('status')).toHaveText('Use 2 to 20 characters.');
  await expect(button(page, TournamentControl.start)).toBeFocused();
  await startTournament(page, ['Mira', 'Bo', 'Cora', ' mira ']);
  await expect(page.getByRole('status')).toHaveText('Each name must be different.');
  await startTournament(page, ['Ab', 'x'.repeat(20), '\u{1F600}'.repeat(20), 'Dev']);
  await expect(page.getByRole('status')).toHaveText('Now playing: Ab');
});

test('leaving unfinished work asks first with Keep playing focused', async ({ page }) => {
  await openTournament(page, GAME_URL);
  await button(page, TournamentControl.back).click();
  await page.locator('.card').first().click();
  await button(page, DealControl.tournament).click();
  const dialog = page.getByRole('dialog', { name: LeaveQuestion.game });
  await expect(button(dialog, LeaveQuestion.keep)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(button(page, DealControl.tournament)).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await button(page, DealControl.tournament).click();
  await button(page, LeaveQuestion.leave).click();
  await expect(page.getByRole('heading', { name: TournamentControl.heading })).toBeFocused();
  await startTournament(page, FOUR);
  await button(page, TournamentControl.startTurn).click();
  await page.locator('.card').first().click();
  await button(page, TournamentControl.leave).click();
  const leaving = page.getByRole('dialog', { name: LeaveQuestion.tournament });
  await expect(button(leaving, LeaveQuestion.keep)).toBeFocused();
  await button(leaving, LeaveQuestion.keep).click();
  await expect(button(page, TournamentControl.leave)).toBeFocused();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await button(page, TournamentControl.leave).click();
  await button(page, LeaveQuestion.leave).click();
  await expect(button(page, DealControl.tournament)).toBeFocused();
  await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('4');
  await expect(page.locator('.card.revealed')).toHaveCount(0);
});

test('tournament JSON loads a bracket, names unknown fields and keeps the current state', async ({
  page,
}) => {
  await openTournament(page, GAME_URL);
  await button(page, TournamentControl.exportTournament).click();
  await expect(page.locator('#tournament-notice')).toHaveText('Use 2 to 20 characters.');
  await loadTournament(page, QUARTERFINALS);
  await expect(page.getByRole('heading', { name: TournamentControl.heading })).toBeFocused();
  await expect(page.getByText('Round: Quarterfinal', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Now playing: Ada');
  const players = page.getByRole('table', { name: TournamentText.bracket }).locator('tbody tr');
  const opening = await players.evaluateAll((rows) =>
    rows.slice(0, 8).map((row) => row.querySelector('td:not([rowspan])')?.textContent),
  );
  expect(opening).toEqual(['Ada', 'Hal', 'Dev', 'Emi', 'Cora', 'Finn', 'Bo', 'Gia']);
  for (const [value, notice] of [
    [{ ...FINISHED, extra: true }, 'Unknown field: extra.'],
    ['{', 'Invalid tournament.'],
    [{ ...FINISHED, version: 2 }, 'Invalid tournament.'],
  ] as const) {
    await loadTournament(page, value);
    await expect(page.locator('#tournament-notice')).toHaveText(notice);
    await expect(page.getByRole('status')).toHaveText(notice);
    await expect(page.getByText('Round: Quarterfinal', { exact: true })).toBeVisible();
    await expect(button(page, TournamentControl.startTurn)).toBeVisible();
  }
  await loadTournament(page, FINISHED);
  await expect(page.getByRole('status')).toHaveText('Champion: Dev');
  await expect(button(page, TournamentControl.back)).toBeVisible();
  await expect(button(page, TournamentControl.startTurn)).toHaveCount(0);
  await expect(page.getByText(TournamentText.noRecords)).toBeVisible();
});

test('blocked storage says so and corrupt saved tournaments read as none', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.evaluate((key) => localStorage.setItem(key, '{'), TOURNAMENTS_KEY);
  await openTournament(page, gameURL);
  await expect(page.getByText(TournamentText.noRecords)).toBeVisible();
  await expect(page.getByText(TournamentText.unsaved)).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), TOURNAMENTS_KEY)).toBe('{');
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await page.reload();
  await button(page, DealControl.tournament).click();
  await expect(page.getByText(TournamentText.unsaved)).toBeVisible();
  await startTournament(page, FOUR);
  await expect(page.getByRole('status')).toHaveText('Now playing: Ada');
});

test('every tournament control is at least 44px square at a 390px phone width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  async function smallTargets(): Promise<string[]> {
    return page
      .locator(
        'main button:visible, main select:visible, main input:visible, main textarea:visible',
      )
      .evaluateAll((elements) =>
        elements
          .filter((element) => !element.classList.contains('card'))
          .filter((element) => {
            const box = element.getBoundingClientRect();
            return box.width < 44 || box.height < 44;
          })
          .map((element) => element.textContent || element.id),
      );
  }
  await openTournament(page, GAME_URL);
  await page.getByLabel(TournamentControl.players, { exact: true }).selectOption('8');
  expect(await smallTargets()).toEqual([]);
  await startTournament(page, EIGHT);
  await button(page, TournamentControl.startTurn).click();
  expect(await smallTargets()).toEqual([]);
  await button(page, TournamentControl.leave).click();
  expect(await smallTargets()).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
