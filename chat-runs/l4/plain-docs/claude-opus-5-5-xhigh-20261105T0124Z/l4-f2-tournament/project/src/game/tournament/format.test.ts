import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  decodeTournament,
  encodeTournament,
  readTournament,
  TOURNAMENT_FORMAT,
  TOURNAMENT_MAX_BYTES,
  TOURNAMENT_VERSION,
  TournamentNotice,
} from './format.ts';
import { recordAttempt } from './rules.ts';
import type { Tournament } from './rules.ts';

const STARTED: Tournament = recordAttempt(
  {
    players: ['Ada', 'Bo', 'Cora', 'Dev'],
    matches: ['np1-6-1', 'np1-6-2', 'np1-8-1'].map((boardCode) => ({ boardCode, attempts: [] })),
  },
  { moves: 21, elapsedMs: 4321.75 },
);

function withChange(change: (value: { [key: string]: unknown }) => unknown): string {
  const value: { [key: string]: unknown } = JSON.parse(encodeTournament(STARTED));
  return JSON.stringify(change(value) ?? value);
}

test('an export names its format and version with alphabetical keys at every level', () => {
  const text = encodeTournament(STARTED);
  assert.equal(
    text,
    JSON.stringify(
      {
        format: TOURNAMENT_FORMAT,
        matches: [
          { attempts: [{ elapsedMs: 4321.75, moves: 21 }], boardCode: 'np1-6-1' },
          { attempts: [], boardCode: 'np1-6-2' },
          { attempts: [], boardCode: 'np1-8-1' },
        ],
        players: ['Ada', 'Bo', 'Cora', 'Dev'],
        version: TOURNAMENT_VERSION,
      },
      null,
      2,
    ),
  );
  assert.equal(TOURNAMENT_FORMAT, 'neon-pairs/tournament');
  assert.deepEqual(decodeTournament(text), { tournament: STARTED });
});

test('the first field outside the format is named, even inside a match or attempt', () => {
  const root = withChange((value) => ({ ...value, extra: true }));
  assert.deepEqual(decodeTournament(root), { notice: 'Unknown field: extra.' });
  const nested = withChange((value) => {
    const matches = value.matches;
    assert.ok(Array.isArray(matches));
    matches[0].attempts[0].note = 'fast';
    matches[1].label = 'second';
    return { ...value, zeta: 1 };
  });
  assert.deepEqual(decodeTournament(nested), { notice: 'Unknown field: note.' });
});

test('malformed, unsupported or inconsistent tournaments are invalid', () => {
  const invalid = { notice: TournamentNotice.invalid };
  assert.deepEqual(decodeTournament('{'), invalid);
  assert.deepEqual(decodeTournament('[]'), invalid);
  assert.deepEqual(decodeTournament(withChange((value) => ({ ...value, version: 2 }))), invalid);
  assert.deepEqual(
    decodeTournament(withChange((value) => ({ ...value, format: 'neon-pairs/snapshot' }))),
    invalid,
  );
  const missing = withChange((value) => {
    delete value.players;
  });
  assert.deepEqual(decodeTournament(missing), invalid);
  const repeated = withChange((value) => ({ ...value, players: ['Ada', 'Bo', 'ada', 'Dev'] }));
  assert.deepEqual(decodeTournament(repeated), invalid);
  const spaced = withChange((value) => ({ ...value, players: ['Ada', 'Bo  Li', 'Cora', 'Dev'] }));
  assert.deepEqual(decodeTournament(spaced), invalid);
  const text = withChange(() => undefined);
  assert.deepEqual(decodeTournament(text.replace('"moves":21', '"moves":"21"')), invalid);
  assert.deepEqual(decodeTournament(text.replace('np1-6-2', 'np1-6-1')), invalid);
  const padded = encodeTournament(STARTED);
  const limit = padded + ' '.repeat(TOURNAMENT_MAX_BYTES - padded.length);
  assert.ok('tournament' in decodeTournament(limit));
  assert.deepEqual(decodeTournament(`${limit} `), invalid);
  assert.equal(readTournament({ players: STARTED.players }), null);
});
