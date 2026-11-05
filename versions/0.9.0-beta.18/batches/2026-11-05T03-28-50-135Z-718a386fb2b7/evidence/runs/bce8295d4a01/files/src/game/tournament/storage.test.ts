import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boardCode } from '../deck.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import {
  advanceTournamentMatch,
  beginTournamentTurn,
  createTournament,
  roundPlan,
  stageSize,
} from './rules.ts';
import { finishTournamentTurn } from './results.ts';
import { readTournaments, retainTournaments, writeTournaments } from './storage.ts';
import type { TournamentStore } from './storage.ts';
import type { TournamentState } from './types.ts';

class MemoryStore implements TournamentStore {
  value: string | null = null;
  key = '';
  getItem(): string | null {
    return this.value;
  }
  setItem(key: string, value: string): void {
    this.key = key;
    this.value = value;
  }
}

function completedAt(completedAt: string): TournamentState {
  const players = ['Ada', 'Bo', 'Cora', 'Dev'].map((name, index) => ({ name, seed: index + 1 }));
  const codes = roundPlan(4).map((round, index) => boardCode(stageSize(round), index + 1));
  let state = createTournament(players, codes, '2026-11-05T12:00:00.000Z');
  assert.ok(state);
  while (state.phase !== 'complete') {
    if (state.phase === 'betweenMatches') state = advanceTournamentMatch(state);
    else if (state.phase === 'ready' || state.phase === 'betweenTurns')
      state = beginTournamentTurn(state);
    else {
      const seed = state.matches[state.currentMatchIndex]?.players[state.activePlayer] ?? 1;
      state = finishTournamentTurn(
        state,
        {
          moves: stageSize(state.matches[state.currentMatchIndex]!.round) ** 2 / 2,
          elapsedMs: seed,
        },
        completedAt,
      );
    }
  }
  return state;
}

test('history retains the ten newest completed tournaments', () => {
  const items = Array.from({ length: 12 }, (_, index) =>
    completedAt(`2026-11-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`),
  );
  const retained = retainTournaments(items);
  assert.equal(retained.length, 10);
  assert.equal(retained[0]?.completedAt, '2026-11-12T12:00:00.000Z');
  assert.equal(retained.at(-1)?.completedAt, '2026-11-03T12:00:00.000Z');
  const original = items[0];
  assert.ok(original);
  const decoded = decodeTournament(encodeTournament(original, null));
  assert.ok(decoded.ok);
  assert.equal(retainTournaments([original, decoded.tournament]).length, 1);
});

test('history writes in the v3 feature envelope and reads the bracket back', () => {
  const store = new MemoryStore();
  const item = completedAt('2026-11-05T12:00:00.000Z');
  assert.deepEqual(writeTournaments(store, [item]), { success: true });
  assert.equal(store.key, 'np3:tournaments');
  assert.deepEqual(readTournaments(store).items, [item]);
  assert.deepEqual(writeTournaments(null, [item]), { success: false });
});
