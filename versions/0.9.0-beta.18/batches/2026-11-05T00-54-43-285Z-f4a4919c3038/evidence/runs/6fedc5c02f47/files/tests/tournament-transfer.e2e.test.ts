import { expect, test } from './browser-test.ts';
import { loadTimedBoard } from './game-fixture.ts';
import { openTournament, exportedTournament } from './tournament-helpers.ts';
import { encodeTournament } from '../src/game/tournament/tournament-format.ts';
import { finishExampleTournament } from '../src/game/tournament/tournament.fixture.ts';

test('active tournament JSON resumes the same pending turn after leaving and rejects invalid imports without changing it', async ({
  page,
  gameURL,
}) => {
  await loadTimedBoard(page, gameURL);
  await openTournament(page);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  const game = (await exportedTournament(page)).active?.game;
  if (!game) throw new Error('Expected an active game.');
  const other = game.deck.findIndex((face) => face !== game.deck[0]);
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(other).click();
  await page.clock.runFor(300);
  const exported = await exportedTournament(page);
  const text = await page.getByLabel('Tournament JSON', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Leave tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  const box = page.getByLabel('Tournament JSON', { exact: true });
  await box.fill(text);
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.locator('.now-playing')).toHaveText('Now playing: Name 1');
  await expect(page.locator('.card')).toHaveCount(0);
  await page.clock.runFor(5000);
  expect((await exportedTournament(page)).active?.game).toEqual(exported.active?.game);
  await page.getByRole('button', { name: 'Start turn', exact: true }).click();
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(499);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  const before = await exportedTournament(page);
  await box.fill('{');
  await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
  await expect(page.locator('.tournament-json [role="status"]')).toHaveText(
    'Invalid tournament JSON.',
  );
  expect(await exportedTournament(page)).toEqual(before);
});

test('loading finished tournament JSON merges and deduplicates local history and retains full brackets after reload', async ({
  page,
  gameURL,
}) => {
  await page.goto(gameURL);
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  const box = page.getByLabel('Tournament JSON', { exact: true });
  for (const count of [4, 8, 4]) {
    const active = finishExampleTournament(count);
    await box.fill(encodeTournament({ active, past: [] }));
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(page.locator('.tournament-champion')).toHaveText(`Champion: Player ${count}`);
    await expect(page.locator('.bracket-match')).toHaveCount(count - 1);
  }
  expect((await exportedTournament(page)).past).toHaveLength(2);
  await page.reload();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  await expect(page.locator('.past-tournaments li')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Export tournament', exact: true })).toBeVisible();
});
