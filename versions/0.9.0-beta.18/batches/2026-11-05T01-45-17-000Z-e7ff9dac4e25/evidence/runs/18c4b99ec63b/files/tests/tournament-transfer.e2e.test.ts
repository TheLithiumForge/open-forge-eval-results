import { expect, test } from './browser-test.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import {
  championLine,
  nowPlaying,
  TournamentControl,
  TournamentNotice,
  winnerLine,
} from '../src/game/tournament/tournament-labels.ts';
import { decodeTournament } from '../src/game/tournament/tournament-format.ts';
import { loadFixedBoard, PHONE } from './game-fixture.ts';
import { offScale } from './spacing-scale.ts';
import {
  button,
  fillPlayers,
  FOUR,
  matchRow,
  NAMES,
  openTournament,
  playMatch,
  playTurn,
} from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

async function exportedTournament(page: Page): Promise<string> {
  await button(page, TournamentControl.exportTournament).click();
  return page.getByLabel(TournamentControl.json, { exact: true }).inputValue();
}

async function loadTournament(page: Page, text: string): Promise<void> {
  await page.getByLabel(TournamentControl.json, { exact: true }).fill(text);
  await button(page, TournamentControl.loadTournament).click();
}

test('Export tournament and Load tournament work on every tournament screen', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await openTournament(page);
  await fillPlayers(page, FOUR);
  const draft = await exportedTournament(page);
  expect(decodeTournament(draft)?.players).toEqual(FOUR);
  await expect(page.getByText(TournamentNotice.exported)).toBeVisible();
  await loadTournament(page, 'not a tournament');
  await expect(page.getByText(TournamentNotice.invalid)).toBeVisible();
  await expect(button(page, TournamentControl.start)).toBeVisible();

  await loadTournament(page, draft);
  await expect(page.getByText(TournamentNotice.loaded)).toBeVisible();
  await expect(page.getByText(nowPlaying('Ann'), { exact: true })).toBeVisible();
  await playMatch(page);
  const midway = await exportedTournament(page);
  expect(decodeTournament(midway)?.matches[0]?.turns).toHaveLength(2);
  await playTurn(page);
  await button(page, TournamentControl.leave).click();

  await loadTournament(page, midway);
  await expect(page.getByText(nowPlaying('Cy'), { exact: true })).toBeVisible();
  await expect(matchRow(page, 0, 0).locator('td').first()).toHaveText('8');
  await expect(page.locator('.card')).toHaveCount(0);
  await loadTournament(page, '{');
  await expect(page.getByText(TournamentNotice.invalid)).toBeVisible();
  await expect(page.getByText(nowPlaying('Cy'), { exact: true })).toBeVisible();

  await playMatch(page);
  await playMatch(page, true);
  const finished = await exportedTournament(page);
  await button(page, TournamentControl.newTournament).click();
  await loadTournament(page, finished);
  await expect(page.getByText(championLine('Ann'), { exact: true })).toBeVisible();
  await expect(page.locator('.match').nth(2)).toContainText(winnerLine('Ann'));
});

test('opening the tournament pauses a game in progress until Resume', async ({ page }) => {
  await loadFixedBoard(page);
  await page.locator('.card').nth(2).click();
  await openTournament(page);
  await button(page, TournamentControl.back).click();
  await expect(page.locator('.load-notice')).toHaveText(
    'Game paused for the tournament. Select Resume to continue.',
  );
  await expect(button(page, ReproductionControl.resume)).toBeVisible();
  await button(page, ReproductionControl.resume).click();
  await page.locator('.card').nth(6).click();
  await expect(page.locator('.card.matched')).toHaveCount(2);
});

for (const viewport of [PHONE, { width: 1280, height: 800 }])
  test(`tournament screens fit ${viewport.width}px wide, keep 44px targets and the spacing scale`, async ({
    page,
    gameURL,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(gameURL);
    await openTournament(page);
    await fillPlayers(page, NAMES);
    const checks: [string, () => Promise<void>][] = [
      ['setup', async () => {}],
      [
        'first turn',
        async () => {
          await button(page, TournamentControl.start).click();
        },
      ],
      [
        'board',
        async () => {
          await button(page, TournamentControl.startTurn).click();
        },
      ],
    ];
    for (const [stage, enter] of checks) {
      await enter();
      const fit = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      expect(fit, `${stage} fits the page width`).toBe(true);
      expect(await offScale(page), `${stage} spacing`).toEqual([]);
      for (const control of await page.locator('button, select, input, textarea').all()) {
        const box = await control.boundingBox();
        expect(box?.height, stage).toBeGreaterThanOrEqual(44);
      }
    }
  });
