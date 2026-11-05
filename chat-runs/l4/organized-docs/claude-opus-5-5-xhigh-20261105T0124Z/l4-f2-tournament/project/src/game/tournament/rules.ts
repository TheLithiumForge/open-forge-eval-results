import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { matchBoardSize, matchPlace, openingSeeds, PLAYER_COUNTS } from './bracket.ts';
import { acceptedName, nameProblem } from './names.ts';

export interface TournamentResult {
  readonly elapsedMs: number;
  readonly moves: number;
}
export interface TournamentMatch {
  readonly boardCode: string;
  // One entry per seat in seat order. Null means that seat hasn't finished its game.
  readonly results: readonly (TournamentResult | null)[];
}
export interface Tournament {
  readonly players: readonly string[];
  // Matches run round by round, in bracket order within a round.
  readonly matches: readonly TournamentMatch[];
}
interface Turn {
  readonly match: number;
  readonly seat: number;
}

// Lower moves win, then lower active time, then the higher seed. Seed 1 is the highest seed.
export function isAhead(
  result: TournamentResult,
  other: TournamentResult,
  seed: number,
  otherSeed: number,
): boolean {
  if (result.moves !== other.moves) return result.moves < other.moves;
  if (result.elapsedMs !== other.elapsedMs) return result.elapsedMs < other.elapsedMs;
  return seed < otherSeed;
}

// The two seeds in seat order, or null while an earlier match is undecided.
export function matchSeeds(tournament: Tournament, index: number): readonly number[] | null {
  const count = tournament.players.length;
  const { round, position, previousStart } = matchPlace(count, index);
  if (round === 0) return openingSeeds(count, position);
  const first = matchWinner(tournament, previousStart + position * 2);
  const second = matchWinner(tournament, previousStart + position * 2 + 1);
  return first === null || second === null ? null : [first, second];
}

export function matchWinner(tournament: Tournament, index: number): number | null {
  const seeds = matchSeeds(tournament, index);
  const [result, other] = tournament.matches[index]?.results ?? [];
  const [seed, otherSeed] = seeds ?? [];
  if (!result || !other || seed === undefined || otherSeed === undefined) return null;
  return isAhead(result, other, seed, otherSeed) ? seed : otherSeed;
}

export function playerName(tournament: Tournament, seed: number): string {
  return tournament.players[seed - 1] ?? '';
}

// Games run match by match, with the first seat playing before the second.
export function currentTurn(tournament: Tournament): Turn | null {
  for (const [match, { results }] of tournament.matches.entries()) {
    const seat = results.indexOf(null);
    if (seat >= 0) return { match, seat };
  }
  return null;
}

export function isFinished(tournament: Tournament): boolean {
  return currentTurn(tournament) === null;
}

export function recordResult(tournament: Tournament, result: TournamentResult): Tournament {
  const turn = currentTurn(tournament);
  if (!turn) return tournament;
  const matches = tournament.matches.map((match, index) =>
    index === turn.match
      ? { ...match, results: match.results.map((old, seat) => (seat === turn.seat ? result : old)) }
      : match,
  );
  return { ...tournament, matches };
}

export function champion(tournament: Tournament): string | null {
  const winner = matchWinner(tournament, tournament.matches.length - 1);
  return winner === null ? null : playerName(tournament, winner);
}

// Draws a deal for every match. Every match gets a different full board code.
export function createTournament(
  players: readonly string[],
  draw: (size: number) => string,
): Tournament {
  const used = new Set<string>();
  const matches = Array.from({ length: players.length - 1 }, (_, index) => {
    const size = matchBoardSize(players.length, index);
    let boardCode = draw(size);
    while (used.has(boardCode)) boardCode = draw(size);
    used.add(boardCode);
    return { boardCode, results: [null, null] };
  });
  return { players, matches };
}

function isValidResult(result: TournamentResult | null, size: number): boolean {
  return (
    result === null ||
    (Number.isSafeInteger(result.moves) &&
      result.moves >= size ** 2 / 2 &&
      result.moves <= MOVES_MAX &&
      Number.isFinite(result.elapsedMs) &&
      result.elapsedMs >= 0 &&
      result.elapsedMs <= ELAPSED_MAX_MS)
  );
}

// Checks names, bracket size, deals by round and that finished games come before unplayed ones.
export function isValidTournament(tournament: Tournament): boolean {
  const { players, matches } = tournament;
  const count = players.length;
  if (!PLAYER_COUNTS.some((allowed) => allowed === count) || matches.length !== count - 1)
    return false;
  if (players.some((name) => acceptedName(name) !== name) || nameProblem(players)) return false;
  const codes = new Set(matches.map((match) => match.boardCode));
  if (codes.size !== matches.length) return false;
  const results = matches.flatMap((match) => match.results);
  const firstOpen = results.indexOf(null);
  if (firstOpen >= 0 && results.slice(firstOpen).some((result) => result !== null)) return false;
  return matches.every((match, index) => {
    const size = matchBoardSize(count, index);
    return (
      parseBoardCode(match.boardCode)?.size === size &&
      match.results.length === 2 &&
      match.results.every((result) => isValidResult(result, size))
    );
  });
}
