import { parseBoardCode } from '../deck.ts';
import { tournamentWinner } from './result-validation.ts';

export type RoundName = 'Quarterfinal' | 'Semifinal' | 'Final';
type TournamentPhase = 'ready' | 'playing' | 'next-turn' | 'next-match' | 'complete';

export interface TournamentPlayer {
  readonly name: string;
  readonly seed: number;
}

export interface TournamentResult {
  readonly elapsedMs: number;
  readonly moves: number;
}

export interface TournamentMatch {
  readonly boardCode: string;
  readonly players: readonly [number | null, number | null];
  readonly results: readonly [TournamentResult | null, TournamentResult | null];
  readonly round: RoundName;
  readonly winnerSeed: number | null;
}

export interface TournamentRecord {
  readonly championSeed: number;
  readonly matches: readonly TournamentMatch[];
  readonly players: readonly TournamentPlayer[];
}

export interface Tournament {
  readonly championSeed: number | null;
  readonly currentMatch: number;
  readonly currentTurn: 0 | 1;
  readonly matches: readonly TournamentMatch[];
  readonly players: readonly TournamentPlayer[];
  readonly phase: TournamentPhase;
}

interface RoundDefinition {
  readonly count: number;
  readonly name: RoundName;
  readonly size: number;
}

const OPENING_PAIRINGS: Readonly<Record<4 | 8, readonly (readonly [number, number])[]>> = {
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

export function openingPairings(playerCount: 4 | 8): readonly (readonly [number, number])[] {
  return OPENING_PAIRINGS[playerCount];
}

export function roundPlan(playerCount: 4 | 8): readonly RoundDefinition[] {
  return playerCount === 4
    ? [
        { name: 'Semifinal', size: 6, count: 2 },
        { name: 'Final', size: 8, count: 1 },
      ]
    : [
        { name: 'Quarterfinal', size: 4, count: 4 },
        { name: 'Semifinal', size: 6, count: 2 },
        { name: 'Final', size: 8, count: 1 },
      ];
}

export function createTournament(names: readonly string[], codes: readonly string[]): Tournament {
  if (names.length !== 4 && names.length !== 8) throw new Error('Invalid tournament size.');
  const plan = roundPlan(names.length);
  const expectedCodes = plan.reduce((total, round) => total + round.count, 0);
  if (codes.length !== expectedCodes || new Set(codes).size !== codes.length)
    throw new Error('Invalid tournament deals.');
  const players = names.map((name, index) => ({ name, seed: index + 1 }));
  const matches: TournamentMatch[] = [];
  const opening = OPENING_PAIRINGS[names.length as 4 | 8];
  let codeIndex = 0;
  for (const [roundIndex, round] of plan.entries()) {
    for (let matchIndex = 0; matchIndex < round.count; matchIndex += 1) {
      const boardCode = codes[codeIndex++];
      const parsed = boardCode ? parseBoardCode(boardCode) : null;
      if (!parsed || parsed.size !== round.size) throw new Error('Invalid tournament deal size.');
      const pair = roundIndex === 0 ? opening[matchIndex] : undefined;
      matches.push({
        boardCode,
        players: pair ? [pair[0], pair[1]] : [null, null],
        results: [null, null],
        round: round.name,
        winnerSeed: null,
      });
    }
  }
  return { championSeed: null, currentMatch: 0, currentTurn: 0, matches, phase: 'ready', players };
}

export function startTournamentTurn(tournament: Tournament): Tournament {
  return tournament.phase === 'ready' ? { ...tournament, phase: 'playing' } : tournament;
}

export function recordTournamentResult(
  tournament: Tournament,
  result: TournamentResult,
): Tournament {
  if (tournament.phase !== 'playing') return tournament;
  const match = tournament.matches[tournament.currentMatch];
  if (!match || match.results[tournament.currentTurn]) return tournament;
  const results: [TournamentResult | null, TournamentResult | null] = [...match.results];
  results[tournament.currentTurn] = result;
  let winnerSeed: number | null = null;
  let phase: TournamentPhase = 'next-turn';
  let championSeed = tournament.championSeed;
  if (tournament.currentTurn === 1) {
    const firstSeed = match.players[0];
    const secondSeed = match.players[1];
    const firstResult = results[0];
    const secondResult = results[1];
    if (firstSeed === null || secondSeed === null || !firstResult || !secondResult)
      return tournament;
    winnerSeed = tournamentWinner([firstSeed, secondSeed], [firstResult, secondResult]);
    if (tournament.currentMatch === tournament.matches.length - 1) {
      championSeed = winnerSeed;
      phase = 'complete';
    } else phase = 'next-match';
  }
  const matches = tournament.matches.map((item, index) =>
    index === tournament.currentMatch ? { ...item, results, winnerSeed } : item,
  );
  return { ...tournament, championSeed, matches, phase };
}

export function nextTournamentTurn(tournament: Tournament): Tournament {
  return tournament.phase === 'next-turn'
    ? { ...tournament, currentTurn: 1, phase: 'ready' }
    : tournament;
}

export function nextTournamentMatch(tournament: Tournament): Tournament {
  if (tournament.phase !== 'next-match') return tournament;
  const nextIndex = tournament.currentMatch + 1;
  const next = tournament.matches[nextIndex];
  if (!next) return tournament;
  let players = next.players;
  const plan = roundPlan(tournament.players.length as 4 | 8);
  const nextRoundIndex = plan.findIndex((round) => round.name === next.round);
  if (nextRoundIndex < 0) return tournament;
  if (nextRoundIndex > 0) {
    const priorRoundStart = plan
      .slice(0, nextRoundIndex - 1)
      .reduce((sum, round) => sum + round.count, 0);
    const nextRoundStart = plan
      .slice(0, nextRoundIndex)
      .reduce((sum, round) => sum + round.count, 0);
    const withinRoundIndex = nextIndex - nextRoundStart;
    const sourceIndex = priorRoundStart + withinRoundIndex * 2;
    const sourceOne = tournament.matches[sourceIndex];
    const sourceTwo = tournament.matches[sourceIndex + 1];
    if (!sourceOne?.winnerSeed || !sourceTwo?.winnerSeed) return tournament;
    players = [sourceOne.winnerSeed, sourceTwo.winnerSeed];
  }
  const matches = tournament.matches.map((item, index) =>
    index === nextIndex ? { ...item, players } : item,
  );
  return { ...tournament, currentMatch: nextIndex, currentTurn: 0, matches, phase: 'ready' };
}

export function completedTournament(tournament: Tournament): TournamentRecord | null {
  return tournament.phase === 'complete' && tournament.championSeed !== null
    ? {
        championSeed: tournament.championSeed,
        matches: tournament.matches,
        players: tournament.players,
      }
    : null;
}
