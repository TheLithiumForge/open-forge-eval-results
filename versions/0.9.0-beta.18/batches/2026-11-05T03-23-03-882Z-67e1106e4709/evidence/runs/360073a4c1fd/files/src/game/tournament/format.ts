import { isWon } from '../game.ts';
import { isWithinBytes, parseJson } from '../saved-format.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { exactObject, readTournament } from './format-validation.ts';
import { TournamentPhase } from './rules.ts';
import type { GameState } from '../game.ts';
import type { Tournament } from './rules.ts';

export const TOURNAMENT_MAX_BYTES = 262_144;
interface LoadedTournament {
  readonly tournament: Tournament | null;
  readonly players: readonly string[];
  readonly game: GameState | null;
}
type LoadResult =
  | { readonly data: LoadedTournament; readonly error: null }
  | { readonly data: null; readonly error: string };

export function encodeTournament(
  tournament: Tournament | null,
  players: readonly string[],
  game: GameState | null,
): string {
  return JSON.stringify(
    {
      format: 'neon-pairs/tournament',
      matchIndex: tournament?.matchIndex ?? 0,
      matches:
        tournament?.matches.map((match) => ({
          boardCode: match.boardCode,
          results: match.results.map((result) => ({
            elapsedMs: result.elapsedMs,
            moves: result.moves,
          })),
        })) ?? [],
      phase: tournament?.phase ?? 'setup',
      players: tournament?.players ?? players,
      snapshot: game ? encodeSnapshot(game) : null,
      version: 1,
    },
    null,
    2,
  );
}

export function decodeTournament(text: string): LoadResult {
  const invalid: LoadResult = { data: null, error: 'Invalid tournament.' };
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return invalid;
  try {
    const value = exactObject(parseJson(text), [
      'format',
      'matchIndex',
      'matches',
      'phase',
      'players',
      'snapshot',
      'version',
    ]);
    if (!value || value.format !== 'neon-pairs/tournament' || value.version !== 1) return invalid;
    if (value.phase === 'setup') {
      const players = value.players;
      if (
        !Array.isArray(players) ||
        (players.length !== 4 && players.length !== 8) ||
        !players.every((name): name is string => typeof name === 'string') ||
        value.matchIndex !== 0 ||
        !Array.isArray(value.matches) ||
        value.matches.length !== 0 ||
        value.snapshot !== null
      )
        return invalid;
      return { data: { tournament: null, players, game: null }, error: null };
    }
    const tournament = readTournament(value);
    if (!tournament) return invalid;
    let game: GameState | null = null;
    if (tournament.phase === TournamentPhase.playing) {
      if (typeof value.snapshot !== 'string') return invalid;
      const snapshot = parseJson(value.snapshot);
      const root = exactObject(snapshot, [
        'version',
        'boardCode',
        'matched',
        'selection',
        'moves',
        'elapsedMs',
        'started',
      ]);
      if (
        root &&
        root.selection &&
        typeof root.selection === 'object' &&
        'kind' in root.selection
      ) {
        const kind = root.selection.kind;
        exactObject(
          root.selection,
          kind === 'one'
            ? ['kind', 'index']
            : kind === 'mismatch'
              ? ['kind', 'first', 'second', 'remainingMs']
              : ['kind'],
        );
      }
      game = decodeSnapshot(value.snapshot);
      if (
        !game ||
        isWon(game) ||
        game.boardCode !== tournament.matches[tournament.matchIndex]?.boardCode
      )
        return invalid;
    } else if (value.snapshot !== null) return invalid;
    return { data: { tournament, players: tournament.players, game }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Invalid tournament.' };
  }
}
