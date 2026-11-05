import { isWithinBytes, parseJson } from '../saved-format.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { isWon } from '../game.ts';
import { TournamentPhase } from './types.ts';
import { readTournament, readTournamentSetup, tournamentObject } from './validation.ts';
import type { GameState } from '../game.ts';
import type { Tournament, TournamentSetup } from './types.ts';

export const TOURNAMENT_MAX_BYTES = 262_144;
export interface TournamentDocument {
  readonly setup: TournamentSetup;
  readonly tournament: Tournament | null;
  readonly game: GameState | null;
}

function alphabetical(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value))
    return Object.fromEntries(
      Object.entries(value).sort(([one], [two]) => (one < two ? -1 : one > two ? 1 : 0)),
    );
  return value;
}

export function encodeTournament(document: TournamentDocument): string {
  return JSON.stringify(
    {
      format: 'neon-pairs/tournament',
      version: 1,
      setup: document.setup,
      tournament: document.tournament,
      snapshot: document.game ? parseJson(encodeSnapshot(document.game)) : null,
    },
    alphabetical,
    2,
  );
}

export function decodeTournament(text: string): TournamentDocument | string {
  try {
    if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) return 'Invalid tournament.';
    const root = tournamentObject(parseJson(text), [
      'format',
      'version',
      'setup',
      'tournament',
      'snapshot',
    ]);
    if (root.format !== 'neon-pairs/tournament' || root.version !== 1) return 'Invalid tournament.';
    const setup = readTournamentSetup(root.setup);
    const tournament = root.tournament === null ? null : readTournament(root.tournament);
    let game: GameState | null = null;
    if (root.snapshot !== null) {
      const snapshot = tournamentObject(root.snapshot, [
        'version',
        'boardCode',
        'matched',
        'selection',
        'moves',
        'elapsedMs',
        'started',
      ]);
      const selection = snapshot.selection;
      const kind =
        selection && typeof selection === 'object' && 'kind' in selection
          ? selection.kind
          : undefined;
      tournamentObject(
        selection,
        kind === 'closed'
          ? ['kind']
          : kind === 'one'
            ? ['kind', 'index']
            : ['kind', 'first', 'second', 'remainingMs'],
      );
      game = decodeSnapshot(JSON.stringify(snapshot));
      if (!game || isWon(game)) return 'Invalid tournament.';
    }
    if ((tournament?.phase === TournamentPhase.playing) !== (game !== null))
      return 'Invalid tournament.';
    if (game && game.boardCode !== tournament?.matches[tournament.matchIndex]?.boardCode)
      return 'Invalid tournament.';
    return { setup, tournament, game };
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid tournament.';
  }
}
