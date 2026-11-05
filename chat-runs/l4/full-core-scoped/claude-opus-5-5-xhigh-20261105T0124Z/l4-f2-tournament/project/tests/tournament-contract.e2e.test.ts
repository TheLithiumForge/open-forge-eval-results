import { expect, test } from './browser-test.ts';
import { GAME_URL, exportedSnapshot, loadTimedBoard } from './game-fixture.ts';
import {
  boardCodes,
  enterPlayers,
  exportedTournament,
  FOUR,
  openTournament,
  playTurn,
} from './tournament-fixture.ts';

test('names are checked for length and repeats, then stored in their accepted form', async ({
  page,
}) => {
  await page.goto(GAME_URL);
  await openTournament(page);
  const status = page.getByRole('status');
  await enterPlayers(page, ['Ada', 'B', 'Cora', 'Dev']);
  await expect(status).toHaveText('Use 2 to 20 characters.');
  await enterPlayers(page, ['Ada', 'Bo', 'Cora', 'x'.repeat(21)]);
  await expect(status).toHaveText('Use 2 to 20 characters.');
  await enterPlayers(page, ['Mira', 'Bo', 'Cora', 'MIRA']);
  await expect(status).toHaveText('Each name must be different.');
  await expect(page.getByLabel('Player 4', { exact: true })).toHaveValue('MIRA');
  await enterPlayers(page, ['  Ada   Lovelace ', 'Bo', 'Café', 'A\u{1F600}']);
  await expect(status).toHaveText('Now playing: Ada Lovelace');
  const { players } = await exportedTournament(page);
  expect(players).toEqual(['Ada Lovelace', 'Bo', 'Café', 'A\u{1F600}']);
});

test('leaving asks first, and the solo game waits with its time while the tournament runs', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(0).click();
  await page.clock.runFor(1000);
  await openTournament(page);
  await page.clock.runFor(5000);
  await enterPlayers(page, FOUR);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await page.locator('.card').nth(0).click();
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Keep playing', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await dialog.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await dialog.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Solo game', exact: true })).toBeFocused();
  await expect(page.locator('.card')).toHaveCount(16);
  await expect(page.locator('.card.revealed')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveText('');
  const snapshot = await exportedSnapshot(page);
  expect(snapshot.elapsedMs, 'the solo clock waits while the tournament shows').toBe(1000);
  await page.clock.runFor(500);
  expect((await exportedSnapshot(page)).elapsedMs).toBe(1500);
  await openTournament(page);
  await expect(page.getByLabel('Player 1', { exact: true })).toHaveValue('');
});

test('export and load restore each screen and name the first unknown field', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto(GAME_URL);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await openTournament(page);
  const status = page.getByRole('status');
  const box = page.getByLabel('Tournament JSON', { exact: true });
  const load = page.getByRole('button', { name: 'Load tournament', exact: true });
  const empty = await exportedTournament(page);
  expect(Object.keys(empty)).toEqual(['format', 'matches', 'players', 'reviewing', 'version']);
  expect(empty.format).toBe('neon-pairs/tournament');
  await enterPlayers(page, FOUR);
  const [code = ''] = await boardCodes(page);
  await playTurn(page, code);
  const review = await exportedTournament(page);
  expect(review.reviewing).toBe(true);
  const reviewText = await box.inputValue();
  await page.getByRole('button', { name: 'Next turn', exact: true }).click();
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await box.fill(reviewText);
  await load.click();
  await expect(status).toHaveText('Loaded tournament.');
  await expect(page.getByRole('heading', { name: 'Tournament', exact: true })).toBeFocused();
  await expect(page.locator('.card.matched')).toHaveCount(36);
  await expect(page.getByRole('button', { name: 'Next turn', exact: true })).toBeVisible();
  await box.fill('{');
  await load.click();
  await expect(status).toHaveText('Invalid tournament.');
  await expect(box).toHaveValue('{');
  await expect(page.locator('.card.matched')).toHaveCount(36);
  await box.fill(JSON.stringify({ ...review, note: 'late' }));
  await load.click();
  await expect(status).toHaveText('Unknown field: note.');
  const finished = {
    ...review,
    matches: [
      {
        boardCode: 'np1-6-1',
        results: [
          { elapsedMs: 1, moves: 18 },
          { elapsedMs: 2, moves: 18 },
        ],
      },
      {
        boardCode: 'np1-6-2',
        results: [
          { elapsedMs: 3, moves: 19 },
          { elapsedMs: 3, moves: 18 },
        ],
      },
      {
        boardCode: 'np1-8-1',
        results: [
          { elapsedMs: 5, moves: 40 },
          { elapsedMs: 4, moves: 40 },
        ],
      },
    ],
    reviewing: false,
  };
  await box.fill(JSON.stringify(finished));
  await load.click();
  await expect(page.getByRole('heading', { name: 'Champion: Cora', exact: true })).toBeFocused();
  await expect(page.getByRole('table', { name: 'Past tournaments' })).toContainText(
    'No finished tournaments yet.',
  );
  await box.fill(JSON.stringify({ ...finished, players: [], matches: [] }));
  await load.click();
  await expect(page.getByRole('button', { name: 'Start tournament', exact: true })).toBeVisible();
});

test('blocked storage keeps the tournament in memory and says progress is not saved', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await page.goto(GAME_URL);
  await openTournament(page);
  const past = page.getByRole('table', { name: 'Past tournaments' });
  await expect(past).toContainText("Progress won't be saved on this device.");
  await enterPlayers(page, FOUR);
  await expect(page.getByRole('status')).toHaveText('Now playing: Ada');
});

test('a stored list that fails to validate reads as empty and stays untouched', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.evaluate(() => localStorage.setItem('np3:tournaments', '{"v":3,"items":[1]}'));
  await page.reload();
  await openTournament(page);
  const past = page.getByRole('table', { name: 'Past tournaments' });
  await expect(past).toContainText('No finished tournaments yet.');
  expect(await page.evaluate(() => localStorage.getItem('np3:tournaments'))).toBe(
    '{"v":3,"items":[1]}',
  );
});
