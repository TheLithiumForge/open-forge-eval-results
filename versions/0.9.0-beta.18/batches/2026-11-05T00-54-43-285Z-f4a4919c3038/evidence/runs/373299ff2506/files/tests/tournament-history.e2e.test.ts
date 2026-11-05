import { expect, test } from './browser-test.ts';
import {
  completeSampleTurn,
  sampleDocument,
  sampleTournament,
} from '../src/game/tournament/tournament.fixture.ts';
import { encodeTournamentDocument } from '../src/game/tournament/tournament-document.ts';
import { tournamentExport } from './tournament-fixture.ts';

test('loading finished tournaments merges history, preserves its order and deduplicates after reload', async ({
  page,
  browser,
  gameURL,
}) => {
  let completed = sampleTournament();
  for (let turn = 0; turn < 6; turn++) completed = completeSampleTurn(completed);
  await page.goto(gameURL);
  for (const id of ['older', 'newer']) {
    await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    await page
      .getByLabel('Tournament JSON')
      .fill(encodeTournamentDocument(sampleDocument({ ...completed, id })));
    await page.getByRole('button', { name: 'Load tournament', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Champion: Ada', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back to game', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  const saved = await tournamentExport(page);
  expect(saved.pastTournaments.map(({ id }) => id)).toEqual(['newer', 'older']);
  await page.getByRole('region', { name: 'Past tournaments' }).getByRole('button').last().click();
  await page.getByRole('button', { name: 'Back to game', exact: true }).click();
  await page.getByRole('button', { name: 'Tournament', exact: true }).click();
  expect((await tournamentExport(page)).pastTournaments.map(({ id }) => id)).toEqual([
    'newer',
    'older',
  ]);
  const context = await browser.newContext();
  try {
    const restored = await context.newPage();
    await restored.goto(gameURL);
    await restored.getByRole('button', { name: 'Tournament', exact: true }).click();
    await restored.getByLabel('Tournament JSON').fill(encodeTournamentDocument(saved));
    for (let repeat = 0; repeat < 2; repeat++)
      await restored.getByRole('button', { name: 'Load tournament', exact: true }).click();
    expect((await tournamentExport(restored)).pastTournaments).toEqual(saved.pastTournaments);
    await restored.reload();
    await restored.getByRole('button', { name: 'Tournament', exact: true }).click();
    expect((await tournamentExport(restored)).pastTournaments).toEqual(saved.pastTournaments);
  } finally {
    await context.close();
  }
});
