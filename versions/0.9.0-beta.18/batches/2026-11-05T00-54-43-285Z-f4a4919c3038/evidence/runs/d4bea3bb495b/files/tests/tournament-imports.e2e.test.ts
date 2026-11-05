import assert from 'node:assert/strict';
import { test, expect } from './browser-test.ts';
import { enterTournament, tournamentDeal, tournamentExport } from './tournament-helpers.ts';
import { isJsonObject } from '../src/game/saved-format.ts';
import { advanceTournament, createTournament } from '../src/game/tournament/rules.ts';
import { encodeTournament } from '../src/game/tournament/format.ts';
import { TournamentPhase } from '../src/game/tournament/model.ts';
import {
  finishTournamentTurn,
  TOURNAMENT_NAMES,
} from '../src/game/tournament/tournament.fixture.ts';

test('tournament names validate normalized length and duplicates without losing the form', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.locator('#tournament-notice')).toHaveText('Use 2 to 20 characters.');
  for (const [index, name] of ['  Cafe\u0301   Noir  ', 'Ada', 'Bo', 'ada'].entries())
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(page.locator('#tournament-notice')).toHaveText('Each name must be different.');
  await page.getByLabel('Player 4', { exact: true }).fill('Dev');
  await page.getByRole('button', { name: 'Start tournament', exact: true }).click();
  await expect(
    page.locator('.tournament-turn').getByText('Now playing: Café Noir', { exact: true }),
  ).toBeVisible();
  const document = await tournamentExport(page);
  assert.ok(isJsonObject(document.tournament));
  assert.deepEqual(document.tournament.names, ['Café Noir', 'Ada', 'Bo', 'Dev']);
});

test(
  'active imports wait for Start turn, invalid drafts preserve play, and leaving supports Escape',
  async ({ page, gameURL }) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.goto(gameURL);
    await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
    await enterTournament(page, 4);
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    const { deck } = await tournamentDeal(page);
    const second = deck.findIndex((face) => face !== deck[0]);
    await page.locator('.card').nth(0).click();
    await page.locator('.card').nth(second).click();
    await page.clock.runFor(125);
    const saved = await tournamentExport(page);
    const draft = JSON.stringify({ ...saved, extra: 1 });
    await page.getByLabel('Tournament JSON', { exact: true }).fill(draft);
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(page.locator('#tournament-notice')).toHaveText('Unknown field: extra.');
    await expect(page.getByLabel('Tournament JSON', { exact: true })).toHaveValue(draft);
    await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    assert.deepEqual((await tournamentExport(page)).tournament, saved.tournament);
    await page.getByLabel('Tournament JSON', { exact: true }).fill(JSON.stringify(saved));
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start turn', exact: true })).toBeVisible();
    await page.clock.runFor(3000);
    assert.deepEqual((await tournamentExport(page)).tournament, saved.tournament);
    await page.getByRole('button', { name: 'Start turn', exact: true }).click();
    await page.clock.runFor(674);
    await expect(page.locator('.card.revealed')).toHaveCount(2);
    await page.clock.runFor(1);
    await expect(page.locator('.card.revealed')).toHaveCount(0);
    await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start tournament', exact: true })).toBeVisible();
    await page.clock.runFor(5000);
    await expect(page.locator('.card')).toHaveCount(0);
  },
  { viewport: { width: 390, height: 844 } },
);

test('blocked tournament storage remains playable with feedback beside past tournaments', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    }),
  );
  await page.goto(gameURL);
  await enterTournament(page, 4);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(
    page.getByText("Progress won't be saved on this device.", { exact: true }),
  ).toBeVisible();
  let tournament = createTournament(TOURNAMENT_NAMES.slice(0, 4), 1);
  while (tournament.phase !== TournamentPhase.complete) {
    tournament = finishTournamentTurn(tournament);
    if (tournament.phase !== TournamentPhase.complete) tournament = advanceTournament(tournament);
  }
  await page
    .getByLabel('Tournament JSON', { exact: true })
    .fill(encodeTournament({ setup: null, tournament }));
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Champion: Ada', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to game', exact: true }).click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '4 players — Champion: Ada', exact: true }),
  ).toBeVisible();
});
