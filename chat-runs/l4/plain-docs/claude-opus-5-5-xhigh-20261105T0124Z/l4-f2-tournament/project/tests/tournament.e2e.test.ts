import { expect, test, TestTimeouts } from './browser-test.ts';
import { GAME_URL } from './game-fixture.ts';
import {
  button,
  EIGHT,
  enterPlayers,
  exportedTournament,
  FOUR,
  openTournament,
  playTurn,
} from './tournament-fixture.ts';
import { DealControl } from '../src/game/controls/control-labels.ts';
import { TournamentControl, TournamentTable } from '../src/game/tournament/tournament-labels.ts';

const CLOCK_START = new Date('2026-01-01T00:00:00Z');

test(
  'a four-player knockout hands over each turn, compares results and names a champion',
  async ({ page }) => {
    await page.clock.install({ time: CLOCK_START });
    await page.goto(GAME_URL);
    await page.clock.pauseAt(new Date(CLOCK_START.getTime() + 60_000));
    await openTournament(page);
    await enterPlayers(page, ['  Ada  ', 'Bo', 'Cora   Lee', 'Dev']);
    await button(page, TournamentControl.start).click();
    const heading = page.getByRole('heading', { name: TournamentControl.heading, exact: true });
    await expect(heading).toBeFocused();
    const status = page.getByRole('status');
    await expect(status).toHaveText('Now playing: Ada');
    await expect(page.getByText('Round: Semifinal')).toBeVisible();
    await expect(page.getByText('Semifinal 1: Ada against Dev')).toBeVisible();
    await expect(page.locator('[aria-live]')).toHaveCount(1);
    const exported = await exportedTournament(page);
    expect(exported.players).toEqual(['Ada', 'Bo', 'Cora Lee', 'Dev']);
    const codes = JSON.stringify(exported.matches).match(/np1-\d+-\d+/g) ?? [];
    expect(codes.map((code) => code.split('-')[1])).toEqual(['6', '6', '8']);
    expect(new Set(codes).size).toBe(3);
    const [semi1 = '', semi2 = '', final = ''] = codes;
    const cards = page.locator('.card');
    await expect(cards).toHaveCount(36);
    await cards.nth(0).click();
    await expect(page.locator('.card.revealed')).toHaveCount(0);

    await playTurn(page, semi1, 0, 5000);
    await expect(status).toHaveText('Pair found. All pairs found in 18 moves and 0:05.');
    await expect(page.locator('.card:focus')).toHaveCount(1);
    await expect(button(page, TournamentControl.nextMatch)).toHaveCount(0);
    await button(page, TournamentControl.nextTurn).click();
    await expect(button(page, TournamentControl.startTurn)).toBeFocused();
    await expect(status).toHaveText('Now playing: Dev');
    await expect(page.locator('.card.matched')).toHaveCount(0);
    await playTurn(page, semi1, 0, 4000);
    const bracket = page.getByRole('table', { name: TournamentTable.bracket });
    const row = (name: string) => bracket.getByRole('row').filter({ hasText: name });
    await expect(row('Dev (winner)')).toHaveText(['4Dev (winner)18 moves0:04']);
    await expect(row('Winner of Semifinal 2')).toHaveText([
      'Winner of Semifinal 2Not playedNot played',
    ]);
    await expect(row('Ada')).toHaveText(['1Ada18 moves0:05']);
    await button(page, TournamentControl.nextMatch).click();
    await expect(status).toHaveText('Now playing: Bo');
    await expect(page.getByText('Semifinal 2: Bo against Cora Lee')).toBeVisible();

    await playTurn(page, semi2, 1);
    await button(page, TournamentControl.nextTurn).click();
    await playTurn(page, semi2, 1);
    await expect(row('Bo (winner)')).toHaveText(['2Bo (winner)19 moves0:00']);
    await expect(row('Cora Lee')).toHaveText(['3Cora Lee19 moves0:00']);
    await button(page, TournamentControl.nextMatch).click();
    await expect(page.getByText('Round: Final')).toBeVisible();
    await expect(status).toHaveText('Now playing: Dev');
    await expect(cards).toHaveCount(64);
    await playTurn(page, final);
    await button(page, TournamentControl.nextTurn).click();
    await expect(status).toHaveText('Now playing: Bo');
    await playTurn(page, final);
    await expect(page.getByText('Champion: Bo')).toBeVisible();
    await expect(page.locator('.card:focus')).toHaveCount(1);
    await expect(button(page, TournamentControl.leave)).toHaveCount(0);
    await expect(button(page, TournamentControl.exportJson)).toBeVisible();
    await button(page, TournamentControl.back).click();
    await expect(page.getByRole('heading', { name: 'Solo game', exact: true })).toBeFocused();
    await expect(cards).toHaveCount(16);
  },
  {},
  undefined,
  TestTimeouts.long,
);

test('eight entrants meet in seed order and quarterfinals deal 4x4 boards', async ({ page }) => {
  await page.goto(GAME_URL);
  await openTournament(page);
  await expect(page.getByLabel(`${TournamentControl.player} 5`)).toHaveCount(0);
  await enterPlayers(page, EIGHT);
  await button(page, TournamentControl.start).click();
  await expect(page.getByText('Round: Quarterfinal')).toBeVisible();
  await expect(page.locator('.card')).toHaveCount(16);
  const players = await page
    .getByRole('table', { name: TournamentTable.bracket })
    .locator('tbody tr:not(.match-name) td:nth-child(2)')
    .allTextContents();
  expect(players.slice(0, 8)).toEqual(['Ada', 'Hal', 'Dev', 'Emi', 'Cora', 'Finn', 'Bo', 'Gia']);
  expect(players.slice(8)).toEqual([
    'Winner of Quarterfinal 1',
    'Winner of Quarterfinal 2',
    'Winner of Quarterfinal 3',
    'Winner of Quarterfinal 4',
    'Winner of Semifinal 1',
    'Winner of Semifinal 2',
  ]);
  const headers = page.getByRole('table', { name: TournamentTable.bracket }).locator('th');
  await expect(headers).toHaveCount(4);
  for (const header of await headers.all()) await expect(header).toHaveAttribute('scope', 'col');
});

test('names are cleaned before their checks, and a failed check keeps the entries', async ({
  page,
}) => {
  await page.goto(GAME_URL);
  await openTournament(page);
  const status = page.getByRole('status');
  const start = button(page, TournamentControl.start);
  await enterPlayers(page, ['A', 'Bo', 'Cora', 'Dev']);
  await start.click();
  await expect(status).toHaveText('Use 2 to 20 characters.');
  await expect(start).toBeFocused();
  await enterPlayers(page, ['  A  ', 'Bo', 'Cora', 'Dev']);
  await page.getByLabel(`${TournamentControl.player} 4`, { exact: true }).press('Enter');
  await expect(status).toHaveText('Use 2 to 20 characters.');
  await expect(page.getByLabel(`${TournamentControl.player} 4`, { exact: true })).toBeFocused();
  await enterPlayers(page, ['a'.repeat(21), 'Bo', 'Cora', 'Dev']);
  await start.click();
  await expect(status).toHaveText('Use 2 to 20 characters.');
  await enterPlayers(page, ['Mira', 'Bo', 'mira', 'Dev']);
  await start.click();
  await expect(status).toHaveText('Each name must be different.');
  await expect(page.getByLabel(`${TournamentControl.player} 3`, { exact: true })).toHaveValue(
    'mira',
  );
  await enterPlayers(page, ['\u{1F600}'.repeat(20), 'Bo', 'Cora', 'Dev']);
  await start.click();
  await expect(status).toHaveText(`Now playing: ${'\u{1F600}'.repeat(20)}`);
});

test('leaving asks in a native dialog where Keep playing and Escape continue', async ({ page }) => {
  await page.goto(GAME_URL);
  await openTournament(page);
  await enterPlayers(page, FOUR);
  await button(page, TournamentControl.start).click();
  const leave = button(page, TournamentControl.leave);
  const dialog = page.locator('dialog');
  await leave.click();
  await expect(dialog).toHaveJSProperty('open', true);
  await expect(button(page, TournamentControl.keepPlaying)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(leave).toBeFocused();
  await leave.click();
  await button(page, TournamentControl.keepPlaying).click();
  await expect(page.getByRole('status')).toHaveText('Now playing: Ada');
  await expect(page.locator('.card')).toHaveCount(36);
  await leave.click();
  await button(page, TournamentControl.confirmLeave).click();
  await expect(button(page, TournamentControl.start)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: TournamentControl.heading, exact: true }),
  ).toBeFocused();
  await expect(page.locator('.card')).toHaveCount(0);
  await button(page, TournamentControl.back).click();
  await expect(button(page, DealControl.tournament)).toBeVisible();
});
