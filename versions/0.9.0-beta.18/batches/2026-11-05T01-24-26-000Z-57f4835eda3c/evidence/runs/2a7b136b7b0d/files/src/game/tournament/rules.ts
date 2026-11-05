import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { isNonnegativeSafeInteger } from '../saved-format.ts';
import { acceptedName, nameProblem } from './names.ts';

export const PLAYER_COUNTS = [4, 8] as const;
export const RoundName = {
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Final',
} as const;
type Round = (typeof RoundName)[keyof typeof RoundName];
const BOARD_SIDE: Readonly<Record<Round, number>> = {
  [RoundName.quarterfinal]: 4,
  [RoundName.semifinal]: 6,
  [RoundName.final]: 8,
};
const ATTEMPTS_PER_MATCH = 2;

// One finished game: the completed board's moves and active elapsed milliseconds.
export interface Attempt {
  readonly moves: number;
  readonly elapsedMs: number;
}
// Both players of a match play its one board code, the first listed side first.
export interface Match {
  readonly boardCode: string;
  readonly attempts: readonly Attempt[];
}
// Players are in entry order, so the first player entered is seed 1.
export interface Tournament {
  readonly players: readonly string[];
  readonly matches: readonly Match[];
}
interface Turn {
  readonly match: number;
  readonly seed: number;
}

type Side = { readonly seed: number } | { readonly winnerOf: number };
interface Slot {
  readonly round: Round;
  readonly sides: readonly [Side, Side];
}
const seed = (value: number): Side => ({ seed: value });
const winnerOf = (match: number): Side => ({ winnerOf: match });
// Opening matches meet 1 against 4 and 2 against 3, or 1-8, 4-5, 3-6 and 2-7. Later rounds pair
// the winners of neighboring matches.
const FOUR: readonly Slot[] = [
  { round: RoundName.semifinal, sides: [seed(1), seed(4)] },
  { round: RoundName.semifinal, sides: [seed(2), seed(3)] },
  { round: RoundName.final, sides: [winnerOf(0), winnerOf(1)] },
];
const EIGHT: readonly Slot[] = [
  { round: RoundName.quarterfinal, sides: [seed(1), seed(8)] },
  { round: RoundName.quarterfinal, sides: [seed(4), seed(5)] },
  { round: RoundName.quarterfinal, sides: [seed(3), seed(6)] },
  { round: RoundName.quarterfinal, sides: [seed(2), seed(7)] },
  { round: RoundName.semifinal, sides: [winnerOf(0), winnerOf(1)] },
  { round: RoundName.semifinal, sides: [winnerOf(2), winnerOf(3)] },
  { round: RoundName.final, sides: [winnerOf(4), winnerOf(5)] },
];

function slots(count: number): readonly Slot[] {
  return count === 8 ? EIGHT : count === 4 ? FOUR : [];
}

function isPlayerCount(count: number): boolean {
  return PLAYER_COUNTS.some((option) => option === count);
}

// Quarterfinals use 4x4, semifinals 6x6 and the final 8x8.
export function boardSizes(count: number): number[] {
  return slots(count).map((slot) => BOARD_SIDE[slot.round]);
}

export function matchRound(count: number, index: number): string {
  return slots(count)[index]?.round ?? '';
}

export function matchLabel(count: number, index: number): string {
  const all = slots(count);
  const slot = all[index];
  if (!slot) return '';
  const round = all.filter((other) => other.round === slot.round);
  return round.length === 1 ? slot.round : `${slot.round} ${round.indexOf(slot) + 1}`;
}

// A side's seed is null until the match that feeds it has a winner.
export function matchSeeds(
  tournament: Tournament,
  index: number,
): readonly [number | null, number | null] {
  const slot = slots(tournament.players.length)[index];
  if (!slot) return [null, null];
  return [sideSeed(tournament, slot.sides[0]), sideSeed(tournament, slot.sides[1])];
}

// The earlier match that decides each side, or null for a side seeded from entry.
export function matchFeeders(
  count: number,
  index: number,
): readonly [number | null, number | null] {
  const sides = slots(count)[index]?.sides;
  return sides ? [feeder(sides[0]), feeder(sides[1])] : [null, null];
}

function feeder(side: Side): number | null {
  return 'winnerOf' in side ? side.winnerOf : null;
}

function sideSeed(tournament: Tournament, side: Side): number | null {
  return 'seed' in side ? side.seed : matchWinner(tournament, side.winnerOf);
}

// Fewer moves wins. Equal moves go to less active time, then to the higher seed, and seed 1 is
// the highest. Time compares the game's own milliseconds, not the rounded display.
export function matchWinner(tournament: Tournament, index: number): number | null {
  const [first, second] = matchSeeds(tournament, index);
  const [a, b] = tournament.matches[index]?.attempts ?? [];
  if (first === null || second === null || !a || !b) return null;
  if (a.moves !== b.moves) return a.moves < b.moves ? first : second;
  if (a.elapsedMs !== b.elapsedMs) return a.elapsedMs < b.elapsedMs ? first : second;
  return Math.min(first, second);
}

export function playerName(tournament: Tournament, seedNumber: number): string {
  return tournament.players[seedNumber - 1] ?? '';
}

// The next unplayed game, or null once the final has both results.
export function currentTurn(tournament: Tournament): Turn | null {
  const match = tournament.matches.findIndex((m) => m.attempts.length < ATTEMPTS_PER_MATCH);
  const played = tournament.matches[match]?.attempts.length ?? 0;
  const next = matchSeeds(tournament, match)[played];
  return match < 0 || next === null || next === undefined ? null : { match, seed: next };
}

export function recordAttempt(tournament: Tournament, attempt: Attempt): Tournament {
  const turn = currentTurn(tournament);
  if (!turn) return tournament;
  const matches = tournament.matches.map((match, index) =>
    index === turn.match ? { ...match, attempts: [...match.attempts, attempt] } : match,
  );
  return { ...tournament, matches };
}

export function attemptCount(tournament: Tournament): number {
  return tournament.matches.reduce((total, match) => total + match.attempts.length, 0);
}

export function champion(tournament: Tournament): string | null {
  const winner = matchWinner(tournament, tournament.matches.length - 1);
  return winner === null ? null : playerName(tournament, winner);
}

// Loaded and saved tournaments need accepted names, a distinct deal of each round's size for
// every match, plausible finished games and matches played in bracket order.
export function isValidTournament(tournament: Tournament): boolean {
  const { players, matches } = tournament;
  const sizes = boardSizes(players.length);
  if (!isPlayerCount(players.length) || matches.length !== sizes.length) return false;
  if (players.some((name) => acceptedName(name) !== name) || nameProblem(players)) return false;
  if (new Set(matches.map((match) => match.boardCode)).size !== matches.length) return false;
  let open = false;
  for (const [index, match] of matches.entries()) {
    const size = sizes[index] ?? 0;
    if (parseBoardCode(match.boardCode)?.size !== size) return false;
    if (match.attempts.length > ATTEMPTS_PER_MATCH || (open && match.attempts.length)) return false;
    if (!match.attempts.every((attempt) => isFinishedAttempt(attempt, size))) return false;
    open ||= match.attempts.length < ATTEMPTS_PER_MATCH;
  }
  return true;
}

function isFinishedAttempt(attempt: Attempt, size: number): boolean {
  const { moves, elapsedMs } = attempt;
  return (
    isNonnegativeSafeInteger(moves) &&
    moves >= size ** 2 / 2 &&
    moves <= MOVES_MAX &&
    Number.isFinite(elapsedMs) &&
    elapsedMs >= 0 &&
    elapsedMs <= ELAPSED_MAX_MS
  );
}
