import { parseBoardCode } from '../deck.ts';
import { hasUniquePlayerNames, hasValidPlayerNames } from './names.ts';
import type { Round } from './types.ts';
import type { TournamentMatch, TournamentPlayer, TournamentState } from './types.ts';

export function roundPlan(playerCount: number): readonly Round[] {
  if (playerCount === 4) return ['Semifinal', 'Semifinal', 'Final'];
  if (playerCount === 8)
    return [
      'Quarterfinal',
      'Quarterfinal',
      'Quarterfinal',
      'Quarterfinal',
      'Semifinal',
      'Semifinal',
      'Final',
    ];
  return [];
}

export function stageSize(round: Round): number {
  if (round === 'Quarterfinal') return 4;
  if (round === 'Semifinal') return 6;
  return 8;
}

export function createTournament(
  players: readonly TournamentPlayer[],
  boardCodes: readonly string[],
  createdAt: string,
): TournamentState | null {
  const plan = roundPlan(players.length);
  if (
    !plan.length ||
    players.some((player, index) => player.seed !== index + 1) ||
    !hasValidPlayerNames(players.map((player) => player.name)) ||
    !hasUniquePlayerNames(players.map((player) => player.name)) ||
    boardCodes.length !== plan.length ||
    new Set(boardCodes).size !== boardCodes.length
  )
    return null;

  if (
    boardCodes.some((code, index) => {
      const parsed = parseBoardCode(code);
      return !parsed || parsed.size !== stageSize(plan[index] ?? 'Final');
    })
  )
    return null;
  const opening: readonly (readonly number[])[] =
    players.length === 4
      ? [
          [1, 4],
          [2, 3],
        ]
      : [
          [1, 8],
          [4, 5],
          [3, 6],
          [2, 7],
        ];
  const openingCount = opening.length;
  const matches: TournamentMatch[] = plan.map((round, index) => {
    const isOpening = index < openingCount;
    const pair = opening[index];
    const playersForMatch: [number | null, number | null] = isOpening
      ? [pair?.[0] ?? null, pair?.[1] ?? null]
      : [null, null];
    const playerSlot: 0 | 1 = index % 2 === 0 ? 0 : 1;
    const laterPlayerSlot: 0 | 1 = index === openingCount ? 0 : 1;
    const next =
      index === plan.length - 1
        ? null
        : index < openingCount
          ? {
              matchIndex: players.length === 4 ? 2 : 4 + Math.floor(index / 2),
              playerSlot,
            }
          : { matchIndex: plan.length - 1, playerSlot: laterPlayerSlot };
    return {
      boardCode: boardCodes[index] ?? '',
      next,
      players: playersForMatch,
      results: [null, null],
      round,
      winnerSeed: null,
    };
  });
  return {
    activePlayer: 0,
    championSeed: null,
    completedAt: null,
    createdAt,
    currentGame: null,
    currentMatchIndex: 0,
    matches,
    phase: 'ready',
    playerCount: players.length === 4 ? 4 : 8,
    players,
  };
}

export function beginTournamentTurn(tournament: TournamentState): TournamentState {
  if (tournament.phase !== 'ready' && tournament.phase !== 'betweenTurns') return tournament;
  return { ...tournament, currentGame: null, phase: 'playing' };
}

export function advanceTournamentMatch(tournament: TournamentState): TournamentState {
  if (tournament.phase !== 'betweenMatches') return tournament;
  return {
    ...tournament,
    activePlayer: 0,
    currentGame: null,
    currentMatchIndex: tournament.currentMatchIndex + 1,
    phase: 'ready',
  };
}
