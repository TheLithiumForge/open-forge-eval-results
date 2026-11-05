import type { TournamentMatch, TournamentState } from './model.ts';

const OPENING = {
  4: [
    [1, 4],
    [2, 3],
  ],
  8: [
    [1, 8],
    [4, 5],
    [3, 6],
    [2, 7],
  ],
} as const;

export function tournamentRound(count: number, index: number) {
  if (count === 8 && index < 4) return { name: 'Quarterfinal', size: 4 };
  if (index < count - 2) return { name: 'Semifinal', size: 6 };
  return { name: 'Final', size: 8 };
}

export function matchPlayers(state: TournamentState, index: number): readonly number[] {
  const count = state.names.length;
  const opening = count === 8 ? OPENING[8] : OPENING[4];
  if (index < opening.length) return opening[index] ?? [];
  const previous = (index - opening.length) * 2;
  return [matchWinner(state, previous), matchWinner(state, previous + 1)].filter(
    (seed): seed is number => seed !== null,
  );
}

function winningPosition(match: TournamentMatch, players: readonly number[]): number | null {
  const [first, second] = match.results;
  if (!first || !second || players.length !== 2) return null;
  const difference = first.moves - second.moves || first.elapsedMs - second.elapsedMs;
  return difference === 0
    ? (players[0] ?? 0) < (players[1] ?? 0)
      ? 0
      : 1
    : difference < 0
      ? 0
      : 1;
}

export function matchWinner(state: TournamentState, index: number): number | null {
  const match = state.matches[index];
  if (!match) return null;
  const players = matchPlayers(state, index);
  const position = winningPosition(match, players);
  return position === null ? null : (players[position] ?? null);
}

export function currentMatchIndex(state: TournamentState): number {
  const pending = state.matches.findIndex((match) => match.results.length < 2);
  if (pending < 0) return state.matches.length - 1;
  return state.phase === 'matchEnd' ? pending - 1 : pending;
}

export function currentPlayerName(state: TournamentState): string {
  const index = currentMatchIndex(state);
  const match = state.matches[index];
  const position =
    state.phase === 'turnEnd' ? 0 : state.phase === 'matchEnd' ? 1 : match?.results.length;
  const seed = matchPlayers(state, index)[position ?? 0];
  return state.names[(seed ?? 1) - 1] ?? '';
}
