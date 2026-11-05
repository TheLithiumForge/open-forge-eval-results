import { expect, test } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { button, matchCodes, playTurn, startTournament } from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

const PHONE = { width: 390, height: 844 };
const SCALE_PX = [0, 4, 6, 8, 12, 16, 24, 32];
const EIGHT = ['Ada', 'Bo', 'Cora', 'Dev', 'Emi', 'Finn', 'Gia', 'Hal'];

// Every visible control on the Tournament screen, or the solo controls, under 44 by 44 CSS pixels.
function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [
      ...document.querySelectorAll(
        '.tournament :is(button, select, input, textarea), .controls button',
      ),
    ]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.width < 44 || box.height < 44);
      })
      .map((element) => element.outerHTML.slice(0, 60)),
  );
}

// Margins, padding and gaps of the tournament screen that are off the spacing scale.
function offScale(page: Page): Promise<string[]> {
  return page.evaluate((scale) => {
    const found = new Set<string>();
    for (const element of document.querySelectorAll('.tournament, .tournament *')) {
      if (element.closest('option')) continue;
      const style = element.computedStyleMap();
      for (const side of ['top', 'right', 'bottom', 'left'])
        for (const property of [`margin-${side}`, `padding-${side}`, 'row-gap', 'column-gap']) {
          const value = style.get(property)?.toString() ?? '';
          if (value === 'auto' || value === 'normal' || scale.includes(parseFloat(value))) continue;
          found.add(`${element.tagName.toLowerCase()}.${element.className} ${property} ${value}`);
        }
    }
    return [...found];
  }, SCALE_PX);
}

async function expectFits(page: Page): Promise<void> {
  expect(await smallTargets(page)).toEqual([]);
  expect(await offScale(page)).toEqual([]);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
}

for (const viewport of [PHONE, { width: 1280, height: 800 }])
  test(`tournament controls keep their target size and spacing at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await loadTimedBoard(page);
    await expect(button(page, DealControl.newGame)).toBeVisible();
    await expectFits(page);
    await button(page, TournamentControl.open).click();
    await page.getByLabel(TournamentControl.players, { exact: true }).selectOption('8');
    await expectFits(page);
    for (const [index, name] of EIGHT.entries())
      await page.getByLabel(`${TournamentControl.player} ${index + 1}`).fill(name);
    await button(page, TournamentControl.start).click();
    await expectFits(page);
    const [[first = ''] = []] = await matchCodes(page);
    await playTurn(page, first);
    await expectFits(page);
    await button(page, TournamentControl.leave).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    for (const name of [TournamentControl.keepPlaying, TournamentControl.confirmLeave]) {
      const box = await button(page, name).boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    expect(await offScale(page)).toEqual([]);
  });

test('tournament screens add no motion under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loadTimedBoard(page);
  await startTournament(page, EIGHT.slice(0, 4));
  const [[first = ''] = []] = await matchCodes(page);
  await playTurn(page, first);
  const moving = await page.evaluate(
    () =>
      [...document.querySelectorAll('.tournament, .tournament *')].filter((element) => {
        const style = getComputedStyle(element);
        return style.animationName !== 'none' || parseFloat(style.transitionDuration) > 0;
      }).length,
  );
  expect(moving).toBe(0);
});
