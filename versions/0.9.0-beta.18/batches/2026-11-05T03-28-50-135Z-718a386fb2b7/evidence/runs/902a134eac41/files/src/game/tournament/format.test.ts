import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import { createTournament, tournamentBoardSizes } from './rules.ts';
import { decodeTournament, encodeTournament, encodeTournamentDraft } from './format.ts';
import { restoreTournamentRecord } from './records.ts';
import { COMPLETED_TOURNAMENT_RECORD } from './tournament.fixture.ts';

test('setup Tournament JSON round trips player drafts and count', () => {
  const text = encodeTournamentDraft({ playerCount: 4, names: ['Ada', 'Bo', '', ''] });
  assert.deepEqual(decodeTournament(text), {
    kind: 'setup',
    draft: { playerCount: 4, names: ['Ada', 'Bo', '', ''] },
  });
  assert.equal(decodeTournament(text.replace('"version": 1', '"version": 2')), null);
});

test('active Tournament JSON restores the bracket position and current game', () => {
  const codes = tournamentBoardSizes(4).map((size, index) => boardCode(size, index + 10));
  const initial = createTournament(['Ada', 'Bo', 'Cora', 'Dev'], codes, 1);
  const text = encodeTournament(initial);
  const loaded = decodeTournament(text);
  assert.equal(loaded?.kind, 'active');
  if (loaded?.kind !== 'active') throw new Error('Expected an active event.');
  assert.deepEqual(loaded.tournament, initial);
  const extended = text.replace('"status": "active",', '"status": "active",\n  "extra": true,');
  assert.equal(decodeTournament(extended), null);
});

test('finished Tournament JSON preserves the complete bracket record', () => {
  const finished = restoreTournamentRecord(COMPLETED_TOURNAMENT_RECORD);
  const text = encodeTournament(finished);
  const loaded = decodeTournament(text);
  assert.equal(loaded?.kind, 'finished');
  if (loaded?.kind !== 'finished') throw new Error('Expected a finished event.');
  assert.deepEqual(loaded.record, COMPLETED_TOURNAMENT_RECORD);
  assert.equal(loaded.tournament.championSeed, 1);
  assert.equal(decodeTournament(text.replace('"winnerSeed": 1', '"winnerSeed": 4')), null);
});
