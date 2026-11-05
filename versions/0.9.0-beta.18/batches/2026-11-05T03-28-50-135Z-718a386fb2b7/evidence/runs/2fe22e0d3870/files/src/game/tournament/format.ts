import { SelectionKind } from '../selection.ts';
import type { GameState } from '../game.ts';
import type { Selection } from '../selection.ts';
import type { TournamentState } from './model.ts';

export const TOURNAMENT_FORMAT = 'neon-pairs/tournament';
export const TOURNAMENT_VERSION = 1;
export const TOURNAMENT_MAX_BYTES = 65_536;

export interface TournamentDraft {
  readonly names: readonly string[];
  readonly playerCount: 4 | 8;
}

function gameValue(game: GameState) {
  const selection: Selection = game.selection;
  const savedSelection =
    selection.kind === SelectionKind.mismatch
      ? {
          first: selection.first,
          kind: selection.kind,
          remainingMs: Math.ceil(selection.remainingMs),
          second: selection.second,
        }
      : selection.kind === SelectionKind.one
        ? { index: selection.index, kind: selection.kind }
        : { kind: selection.kind };
  return {
    boardCode: game.boardCode,
    elapsedMs: Math.floor(game.elapsedMs),
    matched: [...game.matched].sort((left, right) => left - right),
    moves: game.moves,
    selection: savedSelection,
    started: game.started,
  };
}

function roundValues(state: TournamentState) {
  return state.rounds.map((round) => ({
    matches: round.matches.map((match) => ({
      boardCode: match.boardCode,
      players: match.players,
      results: match.results.map(
        (result) =>
          result && {
            elapsedMs: result.elapsedMs,
            moves: result.moves,
            playerSeed: result.playerSeed,
          },
      ),
      winnerSeed: match.winnerSeed,
    })),
    name: round.name,
    size: round.size,
  }));
}

export function encodeTournament(state: TournamentState | null, draft: TournamentDraft): string {
  const players =
    state?.players ??
    draft.names.slice(0, draft.playerCount).map((name, index) => ({
      name,
      seed: index + 1,
    }));
  return JSON.stringify(
    {
      currentGame: state?.currentGame ? gameValue(state.currentGame) : null,
      currentMatch: state?.currentMatch ?? 0,
      currentRound: state?.currentRound ?? 0,
      currentTurn: state?.currentTurn ?? 0,
      format: TOURNAMENT_FORMAT,
      playerCount: state?.playerCount ?? draft.playerCount,
      players,
      rounds: state ? roundValues(state) : [],
      status: state?.status ?? 'setup',
      version: TOURNAMENT_VERSION,
    },
    null,
    2,
  );
}
