import { parseBoardCode } from '../deck.ts';
import { createGame } from '../game.ts';
import type { TournamentMatch, TournamentState } from './model.ts';

interface RoundSpec {
  readonly name: 'Quarterfinal' | 'Semifinal' | 'Final';
  readonly size: number;
  readonly matchCount: number;
}

const MATCHUPS: Readonly<Record<4 | 8, readonly (readonly [number, number])[]>> = {
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

function roundSpecs(playerCount: 4 | 8): readonly RoundSpec[] {
  return playerCount === 4
    ? [
        { name: 'Semifinal', size: 6, matchCount: 2 },
        { name: 'Final', size: 8, matchCount: 1 },
      ]
    : [
        { name: 'Quarterfinal', size: 4, matchCount: 4 },
        { name: 'Semifinal', size: 6, matchCount: 2 },
        { name: 'Final', size: 8, matchCount: 1 },
      ];
}

export function tournamentRoundPlan(playerCount: 4 | 8): readonly RoundSpec[] {
  return roundSpecs(playerCount);
}

export function openingPairings(playerCount: 4 | 8): readonly (readonly [number, number])[] {
  return MATCHUPS[playerCount];
}

export function tournamentBoardSizes(playerCount: 4 | 8): readonly number[] {
  return roundSpecs(playerCount).flatMap(({ size, matchCount }) =>
    Array.from({ length: matchCount }, () => size),
  );
}

export function normalizePlayerName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function validatePlayerNames(
  drafts: readonly string[],
  playerCount: 4 | 8,
):
  | { readonly valid: true; readonly names: readonly string[] }
  | { readonly valid: false; readonly message: string } {
  const names = Array.from({ length: playerCount }, (_, index) =>
    normalizePlayerName(drafts[index] ?? ''),
  );
  if (names.some((name) => [...name].length < 2 || [...name].length > 20))
    return { valid: false, message: 'Use 2 to 20 characters.' };
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length)
    return { valid: false, message: 'Each name must be different.' };
  return { valid: true, names };
}

function emptyMatch(
  boardCode: string,
  players: readonly [number | null, number | null],
): TournamentMatch {
  return { boardCode, players, results: [null, null], winnerSeed: null };
}

export function createTournament(
  names: readonly string[],
  boardCodes: readonly string[],
  startedAtMs: number,
): TournamentState {
  if (
    (names.length !== 4 && names.length !== 8) ||
    !Number.isSafeInteger(startedAtMs) ||
    startedAtMs < 0
  )
    throw new Error('Invalid tournament setup.');
  const playerCount = names.length === 4 ? 4 : 8;
  const specs = roundSpecs(playerCount);
  const expectedCodes = specs.reduce((total, spec) => total + spec.matchCount, 0);
  if (boardCodes.length !== expectedCodes || new Set(boardCodes).size !== boardCodes.length)
    throw new Error('Tournament deals must be unique.');
  let codeIndex = 0;
  const rounds = specs.map((spec, roundIndex) => {
    const matches = Array.from({ length: spec.matchCount }, (_, matchIndex) => {
      const code = boardCodes[codeIndex++];
      const parsed = code === undefined ? null : parseBoardCode(code);
      if (!code || !parsed || parsed.size !== spec.size)
        throw new Error('Invalid tournament deal.');
      const players: readonly [number | null, number | null] =
        roundIndex === 0 ? (MATCHUPS[playerCount][matchIndex] ?? [null, null]) : [null, null];
      return emptyMatch(code, players);
    });
    return { name: spec.name, size: spec.size, matches };
  });
  const players = names.map((name, index) => ({ seed: index + 1, name }));
  const firstMatch = rounds[0]?.matches[0];
  if (!firstMatch) throw new Error('Invalid tournament bracket.');
  return {
    startedAtMs,
    completedAtMs: null,
    players,
    rounds,
    currentRound: 0,
    currentMatch: 0,
    currentTurn: 0,
    phase: 'ready',
    championSeed: null,
    game: createGame(firstMatch.boardCode),
    generation: 0,
    paused: true,
  };
}
