import { decodeSnapshot, SNAPSHOT_VERSION } from '../snapshot.ts';
import { isWithinBytes, hasExactKeys, isJsonObject, parseJson } from '../saved-format.ts';
import { SelectionKind } from '../selection.ts';
import { readSetup, readTournament } from './format-validation.ts';
import { normalizePlayerName } from './names.ts';
import type { TournamentSetup } from './format-validation.ts';
import type { GameState } from '../game.ts';
import type { Tournament } from './rules.ts';

const FORMAT = 'neon-pairs/tournament';
const VERSION = 1;
const MAX_BYTES = 65_536;

export interface TournamentTransfer {
  readonly game: GameState | null;
  readonly setup: TournamentSetup;
  readonly tournament: Tournament | null;
}

function selectionRecord(game: GameState) {
  switch (game.selection.kind) {
    case SelectionKind.closed:
      return { kind: SelectionKind.closed };
    case SelectionKind.one:
      return { index: game.selection.index, kind: SelectionKind.one };
    case SelectionKind.mismatch:
      return {
        first: game.selection.first,
        kind: SelectionKind.mismatch,
        remainingMs: Math.ceil(game.selection.remainingMs),
        second: game.selection.second,
      };
  }
}

function gameRecord(game: GameState | null) {
  if (!game) return null;
  return {
    boardCode: game.boardCode,
    elapsedMs: Math.floor(game.elapsedMs),
    matched: [...game.matched].sort((a, b) => a - b),
    moves: game.moves,
    selection: selectionRecord(game),
    started: game.started,
    version: SNAPSHOT_VERSION,
  };
}

function tournamentRecord(tournament: Tournament | null) {
  if (!tournament) return null;
  return {
    matchIndex: tournament.matchIndex,
    playerCount: tournament.playerCount,
    playerIndex: tournament.playerIndex,
    phase: tournament.phase,
    players: [...tournament.players],
    roundIndex: tournament.roundIndex,
    rounds: tournament.rounds.map((round) => ({
      matches: round.matches.map((match) => ({
        boardCode: match.boardCode,
        players: [...match.players],
        results: match.results.map((result) =>
          result
            ? {
                elapsedMs: result.elapsedMs,
                moves: result.moves,
                name: result.name,
              }
            : null,
        ),
        winner: match.winner,
      })),
      name: round.name,
      size: round.size,
    })),
  };
}

export function encodeTournamentTransfer(
  setup: TournamentSetup,
  tournament: Tournament | null,
  game: GameState | null,
): string | null {
  const text = JSON.stringify(
    {
      format: FORMAT,
      game: gameRecord(game),
      setup: { playerCount: setup.playerCount, players: [...setup.players] },
      tournament: tournamentRecord(tournament),
      version: VERSION,
    },
    null,
    2,
  );
  return isWithinBytes(text, MAX_BYTES) ? text : null;
}

export function decodeTournamentTransfer(text: string): TournamentTransfer | null {
  const value = isWithinBytes(text, MAX_BYTES) ? parseJson(text) : undefined;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['format', 'game', 'setup', 'tournament', 'version']) ||
    value.format !== FORMAT ||
    value.version !== VERSION
  )
    return null;
  const setup = readSetup(value.setup);
  if (!setup) return null;
  const game =
    value.game === null
      ? null
      : isJsonObject(value.game)
        ? decodeSnapshot(JSON.stringify(value.game))
        : null;
  if (value.game !== null && !game) return null;
  const tournament = value.tournament === null ? null : readTournament(value.tournament, game);
  if (value.tournament !== null && !tournament) return null;
  if (!tournament && game) return null;
  if (tournament) {
    const names = setup.players.slice(0, setup.playerCount).map(normalizePlayerName);
    if (
      setup.playerCount !== tournament.playerCount ||
      names.some((name, index) => name !== tournament.players[index])
    )
      return null;
  }
  return { setup, tournament, game };
}
