import { parseBoardCode } from '../deck.ts';
import type { PlayerCount, Tournament, TournamentMatch } from './rules.ts';

interface RoundPlan {
  readonly matches: number;
  readonly name: Tournament['rounds'][number]['name'];
  readonly size: number;
}

function roundPlan(count: PlayerCount): readonly RoundPlan[] {
  return count === 4
    ? [
        { name: 'Semifinal', size: 6, matches: 2 },
        { name: 'Final', size: 8, matches: 1 },
      ]
    : [
        { name: 'Quarterfinal', size: 4, matches: 4 },
        { name: 'Semifinal', size: 6, matches: 2 },
        { name: 'Final', size: 8, matches: 1 },
      ];
}

export function tournamentDealSizes(count: PlayerCount): readonly number[] {
  return roundPlan(count).flatMap(({ matches, size }) =>
    Array.from({ length: matches }, () => size),
  );
}

function openingPairings(count: PlayerCount): readonly (readonly [number, number])[] {
  return count === 4
    ? [
        [0, 3],
        [1, 2],
      ]
    : [
        [0, 7],
        [3, 4],
        [2, 5],
        [1, 6],
      ];
}

export function createTournament(
  players: readonly string[],
  boardCodes: readonly string[],
): Tournament | null {
  if (players.length !== 4 && players.length !== 8) return null;
  const playerCount: PlayerCount = players.length === 4 ? 4 : 8;
  const plan = roundPlan(playerCount);
  const sizes = tournamentDealSizes(playerCount);
  if (boardCodes.length !== sizes.length) return null;
  const used = new Set<string>();
  if (
    boardCodes.some((code, index) => {
      const parsed = parseBoardCode(code);
      if (!parsed || parsed.size !== sizes[index] || used.has(code)) return true;
      used.add(code);
      return false;
    })
  )
    return null;
  let codeIndex = 0;
  const rounds = plan.map(({ name, size, matches }, roundIndex) => ({
    name,
    size,
    matches: Array.from({ length: matches }, (_, matchIndex): TournamentMatch => {
      const boardCode = boardCodes[codeIndex++] ?? '';
      const pairing = roundIndex === 0 ? openingPairings(playerCount)[matchIndex] : undefined;
      return {
        boardCode,
        players: pairing
          ? [players[pairing[0]] ?? null, players[pairing[1]] ?? null]
          : [null, null],
        results: [null, null],
        winner: null,
      };
    }),
  }));
  return {
    matchIndex: 0,
    playerCount,
    playerIndex: 0,
    phase: 'ready',
    players,
    roundIndex: 0,
    rounds,
  };
}
