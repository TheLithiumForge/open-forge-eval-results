import { expect, test } from './browser-test.ts';
import { GAME_URL, PHONE } from './game-fixture.ts';
import { offScale } from './spacing-scale.ts';
import {
  button,
  EIGHT,
  enterPlayers,
  FOUR,
  FOUR_CODES,
  loadTournament,
  openTournament,
  playTurn,
  tournamentJson,
} from './tournament-fixture.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import type { Page } from '@playwright/test';

const TARGET_PHONE = { width: 390, height: 800 };
const NEW_CONTROLS = '.tournament :is(button, select, input, textarea), .controls button';

// Lists new controls smaller than 44 by 44 CSS pixels, and checks the page stays within its width.
async function smallTargets(page: Page): Promise<string[]> {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'the page stays within the viewport width',
  ).toBe(true);
  return page.locator(NEW_CONTROLS).evaluateAll((controls) =>
    controls
      .filter((control) => !control.classList.contains('card'))
      .map((control) => ({ name: control.textContent, box: control.getBoundingClientRect() }))
      .filter(({ box }) => box.width < 44 || box.height < 44)
      .map(({ name, box }) => `${name} ${box.width}x${box.height}`),
  );
}

test('every new control is at least 44 by 44 pixels on a 390 pixel phone', async ({ page }) => {
  await page.setViewportSize(TARGET_PHONE);
  await page.goto(GAME_URL);
  await expect(button(page, DealControl.tournament)).toBeVisible();
  expect(await smallTargets(page)).toEqual([]);
  await openTournament(page);
  await enterPlayers(page, EIGHT);
  expect(await smallTargets(page)).toEqual([]);
  await button(page, TournamentControl.start).click();
  expect(await smallTargets(page)).toEqual([]);
  await button(page, TournamentControl.leave).click();
  expect(await smallTargets(page)).toEqual([]);
  await button(page, TournamentControl.keepPlaying).click();
  await loadTournament(page, tournamentJson(FOUR, FOUR_CODES, [{ moves: 18, elapsedMs: 0 }]));
  await playTurn(page, FOUR_CODES[0] ?? '');
  expect(await smallTargets(page)).toEqual([]);
});

for (const viewport of [PHONE, { width: 1280, height: 800 }])
  test(`tournament screens keep spacing on the scale at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(GAME_URL);
    expect(await offScale(page), 'solo screen with its heading').toEqual([]);
    await openTournament(page);
    await enterPlayers(page, ['A', 'Bo', 'Cora', 'Dev']);
    await button(page, TournamentControl.start).click();
    await expect(page.getByRole('status')).toHaveText('Use 2 to 20 characters.');
    expect(await offScale(page), 'setup with a name notice').toEqual([]);
    await enterPlayers(page, EIGHT);
    await button(page, TournamentControl.start).click();
    expect(await offScale(page), 'quarterfinal bracket').toEqual([]);
    await button(page, TournamentControl.leave).click();
    expect(await offScale(page), 'leave dialog').toEqual([]);
    await button(page, TournamentControl.keepPlaying).click();
    await loadTournament(
      page,
      tournamentJson(FOUR, FOUR_CODES, [
        ...Array.from({ length: 4 }, () => ({ moves: 18, elapsedMs: 0 })),
        { moves: 33, elapsedMs: 0 },
      ]),
    );
    await playTurn(page, FOUR_CODES[2] ?? '');
    await expect(page.getByText('Champion: Bo')).toBeVisible();
    expect(await offScale(page), 'champion with the final board').toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
