import { ELAPSED_MAX_MS, isWon } from '../game.ts';
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_KEYS } from '../snapshot.ts';
import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { currentMatch } from './rules.ts';
import { decodeTournamentRecord } from './validate.ts';
import type { GameState } from '../game.ts';
import type {
  Tournament,
  TournamentMatch,
  TournamentPlayer,
  TournamentResult,
  TournamentRound,
} from './model.ts';

const TOURNAMENT_MAX_BYTES = 65_536;

interface TournamentDocument {
  readonly tournament: Tournament;
  readonly turnGame: GameState | null;
  readonly turnStarted: boolean;
}

export interface TournamentDocumentRead {
  readonly document: TournamentDocument | null;
  readonly error: string | null;
}

function playerData(player: TournamentPlayer | null): unknown {
  return player ? { name: player.name, seed: player.seed } : null;
}

function resultData(result: TournamentResult | null): unknown {
  return result ? { elapsedMs: result.elapsedMs, moves: result.moves } : null;
}

function matchData(match: TournamentMatch): unknown {
  return {
    boardCode: match.boardCode,
    id: match.id,
    players: [playerData(match.players[0]), playerData(match.players[1])],
    results: [resultData(match.results[0]), resultData(match.results[1])],
    winner: playerData(match.winner),
  };
}

function roundData(round: TournamentRound): unknown {
  return { matches: round.matches.map(matchData), name: round.name, size: round.size };
}

function tournamentRecordData(tournament: Tournament): unknown {
  return {
    champion: playerData(tournament.champion),
    id: tournament.id,
    matchIndex: tournament.matchIndex,
    playerCount: tournament.playerCount,
    playerIndex: tournament.playerIndex,
    players: tournament.players.map(playerData),
    roundIndex: tournament.roundIndex,
    rounds: tournament.rounds.map(roundData),
    status: tournament.status,
  };
}

export function encodeTournamentJson(
  tournament: Tournament,
  turnGame: GameState | null,
  turnStarted: boolean,
): string {
  return JSON.stringify(
    {
      format: 'neon-pairs/tournament',
      tournament: tournamentRecordData(tournament),
      turn: {
        elapsedMs: turnGame ? turnGame.elapsedMs : null,
        game: turnGame ? encodeSnapshot(turnGame) : null,
        started: turnStarted,
      },
      version: 1,
    },
    null,
    2,
  );
}

function object(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (!isJsonObject(value)) return null;
  for (const key of Object.keys(value))
    if (!keys.includes(key)) throw new Error(`Unknown field: ${key}.`);
  return hasExactKeys(value, keys) ? value : null;
}

export function decodeTournamentJson(text: string): TournamentDocumentRead {
  if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES))
    return { document: null, error: 'Invalid tournament JSON.' };
  const parsed = parseJson(text);
  try {
    const root = object(parsed, ['format', 'tournament', 'turn', 'version']);
    if (!root || root.format !== 'neon-pairs/tournament' || root.version !== 1)
      return { document: null, error: 'Invalid tournament JSON.' };
    const record = decodeTournamentRecord(root.tournament);
    if (!record.tournament) return { document: null, error: record.error };
    const turn = object(root.turn, ['elapsedMs', 'game', 'started']);
    if (!turn || typeof turn.started !== 'boolean')
      return { document: null, error: 'Invalid tournament JSON.' };
    if (turn.game === null) {
      if (turn.elapsedMs !== null || turn.started)
        return { document: null, error: 'Invalid tournament JSON.' };
      return {
        document: { tournament: record.tournament, turnGame: null, turnStarted: false },
        error: null,
      };
    }
    if (typeof turn.game !== 'string' || typeof turn.elapsedMs !== 'number')
      return { document: null, error: 'Invalid tournament JSON.' };
    if (
      !turn.started ||
      !Number.isFinite(turn.elapsedMs) ||
      turn.elapsedMs < 0 ||
      turn.elapsedMs > ELAPSED_MAX_MS
    )
      return { document: null, error: 'Invalid tournament JSON.' };
    const snapshotValue = parseJson(turn.game);
    if (isJsonObject(snapshotValue)) {
      const unknown = Object.keys(snapshotValue).find(
        (key) => !SNAPSHOT_KEYS.some((knownKey) => knownKey === key),
      );
      if (unknown) return { document: null, error: `Unknown field: ${unknown}.` };
    }
    const game = decodeSnapshot(turn.game);
    const match = currentMatch(record.tournament);
    if (
      !game ||
      !match ||
      game.boardCode !== match.boardCode ||
      Math.floor(game.elapsedMs) !== Math.floor(turn.elapsedMs)
    )
      return { document: null, error: 'Invalid tournament JSON.' };
    const turnResult = match.results[record.tournament.playerIndex];
    if (isWon(game)) {
      if (!turnResult || turnResult.moves !== game.moves || turnResult.elapsedMs !== turn.elapsedMs)
        return { document: null, error: 'Invalid tournament JSON.' };
    } else if (turnResult) return { document: null, error: 'Invalid tournament JSON.' };
    return {
      document: {
        tournament: record.tournament,
        turnGame: { ...game, elapsedMs: turn.elapsedMs },
        turnStarted: true,
      },
      error: null,
    };
  } catch (error) {
    return {
      document: null,
      error: error instanceof Error ? error.message : 'Invalid tournament JSON.',
    };
  }
}
