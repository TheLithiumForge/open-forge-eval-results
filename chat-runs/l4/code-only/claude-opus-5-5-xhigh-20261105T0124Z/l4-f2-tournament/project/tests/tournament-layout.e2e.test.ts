import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { GAME_URL, PHONE } from './game-fixture.ts';
import { offScale } from './spacing-scale.ts';
import { championLine, TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import {
  button,
  dealExampleBoards,
  enterPlayers,
  loadTournament,
  openTournament,
  playTurn,
} from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

// The longest names a player can type, so wrapping is part of the check.
const LONG_NAMES = Array.from(
  { length: 8 },
  (_, seat) => `Player with a long name number ${seat + 1}`,
);
const RESULT = { moves: 8, elapsedMs: 3000 };

async function expectFits(page: Page, stage: string): Promise<void> {
  expect(await offScale(page), `${stage} spacing`).toEqual([]);
  const widths = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    window: innerWidth,
  }));
  expect(widths.page, `${stage} has no sideways scroll`).toBeLessThanOrEqual(widths.window);
  for (const control of await page.locator('button, select, input, textarea').all()) {
    const box = await control.boundingBox();
    expect(box?.height, `${stage} target height`).toBeGreaterThanOrEqual(44);
    expect(box?.width, `${stage} target width`).toBeGreaterThanOrEqual(44);
  }
}

for (const viewport of [{ width: 320, height: 640 }, PHONE, { width: 1280, height: 800 }])
  test(`tournament screens fit ${viewport.width}px with spacing on the scale and 44px targets`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.goto(GAME_URL);
    await openTournament(page);
    await button(page, TournamentControl.start).click();
    await expectFits(page, 'setup with a notice');
    await enterPlayers(page, LONG_NAMES);
    await button(page, TournamentControl.start).click();
    await dealExampleBoards(page);
    await expectFits(page, 'ready');
    await playTurn(page, 0, 100);
    await expect(button(page, TournamentControl.nextTurn)).toBeVisible();
    await expectFits(page, 'ended turn');
    await loadTournament(page, {
      version: 1,
      players: LONG_NAMES.slice(0, 4),
      matches: Array.from({ length: 3 }, () => ({
        boardCode: EXAMPLE_CODE,
        results: [RESULT, { ...RESULT, moves: 9 }],
      })),
      stage: 'ended',
      game: null,
    });
    await expect(
      page.getByRole('heading', { name: championLine(LONG_NAMES[0] ?? '') }),
    ).toBeVisible();
    await expectFits(page, 'champion');
  });
