import { expect, test } from './browser-test.ts';
import { EXAMPLE_CODE } from '../src/game/game.fixture.ts';
import { ReproductionControl } from '../src/game/controls/control-labels.ts';
import { SelectionKind } from '../src/game/selection.ts';
import { SNAPSHOT_VERSION } from '../src/game/snapshot.ts';
import { finishBoard, GAME_URL, loadFixedBoard, PHONE } from './game-fixture.ts';
import { TournamentControl } from '../src/game/tournament/labels.ts';
import { button, enterPlayers, openTournament, PLAYERS } from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

const SCALE_PX = [0, 4, 6, 8, 12, 16, 24, 32];
const PAUSED = {
  version: SNAPSHOT_VERSION,
  boardCode: EXAMPLE_CODE,
  matched: [],
  selection: { kind: SelectionKind.one, index: 0 },
  moves: 0,
  elapsedMs: 1,
  started: true,
};

// Lists each computed margin, padding and gap that is off the scale and isn't auto or normal.
// Options belong to the native select, so their internals aren't covered.
function offScale(page: Page): Promise<string[]> {
  return page.evaluate((scale) => {
    const properties = ['top', 'right', 'bottom', 'left'].flatMap((side) => [
      `margin-${side}`,
      `padding-${side}`,
    ]);
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

for (const viewport of [PHONE, { width: 1280, height: 800 }])
  test(`every margin, padding and gap stays on the spacing scale at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadFixedBoard(page);
    await finishBoard(page);
    await page.locator('summary').click();
    expect(await offScale(page), 'V09 won game with the reproduction panel open').toEqual([]);
    await page
      .getByLabel(ReproductionControl.snapshot, { exact: true })
      .fill(JSON.stringify(PAUSED));
    await page.getByRole('button', { name: ReproductionControl.loadSnapshot, exact: true }).click();
    await expect(page.getByRole('button', { name: ReproductionControl.resume })).toBeVisible();
    expect(await offScale(page), 'V09 paused import with Resume and its notice').toEqual([]);
  });

test('tournament setup, play and the leave dialog stay on the spacing scale at phone width', async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await page.goto(GAME_URL);
  await openTournament(page);
  expect(await offScale(page), 'V09 tournament setup').toEqual([]);
  await enterPlayers(page, PLAYERS);
  await button(page, TournamentControl.start).click();
  await button(page, TournamentControl.startTurn).click();
  expect(await offScale(page), 'V09 tournament turn with its bracket').toEqual([]);
  await button(page, TournamentControl.leave).click();
  expect(await offScale(page), 'V09 open leave dialog').toEqual([]);
});
