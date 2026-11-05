import { expect, test } from './browser-test.ts';
import { exportedSnapshot } from './game-fixture.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import {
  FOUR_PLAYERS,
  boardCodes,
  button,
  loadPausedGame,
  openTournament,
  startTournament,
} from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

const SCALE_PX = [0, 4, 6, 8, 12, 16, 24, 32];

function offScale(page: Page): Promise<string[]> {
  return page.evaluate((scale) => {
    const sides = ['top', 'right', 'bottom', 'left'];
    const properties = sides.flatMap((side) => [`margin-${side}`, `padding-${side}`]);
    const found = new Set<string>();
    for (const element of document.querySelectorAll('body, body *')) {
      if (element.closest('option, optgroup')) continue;
      const style = element.computedStyleMap();
      for (const property of [...properties, 'row-gap', 'column-gap']) {
        const value = style.get(property)?.toString() ?? '';
        if (value === 'auto' || value === 'normal' || scale.includes(parseFloat(value))) continue;
        found.add(
          `${element.tagName.toLowerCase()}.${element.getAttribute('class') ?? ''} ${property} ${value}`,
        );
      }
    }
    return [...found];
  }, SCALE_PX);
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
])
  test(`every margin, padding and gap on the Tournament screens stays on the scale at ${viewport.width}px`, async ({
    page,
    gameURL,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(gameURL);
    expect(await offScale(page), 'game screen with its heading').toEqual([]);
    await openTournament(page);
    expect(await offScale(page), 'entry screen').toEqual([]);
    await startTournament(page, FOUR_PLAYERS);
    expect(await offScale(page), 'waiting for Start turn').toEqual([]);
    await (await button(page, TournamentControl.startTurn)).click();
    expect(await offScale(page), 'turn under way').toEqual([]);
    await (await button(page, TournamentControl.leave)).click();
    expect(await offScale(page), 'leave dialog open').toEqual([]);
    await page.keyboard.press('Escape');
    const codes = await boardCodes(page);
    const matches = [
      [20, 21],
      [22, 19],
      [40, 41],
    ].map((moves, index) => ({
      boardCode: codes[index],
      results: moves.map((count) => ({ elapsedMs: 1000, moves: count })),
    }));
    const progress = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
    const finished = { ...JSON.parse(progress), matches };
    await page.getByLabel('Tournament JSON', { exact: true }).fill(JSON.stringify(finished));
    await page.getByRole('button', { name: TournamentControl.loadJson, exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Champion: Ada');
    expect(await offScale(page), 'finished tournament').toEqual([]);
  });

test('the ordinary game waits while the Tournament screen is open', async ({ page, gameURL }) => {
  await loadPausedGame(page, gameURL);
  await page.locator('.card').first().click();
  await page.clock.runFor(1000);
  await openTournament(page);
  await page.clock.runFor(30_000);
  await (await button(page, TournamentControl.back)).click();
  await page.clock.runFor(2000);
  expect((await exportedSnapshot(page)).elapsedMs).toBe(3000);
});

test('the screens fit a phone with 44px controls', async ({ page, gameURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(gameURL);
  await openTournament(page);
  async function expectFits(): Promise<void> {
    const size = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      window: innerWidth,
    }));
    expect(size.page).toBeLessThanOrEqual(size.window);
    for (const control of await page.locator('button, select, input, textarea').all()) {
      if (!(await control.isVisible())) continue;
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
  }
  await expectFits();
  await startTournament(page, FOUR_PLAYERS);
  await expectFits();
  await (await button(page, TournamentControl.startTurn)).click();
  await expectFits();
});
