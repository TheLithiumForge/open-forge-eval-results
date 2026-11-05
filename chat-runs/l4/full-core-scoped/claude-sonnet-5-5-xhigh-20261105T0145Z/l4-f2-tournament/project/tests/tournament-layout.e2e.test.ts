import { expect, test } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import { offScale } from './spacing-audit.ts';
import { button, EIGHT, openTournament, startTournament } from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

const PHONE = { width: 390, height: 844 };

// Every control, at least 44 by 44 CSS pixels, with no page scrolling sideways.
async function checkTargets(page: Page): Promise<void> {
  const boxes = await page.locator('button, select, input, textarea').evaluateAll((elements) =>
    elements
      .filter((element) => element.getClientRects().length > 0 && !element.closest('.card'))
      .map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return { name: element.id || element.textContent || '', width, height };
      }),
  );
  expect(boxes.length).toBeGreaterThanOrEqual(4);
  for (const box of boxes) {
    expect(box.width, box.name).toBeGreaterThanOrEqual(44);
    expect(box.height, box.name).toBeGreaterThanOrEqual(44);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test('tournament controls are at least 44 by 44 on a 390 pixel wide phone', async ({
  page,
  gameURL,
}) => {
  await page.setViewportSize(PHONE);
  await page.goto(gameURL);
  await checkTargets(page);
  await button(page, DealControl.tournament).click();
  await page.getByLabel(TournamentControl.players, { exact: true }).selectOption('8');
  await checkTargets(page);
  await startTournament(page, EIGHT);
  await checkTargets(page);
  await button(page, TournamentControl.startTurn).click();
  await checkTargets(page);
  await button(page, TournamentControl.leave).click();
  await checkTargets(page);
});

test('the bracket stays inside a 320 pixel phone when names are long', async ({
  page,
  gameURL,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openTournament(page, gameURL);
  await startTournament(page, ['A'.repeat(20), 'B'.repeat(20), 'C'.repeat(20), 'D'.repeat(20)]);
  const table = page.getByRole('table', { name: 'Bracket' });
  const { width } = (await table.boundingBox()) ?? { width: 999 };
  expect(width).toBeLessThanOrEqual(288);
  await checkTargets(page);
});

for (const viewport of [PHONE, { width: 1280, height: 800 }])
  test(`every tournament screen keeps its margins, padding and gaps on the spacing scale at ${viewport.width}px`, async ({
    page,
    gameURL,
  }) => {
    await page.setViewportSize(viewport);
    await openTournament(page, gameURL);
    expect(await offScale(page), 'setup screen').toEqual([]);
    await startTournament(page, EIGHT);
    expect(await offScale(page), 'turn ready').toEqual([]);
    await button(page, TournamentControl.startTurn).click();
    expect(await offScale(page), 'turn playing').toEqual([]);
    await button(page, TournamentControl.leave).click();
    expect(await offScale(page), 'leave dialog open').toEqual([]);
  });
