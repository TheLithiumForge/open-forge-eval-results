import { expect, Scrollbars, test, TestTimeouts } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { NameNotice } from '../src/game/tournament/rules.ts';
import { TOURNAMENTS_KEY } from '../src/game/tournament/records.ts';
import { TournamentControl, TournamentText } from '../src/game/tournament/tournament-labels.ts';
import { button, matchCodes, playTurn, startTournament } from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

const SAVED = { schemaVersion: 1, size: 10, bestMoves: { '6': 24, '8': 40 } };
const CLOCK_START = new Date('2026-01-01T00:00:00Z');

async function storedPreferences(page: Page): Promise<unknown> {
  return JSON.parse(
    (await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)) ?? '',
  );
}

async function expectHeading(page: Page, name: string): Promise<void> {
  const heading = page.getByRole('heading', { level: 2, name, exact: true });
  await expect(heading).toBeFocused();
  await expect(heading).toHaveAttribute('tabindex', '-1');
}

test(
  'a four-player knockout shares each deal, crowns a champion and leaves solo records alone',
  async ({ page, gameURL }) => {
    await page.clock.install({ time: CLOCK_START });
    await page.goto(gameURL);
    await page.evaluate(
      ([key, value]) => localStorage.setItem(key ?? '', value ?? ''),
      [PREFERENCES_KEY, JSON.stringify(SAVED)],
    );
    await page.reload();
    await page.clock.pauseAt(new Date(CLOCK_START.getTime() + 60_000));
    await expect(page.locator('.card')).toHaveCount(100);
    const status = page.getByRole('status');

    await startTournament(page, ['Ada', 'A', 'Cora', 'Dev']);
    await expect(status).toHaveText(NameNotice.length);
    await page.getByLabel(`${TournamentControl.player} 2`, { exact: true }).fill('ada');
    await button(page, TournamentControl.start).click();
    await expect(status).toHaveText(NameNotice.repeated);
    await page.getByLabel(`${TournamentControl.player} 1`, { exact: true }).fill('  Ada  ');
    await page.getByLabel(`${TournamentControl.player} 2`, { exact: true }).fill('Bo');
    await button(page, TournamentControl.start).click();
    await expectHeading(page, 'Round: Semifinal');
    await expect(status).toHaveText('Now playing: Ada');
    await expect(page.getByRole('status')).toHaveCount(1);

    const [semifinals = []] = await matchCodes(page);
    const [first = '', second = ''] = semifinals;
    expect(semifinals.map((code) => code.split('-')[1])).toEqual(['6', '6']);
    await playTurn(page, first);
    await expect(button(page, TournamentControl.nextMatch)).toHaveCount(0);
    await button(page, TournamentControl.nextTurn).click();
    await expect(button(page, TournamentControl.startTurn)).toBeFocused();
    await expect(status).toHaveText('Now playing: Dev');
    await playTurn(page, first, 1);
    await expect(button(page, TournamentControl.nextTurn)).toHaveCount(0);
    await button(page, TournamentControl.nextMatch).click();
    await expectHeading(page, 'Round: Semifinal');
    await expect(status).toHaveText('Now playing: Bo');
    await playTurn(page, second, 1);
    await button(page, TournamentControl.nextTurn).click();
    await expect(status).toHaveText('Now playing: Cora');
    await playTurn(page, second);
    await button(page, TournamentControl.nextMatch).click();
    await expectHeading(page, 'Round: Final');
    await expect(status).toHaveText('Now playing: Ada');

    const codes = await matchCodes(page);
    const final = codes[1]?.[0] ?? '';
    expect(final.split('-')[1]).toBe('8');
    expect(new Set(codes.flat()).size).toBe(3);
    // Equal moves and equal active time go to the higher seed.
    await playTurn(page, final);
    await button(page, TournamentControl.nextTurn).click();
    await playTurn(page, final);
    await expectHeading(page, 'Champion: Ada');
    await expect(status).toHaveText('Pair found. All pairs found in 32 moves and 0:00.');

    const table = page.getByRole('table', { name: TournamentText.bracket });
    await expect(table.locator('caption')).toHaveText(TournamentText.bracket);
    await expect(table.locator('th[scope="col"]')).toHaveText(['Match', 'Player', 'Moves', 'Time']);
    await expect(table.locator('tbody tr')).toHaveText(
      [
        ['Semifinal 1', 'Ada (winner)', '18', '0:00'],
        ['Semifinal 1', 'Dev', '19', '0:00'],
        ['Semifinal 2', 'Bo', '19', '0:00'],
        ['Semifinal 2', 'Cora (winner)', '18', '0:00'],
        ['Final', 'Ada (winner)', '32', '0:00'],
        ['Final', 'Cora', '32', '0:00'],
      ].map((cells) => cells.join('')),
    );
    const past = page.getByRole('region', { name: TournamentText.past });
    await expect(past.getByRole('listitem')).toHaveText(['4 players: Ada (winner), Bo, Cora, Dev']);
    expect(await storedPreferences(page)).toEqual(SAVED);

    await button(page, TournamentControl.back).click();
    await expectHeading(page, 'Solo game');
    await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('10');
    await expect(page.locator('.card')).toHaveCount(100);
    expect(await storedPreferences(page)).toEqual(SAVED);
    await page.reload();
    await button(page, TournamentControl.open).click();
    await expect(past.getByRole('listitem')).toHaveText(['4 players: Ada (winner), Bo, Cora, Dev']);
    const stored: unknown = JSON.parse(
      (await page.evaluate((key) => localStorage.getItem(key), TOURNAMENTS_KEY)) ?? '',
    );
    expect(stored).toMatchObject({ v: 3, items: [{ players: ['Ada', 'Bo', 'Cora', 'Dev'] }] });
  },
  {},
  Scrollbars.hidden,
  TestTimeouts.long,
);
