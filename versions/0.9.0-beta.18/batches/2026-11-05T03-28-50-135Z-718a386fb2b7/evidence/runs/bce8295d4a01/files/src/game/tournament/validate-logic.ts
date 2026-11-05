import { decodeSnapshot } from '../snapshot.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { hasUniquePlayerNames, hasValidPlayerNames } from './names.ts';
import { createTournament, roundPlan, stageSize } from './rules.ts';
import { compareTournamentResults } from './results.ts';
import { isTimestamp } from './validation-helpers.ts';
import type { TournamentMatch, TournamentPlayer, TournamentState } from './types.ts';

export function validateTournamentLogic(
  state: TournamentState,
  players: readonly TournamentPlayer[],
  matches: readonly TournamentMatch[],
): string | null {
  const names = players.map((player) => player.name);
  if (
    players.length !== state.playerCount ||
    players.some((player, index) => player.seed !== index + 1) ||
    !hasValidPlayerNames(names) ||
    !hasUniquePlayerNames(names)
  )
    return 'Invalid tournament.';
  const base = createTournament(
    players,
    matches.map((match) => match.boardCode),
    state.createdAt,
  );
  if (!base || matches.length !== roundPlan(state.playerCount).length) return 'Invalid tournament.';
  const expected = base.matches.map((match): [number | null, number | null] => [
    match.players[0],
    match.players[1],
  ]);
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const template = base.matches[index];
    if (
      !match ||
      !template ||
      match.round !== template.round ||
      !sameNext(match.next, template.next)
    )
      return 'Invalid tournament.';
    if (match.players[0] !== expected[index]?.[0] || match.players[1] !== expected[index]?.[1])
      return 'Invalid tournament.';
    if (!validResults(match) || !validWinner(match)) return 'Invalid tournament.';
    if (match.winnerSeed !== null && match.next) {
      const target = expected[match.next.matchIndex];
      if (!target) return 'Invalid tournament.';
      target[match.next.playerSlot] = match.winnerSeed;
    }
  }
  return validatePhase(state);
}

function validResults(match: TournamentMatch): boolean {
  if (match.results[1] && !match.results[0]) return false;
  return match.results.every(
    (result) =>
      !result ||
      (Number.isSafeInteger(result.moves) &&
        result.moves >= stageSize(match.round) ** 2 / 2 &&
        result.moves <= MOVES_MAX &&
        Number.isFinite(result.elapsedMs) &&
        result.elapsedMs >= 0 &&
        result.elapsedMs <= ELAPSED_MAX_MS),
  );
}

function validWinner(match: TournamentMatch): boolean {
  const [first, second] = match.results;
  if (!first || !second) return match.winnerSeed === null;
  const [firstSeed, secondSeed] = match.players;
  if (firstSeed === null || secondSeed === null) return false;
  const winner =
    compareTournamentResults(first, firstSeed, second, secondSeed) <= 0 ? firstSeed : secondSeed;
  return match.winnerSeed === winner;
}

function validatePhase(state: TournamentState): string | null {
  const current = state.matches[state.currentMatchIndex];
  if (!current || state.currentMatchIndex < 0) return 'Invalid tournament.';
  if (state.matches.slice(0, state.currentMatchIndex).some((match) => match.winnerSeed === null))
    return 'Invalid tournament.';
  if (
    state.matches
      .slice(state.currentMatchIndex + 1)
      .some((match) => match.results.some(Boolean) || match.winnerSeed !== null)
  )
    return 'Invalid tournament.';
  if (state.phase === 'playing') return validPlayingState(state, current);
  if (state.currentGame !== null) return 'Invalid tournament.';
  if (state.phase === 'ready')
    return state.activePlayer === 0 && !current.results.some(Boolean) && noCompletion(state)
      ? null
      : 'Invalid tournament.';
  if (state.phase === 'betweenTurns')
    return state.activePlayer === 1 &&
      current.results[0] !== null &&
      current.results[1] === null &&
      noCompletion(state)
      ? null
      : 'Invalid tournament.';
  if (state.phase === 'betweenMatches')
    return state.activePlayer === 0 &&
      current.winnerSeed !== null &&
      state.currentMatchIndex < state.matches.length - 1 &&
      noCompletion(state)
      ? null
      : 'Invalid tournament.';
  const final = state.matches[state.matches.length - 1];
  return state.phase === 'complete' &&
    state.currentMatchIndex === state.matches.length - 1 &&
    state.activePlayer === 1 &&
    final?.winnerSeed === state.championSeed &&
    state.championSeed !== null &&
    isTimestamp(state.completedAt)
    ? null
    : 'Invalid tournament.';
}

function validPlayingState(state: TournamentState, current: TournamentMatch): string | null {
  const priorTurnDone =
    state.activePlayer === 0 ? current.results[0] === null : current.results[0] !== null;
  const game = typeof state.currentGame === 'string' ? decodeSnapshot(state.currentGame) : null;
  return priorTurnDone &&
    current.results[state.activePlayer] === null &&
    game?.boardCode === current.boardCode &&
    game.matched.length < game.deck.length &&
    noCompletion(state)
    ? null
    : 'Invalid tournament.';
}

function noCompletion(state: TournamentState): boolean {
  return state.championSeed === null && state.completedAt === null;
}

function sameNext(first: TournamentMatch['next'], second: TournamentMatch['next']): boolean {
  return first?.matchIndex === second?.matchIndex && first?.playerSlot === second?.playerSlot;
}
