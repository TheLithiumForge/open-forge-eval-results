import { parseBoardCode } from '../deck.ts';

export const TOURNAMENT_PLAYER_COUNTS = [4, 8] as const;
export type TournamentPlayerCount = (typeof TOURNAMENT_PLAYER_COUNTS)[number];

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
  readonly players: readonly [TournamentPlayer | null, TournamentPlayer | null];
  readonly results: readonly [TournamentResult | null, TournamentResult | null];
  readonly winner: TournamentPlayer | null;
}

export interface TournamentRound {
  readonly matches: readonly TournamentMatch[];
  readonly name: 'Quarterfinal' | 'Semifinal' | 'Final';
  readonly size: number;
}

export interface TournamentPosition {
  readonly match: number;
  readonly round: number;
  readonly turn: 0 | 1;
}

export interface Tournament {
  readonly champion: TournamentPlayer | null;
  readonly current: TournamentPosition | null;
  readonly entrants: readonly TournamentPlayer[];
  readonly playerCount: TournamentPlayerCount;
  readonly rounds: readonly TournamentRound[];
  readonly status: 'active' | 'complete';
}

export interface TournamentDraft {
  readonly playerCount: TournamentPlayerCount;
  readonly players: readonly string[];
}

export type NameAcceptance =
  | { readonly error: 'Use 2 to 20 characters.' }
  | { readonly names: readonly string[] };

export interface RoundDefinition {
  readonly matchCount: number;
  readonly name: TournamentRound['name'];
  readonly size: number;
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

export function acceptPlayerNames(drafts: readonly string[], count: number): NameAcceptance {
  if (!isPlayerCount(count) || drafts.length < count) return { error: 'Use 2 to 20 characters.' };
  const names = drafts.slice(0, count).map(normalizeName);
  if (names.some((name) => {
    const length = Array.from(name).length;
    return length < 2 || length > 20;
  }))
    return { error: 'Use 2 to 20 characters.' };
  const folded = names.map((name) => name.toLowerCase());
  if (new Set(folded).size !== folded.length) return { error: 'Each name must be different.' };
  return { names };
}

export function isPlayerCount(value: number): value is TournamentPlayerCount {
  return value === 4 || value === 8;
}

export function roundDefinitions(count: TournamentPlayerCount): readonly RoundDefinition[] {
  return count === 4
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

export function openingSeedPairs(count: TournamentPlayerCount): readonly (readonly [number, number])[] {
  return count === 4 ? [[1, 4], [2, 3]] : [[1, 8], [4, 5], [3, 6], [2, 7]];
}

export function createTournament(
  playerCount: TournamentPlayerCount,
  names: readonly string[],
  boardCodes: readonly string[],
): Tournament | null {
  const accepted = acceptPlayerNames(names, playerCount);
  if (!('names' in accepted)) return null;
  const entrants = accepted.names.map((name, index) => ({ name, seed: index + 1 }));
  const definitions = roundDefinitions(playerCount);
  const neededCodes = definitions.reduce((sum, round) => sum + round.matchCount, 0);
  const sizes = definitions.flatMap((round) => Array.from({ length: round.matchCount }, () => round.size));
  if (
    boardCodes.length !== neededCodes ||
    new Set(boardCodes).size !== boardCodes.length ||
    boardCodes.some((code, index) => parseBoardCode(code)?.size !== sizes[index])
  )
    return null;
  let codeIndex = 0;
  const rounds = definitions.map((definition, roundIndex): TournamentRound => {
    const matches = Array.from({ length: definition.matchCount }, (_, matchIndex) => {
      const boardCode = boardCodes[codeIndex++]!;
      const seeds = roundIndex === 0 ? openingSeedPairs(playerCount)[matchIndex] : null;
      return {
        boardCode,
        players: seeds
          ? [entrantAt(entrants, seeds[0]), entrantAt(entrants, seeds[1])]
          : [null, null],
        results: [null, null],
        winner: null,
      } as const;
    });
    return { matches, name: definition.name, size: definition.size };
  });
  return { champion: null, current: { round: 0, match: 0, turn: 0 }, entrants, playerCount, rounds, status: 'active' };
}

export function currentMatch(tournament: Tournament): TournamentMatch | null {
  const current = tournament.current;
  return current ? tournament.rounds[current.round]?.matches[current.match] ?? null : null;
}

export function currentPlayer(tournament: Tournament): TournamentPlayer | null {
  const current = tournament.current;
  const match = currentMatch(tournament);
  return current && match ? match.players[current.turn] : null;
}

export function currentResult(tournament: Tournament): TournamentResult | null {
  const current = tournament.current;
  const match = currentMatch(tournament);
  return current && match ? match.results[current.turn] : null;
}

function entrantAt(entrants: readonly TournamentPlayer[], seed: number): TournamentPlayer {
  const entrant = entrants[seed - 1];
  if (!entrant) throw new Error('Invalid tournament seed.');
  return entrant;
}
