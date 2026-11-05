import { encodeSnapshot } from '../snapshot.ts';
import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { readActiveTournament } from './active-validation.ts';
import { restoreTournamentRecord, tournamentRecord } from './records.ts';
import { readTournamentRecord } from './validation.ts';
import type { TournamentRecord, TournamentState } from './model.ts';

const TOURNAMENT_VERSION = 1;
const TOURNAMENT_MAX_BYTES = 262_144;

interface TournamentSetupDraft {
  readonly playerCount: 4 | 8;
  readonly names: readonly string[];
}

type LoadedTournament =
  | { readonly kind: 'setup'; readonly draft: TournamentSetupDraft }
  | { readonly kind: 'active'; readonly tournament: TournamentState }
  | {
      readonly kind: 'finished';
      readonly tournament: TournamentState;
      readonly record: TournamentRecord;
    };

export function encodeTournamentDraft(draft: TournamentSetupDraft): string {
  return JSON.stringify(
    {
      version: TOURNAMENT_VERSION,
      status: 'setup',
      playerCount: draft.playerCount,
      names: draft.names,
    },
    null,
    2,
  );
}

export function encodeTournament(tournament: TournamentState): string {
  if (tournament.phase === 'finished') {
    return JSON.stringify(
      { version: TOURNAMENT_VERSION, status: 'finished', record: tournamentRecord(tournament) },
      null,
      2,
    );
  }
  return JSON.stringify(
    {
      version: TOURNAMENT_VERSION,
      status: 'active',
      startedAtMs: tournament.startedAtMs,
      players: tournament.players,
      rounds: tournament.rounds,
      current: {
        roundIndex: tournament.currentRound,
        matchIndex: tournament.currentMatch,
        turnIndex: tournament.currentTurn,
        phase: tournament.phase,
      },
      gameSnapshot: encodeSnapshot(tournament.game),
    },
    null,
    2,
  );
}

function readSetup(value: Record<string, unknown>): TournamentSetupDraft | null {
  if (
    !hasExactKeys(value, ['version', 'status', 'playerCount', 'names']) ||
    value.version !== TOURNAMENT_VERSION ||
    value.status !== 'setup' ||
    (value.playerCount !== 4 && value.playerCount !== 8) ||
    !Array.isArray(value.names) ||
    value.names.length !== value.playerCount
  )
    return null;
  const names: string[] = [];
  for (const name of value.names) {
    if (typeof name !== 'string') return null;
    names.push(name);
  }
  return { playerCount: value.playerCount, names };
}

export function decodeTournament(text: string): LoadedTournament | null {
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return null;
  const value = parseJson(text);
  if (
    !isJsonObject(value) ||
    value.version !== TOURNAMENT_VERSION ||
    typeof value.status !== 'string'
  )
    return null;
  if (value.status === 'setup') {
    const draft = readSetup(value);
    return draft ? { kind: 'setup', draft } : null;
  }
  if (value.status === 'active') {
    const tournament = readActiveTournament(value);
    return tournament ? { kind: 'active', tournament } : null;
  }
  if (value.status === 'finished' && hasExactKeys(value, ['version', 'status', 'record'])) {
    const record = readTournamentRecord(value.record);
    const tournament = record ? restoreTournamentRecord(record) : null;
    return record && tournament ? { kind: 'finished', tournament, record } : null;
  }
  return null;
}
