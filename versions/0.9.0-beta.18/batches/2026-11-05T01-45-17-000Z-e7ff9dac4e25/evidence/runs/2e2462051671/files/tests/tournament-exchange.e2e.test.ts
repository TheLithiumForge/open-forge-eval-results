import { expect, test } from './browser-test.ts';
import { TournamentControl } from '../src/game/tournament/tournament-labels.ts';
import {
  boardCodes,
  button,
  exportedTournament,
  fillNames,
  NAMES,
  openGame,
  openTournament,
  startTournament,
} from './tournament-fixture.ts';
import type { Page } from '@playwright/test';

async function loadText(page: Page, text: string): Promise<void> {
  await page.getByLabel(TournamentControl.json, { exact: true }).fill(text);
  await button(page, TournamentControl.loadTournament).click();
}

test('names are trimmed, counted in code points and compared without case', async ({
  page,
  gameURL,
}) => {
  await openGame(page, gameURL);
  await openTournament(page);
  await expect(page.getByLabel('Player 1', { exact: true })).not.toHaveAttribute('maxlength');
  const status = page.getByRole('status');
  await fillNames(page, ['A', 'Bo', 'Cora', 'Dev']);
  await button(page, TournamentControl.start).click();
  await expect(status).toHaveText('Use 2 to 20 characters.');
  await fillNames(page, ['Ada', 'Bo', 'Cora', 'a'.repeat(21)]);
  await button(page, TournamentControl.start).click();
  await expect(status).toHaveText('Use 2 to 20 characters.');
  await fillNames(page, ['Ada', 'Bo', 'Cora', '  ada  ']);
  await page.getByLabel('Player 4', { exact: true }).press('Enter');
  await expect(status).toHaveText('Each name must be different.');
  await expect(button(page, TournamentControl.start)).toBeVisible();
  await fillNames(page, ['Ada', 'Bo', 'Cora', '\u{1f600}'.repeat(20)]);
  await button(page, TournamentControl.start).click();
  await expect(page.getByText('Now playing: Ada', { exact: true })).toBeVisible();
  expect((await exportedTournament(page)).players).toEqual([
    'Ada',
    'Bo',
    'Cora',
    '\u{1f600}'.repeat(20),
  ]);
});

test('leaving asks first, keeps playing on Escape and returns to the setup', async ({
  page,
  gameURL,
}) => {
  await openGame(page, gameURL);
  await openTournament(page);
  await startTournament(page);
  await button(page, TournamentControl.startTurn).click();
  await button(page, TournamentControl.leave).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button')).toHaveText(['Keep playing', 'Leave']);
  await expect(button(page, 'Keep playing')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(button(page, TournamentControl.leave)).toBeFocused();
  await expect(page.locator('.card')).toHaveCount(36);
  await button(page, TournamentControl.leave).click();
  await button(page, 'Leave').click();
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await expect(button(page, TournamentControl.start)).toBeVisible();
  await expect(page.getByText(/Now playing/)).toHaveCount(0);
  await expect(page.locator('.card')).toHaveCount(0);
  await expect(page.getByLabel('Player 1', { exact: true })).toHaveValue('Ada');
});

test('export and load work on every screen and name a field the format lacks', async ({
  page,
  gameURL,
}) => {
  await openGame(page, gameURL);
  await openTournament(page);
  await fillNames(page, ['Ada', 'Bo', 'Cora', 'Dev']);
  const draft = await exportedTournament(page);
  expect(draft).toEqual({
    format: 'neon-pairs/tournament',
    matches: [],
    players: NAMES,
    version: 1,
  });
  await loadText(page, JSON.stringify({ ...draft, players: ['Eve', 'Fay', 'Gus', 'Hui'] }));
  await expect(page.getByLabel('Player 1', { exact: true })).toHaveValue('Eve');

  await fillNames(page, NAMES);
  await button(page, TournamentControl.start).click();
  const started = await exportedTournament(page);
  const codes = await boardCodes(page);
  const status = page.getByRole('status');
  await loadText(page, JSON.stringify({ ...started, extra: 1 }));
  await expect(status).toContainText('Unknown field: extra.');
  await expect(page.getByText('Now playing: Ada', { exact: true })).toBeVisible();
  await loadText(page, '{');
  await expect(status).toContainText('Invalid tournament.');
  await expect(page.getByLabel(TournamentControl.json, { exact: true })).toHaveValue('{');

  const result = (moves: number) => ({ elapsedMs: 5000, moves });
  const matches = codes.map((boardCode, index) => ({
    boardCode,
    results: [result(index === 2 ? 40 : 30), result(index === 2 ? 41 : 31)],
  }));
  await loadText(page, JSON.stringify({ ...started, matches }));
  await expect(page.getByText('Champion: Ada', { exact: true })).toBeVisible();
  await expect(button(page, TournamentControl.exportTournament)).toBeVisible();
  const finished = await exportedTournament(page);
  expect(finished.matches).toEqual(matches);
  await button(page, TournamentControl.back).click();
  await openTournament(page);
  await expect(page.getByText('No finished tournaments yet.')).toBeVisible();
});

test('blocked storage keeps the screen working and says progress is not saved', async ({
  page,
  gameURL,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
  });
  await openGame(page, gameURL);
  await openTournament(page);
  await expect(page.getByText("Progress won't be saved on this device.")).toBeVisible();
  await startTournament(page);
  await expect(page.getByText('Now playing: Ada', { exact: true })).toBeVisible();
});

test('every new control is at least 44px on a 390px wide screen with no sideways scroll', async ({
  browser,
  gameURL,
}) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
  try {
    const page = await context.newPage();
    const fits = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    await page.goto(gameURL);
    await openTournament(page);
    await fillNames(page, [...NAMES, 'Emi', 'Finn', 'Gia', 'Hal']);
    await button(page, TournamentControl.start).click();
    await button(page, TournamentControl.startTurn).click();
    expect(await fits()).toBe(true);
    for (const element of await page
      .locator('.tournament button, .tournament input, .tournament select, .tournament textarea')
      .all()) {
      const box = await element.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  } finally {
    await context.close();
  }
});
