import { isWon } from '../game.ts';
import { readTournamentGame } from './format-game-read.ts';
import { readPlayers, readRecordValues } from './format-record-read.ts';
import { TOURNAMENT_FORMAT, TOURNAMENT_MAX_BYTES, TOURNAMENT_VERSION } from './format.ts';
import type { PlayerCount, TournamentRound, TournamentState } from './model.ts';
import type { TournamentDraft } from './format.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from '../saved-format.ts';

const ROOT_KEYS = [
  'currentGame',
  'currentMatch',
  'currentRound',
  'currentTurn',
  'format',
  'playerCount',
  'players',
  'rounds',
  'status',
  'version',
] as const;
export type TournamentLoad =
  | { readonly kind: 'setup'; readonly draft: TournamentDraft }
  | { readonly kind: 'tournament'; readonly state: TournamentState };

export function readTournamentText(text: string): TournamentLoad | null {
  const value = isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? parseJson(text) : undefined;
  if (!isJsonObject(value) || !hasExactKeys(value, ROOT_KEYS)) return null;
  if (value.format !== TOURNAMENT_FORMAT || value.version !== TOURNAMENT_VERSION) return null;
  if (value.playerCount !== 4 && value.playerCount !== 8) return null;
  const count: PlayerCount = value.playerCount;
  if (value.status === 'setup') return readSetup(value, count);
  if (value.status !== 'playing' && value.status !== 'complete') return null;
  const record = readRecordValues(count, value.players, value.rounds, false);
  if (!record) return null;
  if (
    !isNonnegativeSafeInteger(value.currentRound) ||
    !isNonnegativeSafeInteger(value.currentMatch) ||
    (value.currentTurn !== 0 && value.currentTurn !== 1)
  )
    return null;
  const currentRound = value.currentRound;
  const currentMatch = value.currentMatch;
  const currentTurn: 0 | 1 = value.currentTurn;
  const status = value.status;
  const round = record.rounds[currentRound];
  const match = round?.matches[currentMatch];
  if (!round || !match || !validateProgress(record.rounds, currentRound, currentMatch)) return null;
  if (match.players[0] === null || match.players[1] === null) return null;
  const game = readTournamentGame(value.currentGame, match.boardCode);
  if (game === undefined || !validCurrentTurn(match.results, currentTurn, game)) return null;
  if (
    status === 'complete' &&
    (currentRound !== record.rounds.length - 1 ||
      currentMatch !== 0 ||
      currentTurn !== 1 ||
      !match.winnerSeed ||
      !game ||
      !isWon(game))
  )
    return null;
  return {
    kind: 'tournament',
    state: {
      ...record,
      currentGame: game,
      currentMatch,
      currentRound,
      currentTurn,
      status,
    },
  };
}

function readSetup(value: Record<string, unknown>, count: PlayerCount): TournamentLoad | null {
  const players = readPlayers(value.players, count, false);
  if (
    !players ||
    !Array.isArray(value.rounds) ||
    value.rounds.length !== 0 ||
    value.currentGame !== null ||
    value.currentRound !== 0 ||
    value.currentMatch !== 0 ||
    value.currentTurn !== 0
  )
    return null;
  return {
    kind: 'setup',
    draft: { playerCount: count, names: players.map((player) => player.name) },
  };
}

function validateProgress(
  rounds: readonly TournamentRound[],
  currentRound: number,
  currentMatch: number,
): boolean {
  return rounds.every((round, roundIndex) =>
    round.matches.every((match, matchIndex) => {
      const complete =
        match.winnerSeed !== null && match.results[0] !== null && match.results[1] !== null;
      const untouched =
        match.winnerSeed === null && match.results[0] === null && match.results[1] === null;
      if (roundIndex < currentRound) return complete;
      if (roundIndex > currentRound) return untouched;
      if (matchIndex < currentMatch) return complete;
      if (matchIndex > currentMatch) return untouched;
      return true;
    }),
  );
}

function validCurrentTurn(
  results: TournamentState['rounds'][number]['matches'][number]['results'],
  turn: 0 | 1,
  game: TournamentState['currentGame'],
): boolean {
  const result = results[turn];
  if (turn === 0 && results[1]) return false;
  if (turn === 1 && !results[0]) return false;
  if (!game) return result === null;
  const won = isWon(game);
  if (result === null) return !won;
  return won && result.moves === game.moves && Math.floor(result.elapsedMs) === game.elapsedMs;
}
