import { parseBoardCode } from '../deck.ts';

export const PLAYER_COUNTS = [4, 8] as const;

// Round names count back from the final, so four players start at the semifinals.
const ROUND_NAMES = ['Quarterfinal', 'Semifinal', 'Final'] as const;

export interface TurnResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface MatchRecord {
  readonly boardCode: string;
  readonly turns: readonly TurnResult[];
}

// A tournament is only its players, in bracket order, and the matches played so far. Every match
// has its own deal. Its two players play that deal one after the other and winners follow from
// the results, so nothing here can disagree with them.
export interface Tournament {
  readonly players: readonly string[];
  readonly matches: readonly MatchRecord[];
}

export interface TurnInfo {
  readonly match: number;
  readonly player: string;
  readonly boardCode: string;
}

// Every match of a tournament is dealt on the same grid.
export function gridSize(tournament: Tournament): number {
  return parseBoardCode(tournament.matches[0]?.boardCode ?? '')?.size ?? 0;
}

export function isPlayerCount(value: number): boolean {
  return PLAYER_COUNTS.some((count) => count === value);
}

export function createTournament(
  players: readonly string[],
  boardCodes: readonly string[],
): Tournament {
  if (!isPlayerCount(players.length) || boardCodes.length !== players.length - 1)
    throw new Error('A tournament needs 4 or 8 players and one deal for each match.');
  return { players, matches: boardCodes.map((boardCode) => ({ boardCode, turns: [] })) };
}

// Matches are numbered round by round. Match 0 pairs the first two players and the last match is
// the final.
export function roundMatches(playerCount: number): readonly (readonly number[])[] {
  const rounds: (readonly number[])[] = [];
  let first = 0;
  for (let count = playerCount / 2; count >= 1; count /= 2) {
    const start = first;
    rounds.push(Array.from({ length: count }, (_, position) => start + position));
    first += count;
  }
  return rounds;
}

export function roundName(playerCount: number, round: number): string {
  const rounds = roundMatches(playerCount).length;
  return ROUND_NAMES[ROUND_NAMES.length - rounds + round] ?? 'Match';
}

export function matchTitle(playerCount: number, match: number): string {
  const rounds = roundMatches(playerCount);
  const round = rounds.findIndex((matches) => matches.includes(match));
  const matches = rounds[round] ?? [];
  const name = roundName(playerCount, round);
  return matches.length === 1 ? name : `${name} ${matches.indexOf(match) + 1}`;
}

// Fewer moves win and less time settles a tie. A tie on both goes to the player listed first.
function isAhead(turn: TurnResult, other: TurnResult): boolean {
  return turn.moves === other.moves ? turn.elapsedMs < other.elapsedMs : turn.moves < other.moves;
}

export function matchPlayers(
  tournament: Tournament,
  match: number,
): readonly [string | null, string | null] {
  const firstRound = tournament.players.length / 2;
  if (match < firstRound)
    return [tournament.players[2 * match] ?? null, tournament.players[2 * match + 1] ?? null];
  const feeder = 2 * (match - firstRound);
  return [matchWinner(tournament, feeder), matchWinner(tournament, feeder + 1)];
}

export function matchWinner(tournament: Tournament, match: number): string | null {
  const [first, second] = tournament.matches[match]?.turns ?? [];
  if (!first || !second) return null;
  const [left, right] = matchPlayers(tournament, match);
  return isAhead(second, first) ? right : left;
}

export function turnsPlayed(tournament: Tournament): number {
  return tournament.matches.reduce((total, match) => total + match.turns.length, 0);
}

export function isFinished(tournament: Tournament): boolean {
  return turnsPlayed(tournament) === 2 * tournament.matches.length;
}

export function champion(tournament: Tournament): string | null {
  return isFinished(tournament) ? matchWinner(tournament, tournament.matches.length - 1) : null;
}

// Turns run in order, two for each match. Turn 0 belongs to the first player of match 0.
export function turnAt(tournament: Tournament, turn: number): TurnInfo | null {
  const match = Math.floor(turn / 2);
  const record = tournament.matches[match];
  const player = matchPlayers(tournament, match)[turn % 2];
  return record && player ? { match, player, boardCode: record.boardCode } : null;
}

export function recordTurn(tournament: Tournament, result: TurnResult): Tournament {
  const match = Math.floor(turnsPlayed(tournament) / 2);
  if (!tournament.matches[match]) return tournament;
  return {
    ...tournament,
    matches: tournament.matches.map((record, position) =>
      position === match ? { ...record, turns: [...record.turns, result] } : record,
    ),
  };
}
