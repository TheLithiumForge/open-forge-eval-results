import { parseBoardCode } from '../deck.ts';

export type TournamentStage = 'Quarterfinal' | 'Semifinal' | 'Final';
export type TournamentPhase = 'ready' | 'playing' | 'turn-finished' | 'match-finished' | 'finished';
export interface TournamentPlayer {
  readonly seed: number;
  readonly name: string;
}
export interface TournamentResult {
  readonly seed: number;
  readonly moves: number;
  readonly elapsedMs: number;
}
export interface TournamentMatch {
  readonly round: number;
  readonly stage: TournamentStage;
  readonly boardCode: string;
  readonly players: readonly [number | null, number | null];
  readonly results: readonly [TournamentResult | null, TournamentResult | null];
  readonly winner: number | null;
}
export interface Tournament {
  readonly startedAt: number;
  readonly players: readonly TournamentPlayer[];
  readonly matches: readonly TournamentMatch[];
  readonly currentMatch: number;
  readonly turn: 0 | 1;
  readonly phase: TournamentPhase;
  readonly champion: number | null;
}

export function tournamentBoardSizes(count: number): number[] {
  return count === 4 ? [6, 6, 8] : count === 8 ? [4, 4, 4, 4, 6, 6, 8] : [];
}

export function normalizePlayerName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function playerNamesError(names: readonly string[]): string {
  if (
    names.some((name) => {
      const length = Array.from(normalizePlayerName(name)).length;
      return length < 2 || length > 20;
    })
  )
    return 'Use 2 to 20 characters.';
  const normalized = names.map((name) => normalizePlayerName(name).toLowerCase());
  return new Set(normalized).size === normalized.length ? '' : 'Each name must be different.';
}

function openingPairings(count: number): [number, number][] {
  return count === 4
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
}

export function createTournament(
  names: readonly string[],
  codes: readonly string[],
  startedAt: number,
): Tournament | null {
  if (
    (names.length !== 4 && names.length !== 8) ||
    codes.length !== tournamentBoardSizes(names.length).length ||
    !Number.isSafeInteger(startedAt) ||
    startedAt < 0
  )
    return null;
  const sizes = tournamentBoardSizes(names.length);
  if (codes.some((code, index) => parseBoardCode(code)?.size !== sizes[index])) return null;
  if (new Set(codes).size !== codes.length || playerNamesError(names)) return null;
  const players = names.map((raw, index) => ({ seed: index + 1, name: normalizePlayerName(raw) }));
  const pairings = openingPairings(names.length);
  const rounds = names.length === 4 ? [2, 1] : [4, 2, 1];
  let codeIndex = 0;
  const matches = rounds.flatMap((count, roundIndex) =>
    Array.from({ length: count }, (_, matchIndex): TournamentMatch => {
      const round = roundIndex + 1;
      const firstRound = round === 1 ? pairings[matchIndex] : undefined;
      const boardCode = codes[codeIndex++];
      if (!boardCode) throw new Error('Missing tournament deal.');
      return {
        round,
        stage:
          names.length === 8 && round === 1
            ? 'Quarterfinal'
            : round === (names.length === 4 ? 1 : 2)
              ? 'Semifinal'
              : 'Final',
        boardCode,
        players: [firstRound?.[0] ?? null, firstRound?.[1] ?? null],
        results: [null, null],
        winner: null,
      };
    }),
  );
  return {
    startedAt,
    players,
    matches,
    currentMatch: 0,
    turn: 0,
    phase: 'ready',
    champion: null,
  };
}

export function tournamentPlayer(
  tournament: Tournament,
  seed: number | null,
): TournamentPlayer | undefined {
  return seed === null ? undefined : tournament.players[seed - 1];
}

export function activeTournamentMatch(tournament: Tournament): TournamentMatch | undefined {
  return tournament.matches[tournament.currentMatch];
}

export function beginTournamentTurn(tournament: Tournament): Tournament {
  return tournament.phase === 'ready' ? { ...tournament, phase: 'playing' } : tournament;
}

export function nextTournamentTurn(tournament: Tournament): Tournament {
  return tournament.phase === 'turn-finished'
    ? { ...tournament, turn: 1, phase: 'ready' }
    : tournament;
}
