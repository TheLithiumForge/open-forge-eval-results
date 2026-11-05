import { decodeSnapshot } from '../snapshot.ts';
import { isWon } from '../game.ts';
import { SelectionKind } from '../selection.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { readTournamentPlayers, readTournamentRounds } from './validation.ts';
import type { GameState } from '../game.ts';
import type { TournamentPhase, TournamentState } from './model.ts';

function isTournamentPhase(value: unknown): value is TournamentPhase {
  return value === 'ready' || value === 'playing' || value === 'nextTurn' || value === 'nextMatch';
}

function isInitialGame(game: GameState): boolean {
  return (
    !game.started &&
    game.moves === 0 &&
    game.elapsedMs === 0 &&
    game.matched.length === 0 &&
    game.selection.kind === SelectionKind.closed
  );
}

function matchesEarlierRounds(
  rounds: NonNullable<ReturnType<typeof readTournamentRounds>>,
  currentRound: number,
  currentMatch: number,
): boolean {
  return rounds.every((round, roundIndex) =>
    round.matches.every((match, matchIndex) => {
      const finished =
        roundIndex < currentRound || (roundIndex === currentRound && matchIndex < currentMatch);
      const future =
        roundIndex > currentRound || (roundIndex === currentRound && matchIndex > currentMatch);
      if (finished) return match.winnerSeed !== null;
      if (future)
        return match.winnerSeed === null && match.results[0] === null && match.results[1] === null;
      return true;
    }),
  );
}

export function readActiveTournament(value: unknown): TournamentState | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, [
      'version',
      'status',
      'startedAtMs',
      'players',
      'rounds',
      'current',
      'gameSnapshot',
    ]) ||
    value.version !== 1 ||
    value.status !== 'active' ||
    !isNonnegativeSafeInteger(value.startedAtMs) ||
    typeof value.gameSnapshot !== 'string' ||
    !isJsonObject(value.current) ||
    !hasExactKeys(value.current, ['roundIndex', 'matchIndex', 'turnIndex', 'phase'])
  )
    return null;
  const players = readTournamentPlayers(value.players);
  if (!players) return null;
  const playerCount = players.length === 4 ? 4 : 8;
  const rounds = readTournamentRounds(value.rounds, playerCount);
  const game = decodeSnapshot(value.gameSnapshot);
  const currentRound = value.current.roundIndex;
  const currentMatch = value.current.matchIndex;
  const currentTurn = value.current.turnIndex;
  const phase = value.current.phase;
  if (
    !rounds ||
    !game ||
    !isNonnegativeSafeInteger(currentRound) ||
    !isNonnegativeSafeInteger(currentMatch) ||
    (currentTurn !== 0 && currentTurn !== 1) ||
    !isTournamentPhase(phase) ||
    currentRound >= rounds.length ||
    currentMatch >= (rounds[currentRound]?.matches.length ?? 0) ||
    !matchesEarlierRounds(rounds, currentRound, currentMatch)
  )
    return null;
  const match = rounds[currentRound]?.matches[currentMatch];
  const playerSeed = match?.players[currentTurn];
  if (
    !match ||
    playerSeed === null ||
    playerSeed === undefined ||
    game.boardCode !== match.boardCode
  )
    return null;
  const firstResult = match.results[0];
  const secondResult = match.results[1];
  const currentResult = currentTurn === 0 ? firstResult : secondResult;
  if (currentTurn === 1 && firstResult === null) return null;
  if (phase === 'ready') {
    if (
      currentResult !== null ||
      (currentTurn === 1 && firstResult === null) ||
      !isInitialGame(game)
    )
      return null;
  } else if (phase === 'playing') {
    if (currentResult !== null || isWon(game)) return null;
  } else if (phase === 'nextTurn') {
    if (
      currentTurn !== 0 ||
      firstResult === null ||
      secondResult !== null ||
      match.winnerSeed !== null ||
      game.matched.length !== game.deck.length ||
      firstResult.moves !== game.moves ||
      Math.floor(firstResult.elapsedMs) !== Math.floor(game.elapsedMs)
    )
      return null;
  } else if (
    currentTurn !== 1 ||
    firstResult === null ||
    secondResult === null ||
    match.winnerSeed === null ||
    game.matched.length !== game.deck.length ||
    secondResult.moves !== game.moves ||
    Math.floor(secondResult.elapsedMs) !== Math.floor(game.elapsedMs)
  ) {
    return null;
  }
  return {
    startedAtMs: value.startedAtMs,
    completedAtMs: null,
    players,
    rounds,
    currentRound,
    currentMatch,
    currentTurn,
    phase,
    championSeed: null,
    game,
    generation: 0,
    paused: phase !== 'playing',
  };
}
