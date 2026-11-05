import { expect, Scrollbars, test, TestTimeouts } from './browser-test.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { PREFERENCES_KEY } from '../src/game/session/storage.ts';
import { TOURNAMENTS_KEY } from '../src/game/tournament/records.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import {
  button,
  exportedMatches,
  openTournament,
  playTurn,
  startTournament,
} from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

const SAVED = JSON.stringify({ schemaVersion: 1, size: 10, bestMoves: { '4': 12, '6': 24 } });

function rows(page: Page, caption: string) {
  return page
    .getByRole('table', { name: caption })
    .locator('tbody tr')
    .evaluateAll((elements) =>
      elements.map((row) => [...row.children].map((cell) => cell.textContent ?? '')),
    );
}

test(
  'four players finish a knockout with announced turns, a bracket, a champion and a saved result',
  async ({ page, gameURL }) => {
    await page.goto(gameURL);
    await page.evaluate(
      ([key, value]) => localStorage.setItem(key ?? '', value ?? ''),
      [PREFERENCES_KEY, SAVED],
    );
    await openTournament(page, gameURL);
    await startTournament(page, ['  Ada  ', 'Bo', 'Cora', 'Dev']);
    const status = page.getByRole('status');
    await expect(page.getByRole('heading', { name: TournamentControl.heading })).toBeFocused();
    await expect(status).toHaveText('Now playing: Ada');
    await expect(page.getByText('Round: Semifinal', { exact: true })).toBeVisible();
    await expect(page.locator('.card')).toHaveCount(0);
    const matches = await exportedMatches(page);
    const codes = matches.map((match) => match.boardCode);
    expect(new Set(codes).size).toBe(3);
    expect(codes.map((code) => code.split('-')[1])).toEqual(['6', '6', '8']);
    const [semifinal, other, final] = codes;
    if (!semifinal || !other || !final) throw new Error('Expected three deals.');
    await playTurn(page, semifinal, 1);
    await expect(status).toHaveText('Pair found. All pairs found in 19 moves and 0:00.');
    await button(page, TournamentControl.nextTurn).click();
    await expect(button(page, TournamentControl.startTurn)).toBeFocused();
    await expect(status).toHaveText('Now playing: Dev');
    await expect(page.locator('.card')).toHaveCount(0);
    expect((await exportedMatches(page))[0]?.boardCode).toBe(semifinal);
    await playTurn(page, semifinal, 0);
    await button(page, TournamentControl.nextMatch).click();
    await expect(status).toHaveText('Now playing: Bo');
    await playTurn(page, other, 0, 2000);
    await button(page, TournamentControl.nextTurn).click();
    await expect(status).toHaveText('Now playing: Cora');
    await playTurn(page, other, 0, 1000);
    await button(page, TournamentControl.nextMatch).click();
    await expect(page.getByText('Round: Final', { exact: true })).toBeVisible();
    await expect(page.getByText('Dev vs Cora', { exact: true })).toBeVisible();
    await expect(status).toHaveText('Now playing: Dev');
    await playTurn(page, final, 0);
    await button(page, TournamentControl.nextTurn).click();
    await playTurn(page, final, 1);
    await expect(status).toHaveText(
      'Pair found. All pairs found in 33 moves and 0:00. Champion: Dev',
    );
    await expect(page.getByText('Champion: Dev', { exact: true })).toBeVisible();
    await expect(page.getByText(/^Round:/)).toHaveCount(0);
    expect(await rows(page, 'Bracket')).toEqual([
      ['Semifinal', 'Ada', '19 moves', '0:00', 'Dev'],
      ['Dev', '18 moves', '0:00'],
      ['Semifinal', 'Bo', '18 moves', '0:02', 'Cora'],
      ['Cora', '18 moves', '0:01'],
      ['Final', 'Dev', '32 moves', '0:00', 'Dev'],
      ['Cora', '33 moves', '0:00'],
    ]);
    const bracket = page.getByRole('table', { name: 'Bracket' });
    await expect(bracket.locator('th[scope="col"]')).toHaveCount(5);
    expect(await rows(page, 'Past tournaments')).toEqual([['Dev', 'Cora', 'Ada, Bo, Cora, Dev']]);
    expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(SAVED);
    await button(page, TournamentControl.back).click();
    await expect(button(page, DealControl.tournament)).toBeFocused();
    await expect(page.getByLabel(DealControl.size, { exact: true })).toHaveValue('10');
    await expect(page.locator('.card')).toHaveCount(100);
    await expect(status).toHaveText('');
    await page.reload();
    await button(page, DealControl.tournament).click();
    expect(await rows(page, 'Past tournaments')).toEqual([['Dev', 'Cora', 'Ada, Bo, Cora, Dev']]);
    const saved: unknown = JSON.parse(
      (await page.evaluate((key) => localStorage.getItem(key), TOURNAMENTS_KEY)) ?? '',
    );
    expect(saved).toMatchObject({ v: 3, items: [{ players: ['Ada', 'Bo', 'Cora', 'Dev'] }] });
    expect(await page.evaluate((key) => localStorage.getItem(key), PREFERENCES_KEY)).toBe(SAVED);
  },
  {},
  Scrollbars.hidden,
  TestTimeouts.long,
);
