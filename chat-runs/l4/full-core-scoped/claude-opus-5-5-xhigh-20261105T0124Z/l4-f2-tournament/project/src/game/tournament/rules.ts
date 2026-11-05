import { createGame, isWon } from '../game.ts';
import type { GameState } from '../game.ts';

export const PLAYER_COUNTS = [4, 8] as const;
export const RoundName = {
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Final',
} as const;
type RoundName = (typeof RoundName)[keyof typeof RoundName];

// Each round plays a larger existing board.
const ROUND_SIZE = { Quarterfinal: 4, Semifinal: 6, Final: 8 } as const;

// Opening matches by entry index. Seeds follow entry order, so index 0 is seed 1.
const OPENING_FOUR = [
  [0, 3],
  [1, 2],
] as const;
const OPENING_EIGHT = [
  [0, 7],
  [3, 4],
  [2, 5],
  [1, 6],
] as const;

export interface Result {
  readonly moves: number;
  readonly elapsedMs: number;
}
type Slot = Result | null;
export interface Match {
  readonly boardCode: string;
  readonly results: readonly [Slot, Slot];
}
// Players are in entry order. Results fill in play order: match by match, first player first.
export interface Tournament {
  readonly players: readonly string[];
  readonly matches: readonly Match[];
  readonly reviewing: boolean;
}
interface Turn {
  readonly match: number;
  readonly slot: number;
  readonly player: number;
  readonly boardCode: string;
}

export function isPlayerCount(value: number): boolean {
  return PLAYER_COUNTS.some((count) => count === value);
}

function openingPairs(players: number) {
  return players === OPENING_EIGHT.length * 2 ? OPENING_EIGHT : OPENING_FOUR;
}

// Eight players open with quarterfinals. Four players open with semifinals.
export function roundName(players: number, match: number): RoundName {
  if (match === players - 2) return RoundName.final;
  return openingPairs(players) === OPENING_EIGHT && match < OPENING_EIGHT.length
    ? RoundName.quarterfinal
    : RoundName.semifinal;
}

// Board side lengths in bracket order. A knockout of N players has N - 1 matches.
export function matchSizes(players: number): number[] {
  return Array.from({ length: Math.max(0, players - 1) }, (_, match) => {
    return ROUND_SIZE[roundName(players, match)];
  });
}

export function matchLabel(players: number, match: number): string {
  const round = roundName(players, match);
  if (round === RoundName.final) return round;
  // Semifinals follow the quarterfinals, which take the first half of an eight-player bracket.
  const first = round === RoundName.semifinal ? players - OPENING_FOUR.length * 2 : 0;
  return `${round} ${match - first + 1}`;
}

// Entry indices of a match's two players. A later match waits for the winners that feed it.
export function matchPlayers(tournament: Tournament, match: number): readonly (number | null)[] {
  if (!tournament.matches[match]) return [null, null];
  const opening = openingPairs(tournament.players.length);
  const pair = opening[match];
  if (pair) return pair;
  const feeder = 2 * (match - opening.length);
  return [matchWinner(tournament, feeder), matchWinner(tournament, feeder + 1)];
}

// Fewer moves wins, then less active time, then the higher seed, which is the earlier entry.
export function matchWinner(tournament: Tournament, match: number): number | null {
  const [first, second] = matchPlayers(tournament, match);
  const [one, two] = tournament.matches[match]?.results ?? [null, null];
  if (first === null || first === undefined || second === null || second === undefined) return null;
  if (!one || !two) return null;
  if (one.moves !== two.moves) return one.moves < two.moves ? first : second;
  if (one.elapsedMs !== two.elapsedMs) return one.elapsedMs < two.elapsedMs ? first : second;
  return Math.min(first, second);
}

export function playedGames(tournament: Tournament): number {
  return tournament.matches.flatMap((match) => match.results).filter(Boolean).length;
}

function turnAt(tournament: Tournament, game: number): Turn | null {
  const match = Math.floor(game / 2);
  const slot = game % 2;
  const boardCode = tournament.matches[match]?.boardCode;
  if (boardCode === undefined) return null;
  const player = matchPlayers(tournament, match)[slot];
  return player === null || player === undefined ? null : { match, slot, player, boardCode };
}

export function nextTurn(tournament: Tournament): Turn | null {
  return turnAt(tournament, playedGames(tournament));
}

export function lastTurn(tournament: Tournament): Turn | null {
  return turnAt(tournament, playedGames(tournament) - 1);
}

export function isFinished(tournament: Tournament): boolean {
  return tournament.matches.length > 0 && nextTurn(tournament) === null;
}

export function champion(tournament: Tournament): number | null {
  return isFinished(tournament) ? matchWinner(tournament, tournament.matches.length - 1) : null;
}

export function startTournament(players: readonly string[], codes: readonly string[]): Tournament {
  const matches = codes.map((boardCode): Match => ({ boardCode, results: [null, null] }));
  return { players, matches, reviewing: false };
}

// Records a won game for the player whose turn it is, then shows it until play moves on.
export function recordResult(tournament: Tournament, game: GameState): Tournament {
  const turn = nextTurn(tournament);
  if (!turn || turn.boardCode !== game.boardCode || !isWon(game)) return tournament;
  const result = { moves: game.moves, elapsedMs: game.elapsedMs };
  const matches = tournament.matches.map((match, index): Match => {
    if (index !== turn.match) return match;
    return { ...match, results: turn.slot ? [match.results[0], result] : [result, null] };
  });
  const recorded = { ...tournament, matches };
  return { ...recorded, reviewing: !isFinished(recorded) };
}

export function continueTournament(tournament: Tournament): Tournament {
  return { ...tournament, reviewing: false };
}

// A finished game rebuilt from its deal and result, for showing it again after a load.
export function completedGame(boardCode: string, result: Result): GameState {
  const game = createGame(boardCode);
  const matched = game.deck.map((_, index) => index);
  return { ...game, matched, moves: result.moves, elapsedMs: result.elapsedMs, started: true };
}
