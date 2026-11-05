import { createGame } from '../game.ts';
import { parseBoardCode } from '../deck.ts';
import type {
  MatchPlayers,
  PlayerCount,
  RoundName,
  TournamentMatch,
  TournamentRound,
  TournamentState,
  TournamentPlayer,
} from './model.ts';

const OPENING: Record<PlayerCount, readonly (readonly [number, number])[]> = {
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
};

export function roundSizes(count: PlayerCount): readonly number[] {
  return count === 4 ? [6, 8] : [4, 6, 8];
}

export function roundName(count: PlayerCount, index: number): RoundName {
  return (
    (count === 4 ? ['Semifinal', 'Final'] : ['Quarterfinal', 'Semifinal', 'Final'])[index] ??
    'Final'
  );
}

export function openingPairings(count: PlayerCount): readonly MatchPlayers[] {
  return OPENING[count];
}

export function createTournament(
  names: readonly string[],
  codes: readonly string[],
): TournamentState | null {
  if (names.length !== 4 && names.length !== 8) return null;
  const playerCount: PlayerCount = names.length === 4 ? 4 : 8;
  const sizes = roundSizes(playerCount);
  const matchCounts = sizes.map((_, index) => playerCount / 2 ** (index + 1));
  if (codes.length !== matchCounts.reduce((sum, count) => sum + count, 0)) return null;
  const used = new Set<string>();
  let codeIndex = 0;
  const rounds = sizes.map((size, roundIndex) => {
    const count = matchCounts[roundIndex] ?? 0;
    const matches = Array.from({ length: count }, (_, index) => {
      const code = codes[codeIndex++];
      const parsed = code ? parseBoardCode(code) : null;
      if (!code || !parsed || parsed.size !== size || used.has(code)) return null;
      used.add(code);
      const players: MatchPlayers =
        roundIndex === 0 ? (OPENING[playerCount][index] ?? [null, null]) : [null, null];
      return { boardCode: code, players, results: [null, null] as const, winnerSeed: null };
    });
    if (matches.some((match) => match === null)) return null;
    return {
      matches: matches.filter((match): match is TournamentMatch => match !== null),
      name: roundName(playerCount, roundIndex),
      size,
    };
  });
  if (rounds.some((round) => round === null)) return null;
  return {
    playerCount,
    players: names.map((name, index) => ({ name, seed: index + 1 })),
    rounds: rounds.filter((round): round is TournamentRound => round !== null),
    currentRound: 0,
    currentMatch: 0,
    currentTurn: 0,
    currentGame: null,
    status: 'playing',
  };
}

export function currentMatch(state: TournamentState): TournamentMatch {
  const match =
    state.rounds[state.currentRound]?.matches[state.currentMatch] ?? state.rounds[0]?.matches[0];
  if (!match) throw new Error('Tournament has no current match.');
  return match;
}

export function currentPlayer(state: TournamentState): TournamentPlayer | null {
  const seed = currentMatch(state).players[state.currentTurn];
  return seed === null ? null : (state.players[seed - 1] ?? null);
}

export function championSeed(state: TournamentState): number | null {
  return state.status === 'complete' ? (state.rounds.at(-1)?.matches[0]?.winnerSeed ?? null) : null;
}
