export const PLAYER_COUNTS = [4, 8] as const;
export const NAME_MAX_CHARACTERS = 32;

export interface TurnResult {
  readonly moves: number;
  readonly elapsedMs: number;
}
type Seat = 0 | 1;
type Slot = TurnResult | null;
export interface Match {
  readonly boardCode: string;
  readonly results: readonly [Slot, Slot];
}
export interface Tournament {
  readonly players: readonly string[];
  readonly matches: readonly Match[];
}
interface Turn {
  readonly match: number;
  readonly seat: Seat;
}

export const RosterProblem = { missing: 'missing', duplicate: 'duplicate' } as const;
type RosterProblemKind = (typeof RosterProblem)[keyof typeof RosterProblem];

export function isPlayerCount(value: number): boolean {
  return PLAYER_COUNTS.some((count) => count === value);
}

// Names arrive trimmed. Names that differ only by letter case would read the same in the bracket.
export function rosterProblem(
  names: readonly string[],
): { readonly kind: RosterProblemKind; readonly index: number } | null {
  const seen = new Set<string>();
  for (const [index, name] of names.entries()) {
    if (!name) return { kind: RosterProblem.missing, index };
    const key = name.toLowerCase();
    if (seen.has(key)) return { kind: RosterProblem.duplicate, index };
    seen.add(key);
  }
  return null;
}

export function createTournament(
  players: readonly string[],
  boardCodes: readonly string[],
): Tournament {
  if (!isPlayerCount(players.length) || boardCodes.length !== players.length - 1)
    throw new Error('Invalid tournament.');
  return {
    players: [...players],
    matches: boardCodes.map((boardCode) => ({ boardCode, results: [null, null] })),
  };
}

// Matches are numbered round by round. Round one pairs neighbours in entry order, and each later
// match takes the winners of two earlier matches.
export function feederMatches(playerCount: number, match: number): readonly [number, number] {
  const first = 2 * (match - playerCount / 2);
  return [first, first + 1];
}

export function matchPlayers(
  tournament: Tournament,
  match: number,
): readonly [number | null, number | null] {
  const count = tournament.players.length;
  if (match < count / 2) return [2 * match, 2 * match + 1];
  const [first, second] = feederMatches(count, match);
  return [matchWinner(tournament, first), matchWinner(tournament, second)];
}

// Fewer moves wins. Equal moves go to the faster time, and an exact tie goes to the first player.
export function matchWinner(tournament: Tournament, match: number): number | null {
  const [first, second] = tournament.matches[match]?.results ?? [null, null];
  if (!first || !second) return null;
  const firstWins =
    first.moves === second.moves ? first.elapsedMs <= second.elapsedMs : first.moves < second.moves;
  return matchPlayers(tournament, match)[firstWins ? 0 : 1];
}

export function nextTurn(tournament: Tournament): Turn | null {
  for (const [match, { results }] of tournament.matches.entries()) {
    if (!results[0]) return { match, seat: 0 };
    if (!results[1]) return { match, seat: 1 };
  }
  return null;
}

// The turn that finished last, which an ended turn still shows until Next turn or Next match.
export function lastTurn(tournament: Tournament): Turn | null {
  const next = nextTurn(tournament);
  if (next?.seat === 1) return { match: next.match, seat: 0 };
  const match = (next?.match ?? tournament.matches.length) - 1;
  return match < 0 ? null : { match, seat: 1 };
}

export function turnPlayer(tournament: Tournament, turn: Turn): number | null {
  return matchPlayers(tournament, turn.match)[turn.seat];
}

export function recordTurn(tournament: Tournament, result: TurnResult): Tournament {
  const turn = nextTurn(tournament);
  if (!turn) return tournament;
  return {
    ...tournament,
    matches: tournament.matches.map((match, index) => {
      if (index !== turn.match) return match;
      const [first, second] = match.results;
      return { ...match, results: turn.seat === 0 ? [result, second] : [first, result] };
    }),
  };
}

export function champion(tournament: Tournament): number | null {
  return matchWinner(tournament, tournament.matches.length - 1);
}

export function bracketRounds(playerCount: number): readonly (readonly number[])[] {
  const rounds: number[][] = [];
  let start = 0;
  for (let size = playerCount / 2; size >= 1; size /= 2) {
    rounds.push(Array.from({ length: size }, (_, offset) => start + offset));
    start += size;
  }
  return rounds;
}
