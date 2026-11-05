// Knockout rules for players sharing one device. Positions in the player list are entry order,
// so entry position 0 is seed 1.
export const PLAYER_COUNTS = [4, 8] as const;
export const RoundName = {
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Final',
} as const;
type Round = (typeof RoundName)[keyof typeof RoundName];

const ROUND_SIZES: Readonly<Record<Round, number>> = {
  [RoundName.quarterfinal]: 4,
  [RoundName.semifinal]: 6,
  [RoundName.final]: 8,
};
// Opening matches by entry position, in bracket order.
const OPENING: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  4: [
    [0, 3],
    [1, 2],
  ],
  8: [
    [0, 7],
    [3, 4],
    [2, 5],
    [1, 6],
  ],
};
const NAME_MIN = 2;
const NAME_MAX = 20;
export const NameNotice = {
  length: 'Use 2 to 20 characters.',
  repeat: 'Each name must be different.',
} as const;

export interface Result {
  readonly moves: number;
  readonly elapsedMs: number;
}
export interface Match {
  readonly boardCode: string;
  // Results in play order. The first player listed for the match plays first.
  readonly results: readonly Result[];
}
export interface Tournament {
  readonly players: readonly string[];
  readonly matches: readonly Match[];
}
type Players = readonly [number | null, number | null];

export function isPlayerCount(count: number): boolean {
  return PLAYER_COUNTS.some((option) => option === count);
}

// Each round's name, first match index and match count, from the opening round to the Final.
function rounds(count: number) {
  const names: readonly Round[] =
    count === 8
      ? [RoundName.quarterfinal, RoundName.semifinal, RoundName.final]
      : [RoundName.semifinal, RoundName.final];
  let first = 0;
  return names.map((name, index) => {
    const length = count / 2 ** (index + 1);
    const round = { name, first, length };
    first += length;
    return round;
  });
}

function roundOf(count: number, index: number) {
  const all = rounds(count);
  const position = all.findIndex((round) => index < round.first + round.length);
  const round = all[position];
  if (!round) throw new Error('Match index out of range.');
  return { round, previous: all[position - 1] };
}

export function matchSizes(count: number): number[] {
  return rounds(count).flatMap((round) =>
    Array.from({ length: round.length }, () => ROUND_SIZES[round.name]),
  );
}

export function roundName(count: number, index: number): string {
  return roundOf(count, index).round.name;
}

// Names one match in the bracket, for example Semifinal 2. The Final needs no number.
export function matchLabel(count: number, index: number): string {
  const { round } = roundOf(count, index);
  return round.length === 1 ? round.name : `${round.name} ${index - round.first + 1}`;
}

export function matchPlayers(tournament: Tournament, index: number): Players {
  const count = tournament.players.length;
  const { round, previous } = roundOf(count, index);
  if (!previous) return OPENING[count]?.[index] ?? [null, null];
  const feeder = previous.first + 2 * (index - round.first);
  return [matchWinner(tournament, feeder), matchWinner(tournament, feeder + 1)];
}

// Fewer moves wins. Equal moves go to less active time, then to the higher seed.
function firstWins(first: Result, second: Result, firstEntry: number, secondEntry: number) {
  if (first.moves !== second.moves) return first.moves < second.moves;
  if (first.elapsedMs !== second.elapsedMs) return first.elapsedMs < second.elapsedMs;
  return firstEntry < secondEntry;
}

export function matchWinner(tournament: Tournament, index: number): number | null {
  const [first, second] = matchPlayers(tournament, index);
  const [firstResult, secondResult] = tournament.matches[index]?.results ?? [];
  if (first === null || second === null || !firstResult || !secondResult) return null;
  return firstWins(firstResult, secondResult, first, second) ? first : second;
}

export function championOf(tournament: Tournament): number | null {
  return matchWinner(tournament, tournament.matches.length - 1);
}

// The next game to play: its match and whether the first or second player plays it.
export function currentTurn(tournament: Tournament): { match: number; slot: number } | null {
  const match = tournament.matches.findIndex((item) => item.results.length < 2);
  const item = tournament.matches[match];
  return item ? { match, slot: item.results.length } : null;
}

export function turnPlayer(tournament: Tournament): string | null {
  const turn = currentTurn(tournament);
  if (!turn) return null;
  const entry = matchPlayers(tournament, turn.match)[turn.slot];
  return entry === null || entry === undefined ? null : (tournament.players[entry] ?? null);
}

export function recordResult(tournament: Tournament, result: Result): Tournament {
  const turn = currentTurn(tournament);
  if (!turn) return tournament;
  return {
    ...tournament,
    matches: tournament.matches.map((match, index) =>
      index === turn.match ? { ...match, results: [...match.results, result] } : match,
    ),
  };
}

// Every match gets a different board code. The caller supplies fresh codes for a size.
export function createTournament(
  players: readonly string[],
  draw: (size: number) => string,
): Tournament {
  const used = new Set<string>();
  const matches = matchSizes(players.length).map((size) => {
    let code = draw(size);
    while (used.has(code)) code = draw(size);
    used.add(code);
    return { boardCode: code, results: [] };
  });
  return { players: [...players], matches };
}

// The one stored and shown form of a typed name.
export function acceptedName(draft: string): string {
  return draft.trim().replace(/\s+/g, ' ').normalize('NFC');
}

// Checks players in entry order and reports the first one that blocks the group.
export function checkNames(
  drafts: readonly string[],
): { readonly names: readonly string[] } | { readonly notice: string; readonly index: number } {
  const names = drafts.map(acceptedName);
  const seen = new Set<string>();
  for (const [index, name] of names.entries()) {
    const length = [...name].length;
    if (length < NAME_MIN || length > NAME_MAX) return { notice: NameNotice.length, index };
    const key = name.toLowerCase();
    if (seen.has(key)) return { notice: NameNotice.repeat, index };
    seen.add(key);
  }
  return { names };
}
