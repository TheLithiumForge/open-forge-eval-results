import { ELAPSED_MAX_MS, MOVES_MAX } from './game.ts';
import { parseBoardCode } from './deck.ts';
import {
  hasExactKeys,
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from './saved-format.ts';

export const TOURNAMENT_VERSION = 1;
export const TOURNAMENT_FILE_MAX_BYTES = 1_048_576;
export const TOURNAMENT_PLAYERS = [4, 8] as const;
export const TOURNAMENT_NAME_MAX_LENGTH = 40;
export const TOURNAMENT_HISTORY_KEY = 'neon-pairs.tournaments.v1';

export type PlayerCount = (typeof TOURNAMENT_PLAYERS)[number];
export type TournamentPhase = 'ready' | 'playing' | 'turn-complete' | 'match-complete' | 'complete';
export type Turn = 0 | 1;

export interface TournamentResult {
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface TournamentMatch {
  readonly boardCode: string;
  readonly players: readonly [string | null, string | null];
  readonly results: readonly [TournamentResult | null, TournamentResult | null];
  readonly winner: string | null;
}

export interface TournamentState {
  readonly version: typeof TOURNAMENT_VERSION;
  readonly id: string;
  readonly createdAt: string;
  readonly playerCount: PlayerCount;
  readonly players: readonly string[];
  readonly rounds: readonly (readonly TournamentMatch[])[];
  readonly currentRound: number;
  readonly currentMatch: number;
  readonly turn: Turn;
  readonly phase: TournamentPhase;
  readonly champion: string | null;
}

export interface TournamentDraft {
  readonly playerCount: PlayerCount;
  readonly players: readonly string[];
}

export interface TournamentFile {
  readonly version: typeof TOURNAMENT_VERSION;
  readonly draft: TournamentDraft;
  readonly tournament: TournamentState | null;
  readonly gameSnapshot: string | null;
}

const PHASES: readonly TournamentPhase[] = [
  'ready',
  'playing',
  'turn-complete',
  'match-complete',
  'complete',
];

export function isPlayerCount(value: unknown): value is PlayerCount {
  return TOURNAMENT_PLAYERS.some((count) => count === value);
}

export function createTournament(
  players: readonly string[],
  firstBoardCode: string,
): TournamentState {
  if ((players.length !== 4 && players.length !== 8) || !validNameList(players))
    throw new Error('A tournament requires four or eight named players.');
  if (!parseBoardCode(firstBoardCode)) throw new Error('Invalid tournament board code.');

  const rounds: TournamentMatch[][] = [];
  let matchesInRound = players.length / 2;
  for (let roundIndex = 0; matchesInRound >= 1; roundIndex += 1) {
    const matches: TournamentMatch[] = [];
    for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex += 1) {
      const firstRound = roundIndex === 0;
      matches.push({
        boardCode: firstRound && matchIndex === 0 ? firstBoardCode : '',
        players: firstRound
          ? [players[matchIndex * 2] ?? null, players[matchIndex * 2 + 1] ?? null]
          : [null, null],
        results: [null, null],
        winner: null,
      });
    }
    rounds.push(matches);
    matchesInRound = Math.floor(matchesInRound / 2);
  }

  return {
    version: TOURNAMENT_VERSION,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    playerCount: players.length as PlayerCount,
    players: [...players],
    rounds,
    currentRound: 0,
    currentMatch: 0,
    turn: 0,
    phase: 'ready',
    champion: null,
  };
}

export function currentTournamentMatch(tournament: TournamentState): TournamentMatch {
  const match = tournament.rounds[tournament.currentRound]?.[tournament.currentMatch];
  if (!match) throw new Error('Tournament match is out of range.');
  return match;
}

export function currentTournamentPlayer(tournament: TournamentState): string {
  const player = currentTournamentMatch(tournament).players[tournament.turn];
  if (!player) throw new Error('Tournament player is not assigned.');
  return player;
}

export function startTournamentTurn(tournament: TournamentState): TournamentState {
  if (tournament.phase !== 'ready') return tournament;
  return { ...tournament, phase: 'playing' };
}

export function recordTournamentTurn(
  tournament: TournamentState,
  result: TournamentResult,
): TournamentState {
  if (tournament.phase !== 'playing') return tournament;
  const round = tournament.rounds[tournament.currentRound];
  const match = round?.[tournament.currentMatch];
  if (!round || !match || match.results[tournament.turn]) return tournament;
  const results: [TournamentResult | null, TournamentResult | null] = [...match.results];
  results[tournament.turn] = {
    moves: Math.min(MOVES_MAX, Math.max(0, Math.floor(result.moves))),
    elapsedMs: Math.min(ELAPSED_MAX_MS, Math.max(0, Math.floor(result.elapsedMs))),
  };
  const bothComplete = results[0] !== null && results[1] !== null;
  const winner = bothComplete
    ? decideWinner(match.players, results)
    : null;
  const updatedMatch: TournamentMatch = { ...match, results, winner };
  const rounds = replaceMatch(
    tournament.rounds,
    tournament.currentRound,
    tournament.currentMatch,
    updatedMatch,
  );
  const isFinalMatch =
    tournament.currentRound === rounds.length - 1 && tournament.currentMatch === 0;

  if (tournament.turn === 0) {
    return { ...tournament, rounds, phase: 'turn-complete' };
  }
  if (isFinalMatch) return { ...tournament, rounds, phase: 'complete', champion: winner };
  return { ...tournament, rounds, phase: 'match-complete' };
}

export function advanceTournamentTurn(tournament: TournamentState): TournamentState {
  if (tournament.phase !== 'turn-complete') return tournament;
  return { ...tournament, turn: 1, phase: 'ready' };
}

export function advanceTournamentMatch(
  tournament: TournamentState,
  nextBoardCode: string,
): TournamentState {
  if (tournament.phase !== 'match-complete' || !parseBoardCode(nextBoardCode)) return tournament;
  let currentRound = tournament.currentRound;
  let currentMatch = tournament.currentMatch + 1;
  const rounds = tournament.rounds.map((round) => [...round]);
  if (currentMatch >= (rounds[currentRound]?.length ?? 0)) {
    const previousRound = rounds[currentRound];
    if (!previousRound || currentRound + 1 >= rounds.length) return tournament;
    currentRound += 1;
    currentMatch = 0;
    const nextRound = rounds[currentRound];
    if (!nextRound) return tournament;
    for (let index = 0; index < nextRound.length; index += 1) {
      const first = previousRound[index * 2]?.winner ?? null;
      const second = previousRound[index * 2 + 1]?.winner ?? null;
      nextRound[index] = { ...nextRound[index]!, players: [first, second] };
    }
  }
  const match = rounds[currentRound]?.[currentMatch];
  if (!match || !match.players[0] || !match.players[1]) return tournament;
  rounds[currentRound]![currentMatch] = { ...match, boardCode: nextBoardCode };
  return {
    ...tournament,
    rounds,
    currentRound,
    currentMatch,
    turn: 0,
    phase: 'ready',
    champion: null,
  };
}

export function decideWinner(
  players: readonly [string | null, string | null],
  results: readonly [TournamentResult | null, TournamentResult | null],
): string | null {
  const firstPlayer = players[0];
  const secondPlayer = players[1];
  const first = results[0];
  const second = results[1];
  if (!firstPlayer || !secondPlayer || !first || !second) return null;
  if (first.moves !== second.moves) return first.moves < second.moves ? firstPlayer : secondPlayer;
  if (first.elapsedMs !== second.elapsedMs)
    return first.elapsedMs < second.elapsedMs ? firstPlayer : secondPlayer;
  return firstPlayer;
}

export function decodeTournamentFile(text: string): TournamentFile | null {
  if (!isWithinBytes(text, TOURNAMENT_FILE_MAX_BYTES)) return null;
  const value = parseJson(text);
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['version', 'draft', 'tournament', 'gameSnapshot']) ||
    value.version !== TOURNAMENT_VERSION ||
    !isJsonObject(value.draft) ||
    !hasExactKeys(value.draft, ['playerCount', 'players']) ||
    !isPlayerCount(value.draft.playerCount) ||
    !isDraftPlayers(value.draft.players)
  )
    return null;
  const tournament = value.tournament === null ? null : decodeTournamentValue(value.tournament);
  if (value.tournament !== null && !tournament) return null;
  if (value.gameSnapshot !== null && typeof value.gameSnapshot !== 'string') return null;
  return {
    version: TOURNAMENT_VERSION,
    draft: { playerCount: value.draft.playerCount, players: [...value.draft.players] },
    tournament,
    gameSnapshot: value.gameSnapshot,
  };
}

export function decodeTournamentValue(value: unknown): TournamentState | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, [
      'version',
      'id',
      'createdAt',
      'playerCount',
      'players',
      'rounds',
      'currentRound',
      'currentMatch',
      'turn',
      'phase',
      'champion',
    ]) ||
    value.version !== TOURNAMENT_VERSION ||
    typeof value.id !== 'string' ||
    value.id.length < 1 ||
    value.id.length > 100 ||
    typeof value.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    !isPlayerCount(value.playerCount) ||
    !validNameList(value.players) ||
    value.players.length !== value.playerCount ||
    !Array.isArray(value.rounds) ||
    !isNonnegativeSafeInteger(value.currentRound) ||
    !isNonnegativeSafeInteger(value.currentMatch) ||
    (value.turn !== 0 && value.turn !== 1) ||
    typeof value.phase !== 'string' ||
    !PHASES.includes(value.phase as TournamentPhase) ||
    (value.champion !== null && !isTournamentName(value.champion))
  )
    return null;

  const playerCount = value.playerCount;
  const expectedRoundCount = Math.log2(playerCount);
  if (value.rounds.length !== expectedRoundCount) return null;
  const rounds: TournamentMatch[][] = [];
  let expectedMatchCount = playerCount / 2;
  for (let roundIndex = 0; roundIndex < value.rounds.length; roundIndex += 1) {
    const roundValue = value.rounds[roundIndex];
    if (!Array.isArray(roundValue) || roundValue.length !== expectedMatchCount) return null;
    const round: TournamentMatch[] = [];
    for (let matchIndex = 0; matchIndex < roundValue.length; matchIndex += 1) {
      const match = decodeMatch(roundValue[matchIndex]);
      if (!match) return null;
      if (roundIndex === 0) {
        if (
          match.players[0] !== value.players[matchIndex * 2] ||
          match.players[1] !== value.players[matchIndex * 2 + 1]
        )
          return null;
      } else {
        const previousRound = rounds[roundIndex - 1];
        const firstWinner = previousRound?.[matchIndex * 2]?.winner ?? null;
        const secondWinner = previousRound?.[matchIndex * 2 + 1]?.winner ?? null;
        const bothWinnersKnown = firstWinner !== null && secondWinner !== null;
        if (
          (bothWinnersKnown &&
            (match.players[0] !== firstWinner || match.players[1] !== secondWinner)) ||
          (!bothWinnersKnown && (match.players[0] !== null || match.players[1] !== null))
        )
          return null;
      }
      round.push(match);
    }
    rounds.push(round);
    expectedMatchCount /= 2;
  }

  if (
    value.currentRound >= rounds.length ||
    value.currentMatch >= (rounds[value.currentRound]?.length ?? 0)
  )
    return null;
  const state: TournamentState = {
    version: TOURNAMENT_VERSION,
    id: value.id,
    createdAt: value.createdAt,
    playerCount,
    players: [...value.players],
    rounds,
    currentRound: value.currentRound,
    currentMatch: value.currentMatch,
    turn: value.turn,
    phase: value.phase as TournamentPhase,
    champion: value.champion,
  };
  const current = currentTournamentMatch(state);
  if (!parseBoardCode(current.boardCode) || !current.players[0] || !current.players[1]) return null;

  const phaseValid =
    (state.phase === 'ready' && current.results[state.turn] === null && state.champion === null) ||
    (state.phase === 'playing' &&
      current.results[state.turn] === null &&
      state.champion === null) ||
    (state.phase === 'turn-complete' &&
      state.turn === 0 &&
      current.results[0] !== null &&
      current.results[1] === null &&
      state.champion === null) ||
    (state.phase === 'match-complete' &&
      state.turn === 1 &&
      current.results[0] !== null &&
      current.results[1] !== null &&
      current.winner !== null &&
      state.currentRound < rounds.length - 1 &&
      state.champion === null) ||
    (state.phase === 'complete' &&
      state.currentRound === rounds.length - 1 &&
      state.currentMatch === 0 &&
      current.results[0] !== null &&
      current.results[1] !== null &&
      current.winner === state.champion &&
      state.champion !== null);
  if (!phaseValid) return null;
  return state;
}

export function decodePastTournaments(text: string): TournamentState[] {
  if (!isWithinBytes(text, TOURNAMENT_FILE_MAX_BYTES * 5)) return [];
  const value = parseJson(text);
  if (!Array.isArray(value)) return [];
  const tournaments: TournamentState[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const tournament = decodeTournamentValue(item);
    if (tournament?.phase === 'complete' && !seen.has(tournament.id)) {
      seen.add(tournament.id);
      tournaments.push(tournament);
    }
  }
  return tournaments;
}

function decodeMatch(value: unknown): TournamentMatch | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['boardCode', 'players', 'results', 'winner']) ||
    typeof value.boardCode !== 'string' ||
    (value.boardCode !== '' && !parseBoardCode(value.boardCode)) ||
    !Array.isArray(value.players) ||
    value.players.length !== 2 ||
    !value.players.every((player) => player === null || isTournamentName(player)) ||
    !Array.isArray(value.results) ||
    value.results.length !== 2 ||
    (value.winner !== null && !isTournamentName(value.winner))
  )
    return null;
  const players: [string | null, string | null] = [value.players[0], value.players[1]];
  const results: [TournamentResult | null, TournamentResult | null] = [
    decodeResult(value.results[0], value.boardCode),
    decodeResult(value.results[1], value.boardCode),
  ];
  if (
    (value.results[0] !== null && !results[0]) ||
    (value.results[1] !== null && !results[1]) ||
    (results[1] !== null && results[0] === null) ||
    ((results[0] || results[1]) && (!players[0] || !players[1]))
  )
    return null;
  const winner = value.winner as string | null;
  const expectedWinner = decideWinner(players, results);
  if ((winner !== null && winner !== expectedWinner) || (results[0] && results[1] && !winner))
    return null;
  if ((winner || results[0] || results[1]) && !parseBoardCode(value.boardCode)) return null;
  return { boardCode: value.boardCode, players, results, winner };
}

function decodeResult(value: unknown, boardCode: string): TournamentResult | null {
  if (value === null) return null;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['moves', 'elapsedMs']) ||
    !isNonnegativeSafeInteger(value.moves) ||
    value.moves > MOVES_MAX ||
    !isNonnegativeSafeInteger(value.elapsedMs) ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return null;
  const board = parseBoardCode(boardCode);
  if (!board || value.moves < (board.size * board.size) / 2) return null;
  return { moves: value.moves, elapsedMs: value.elapsedMs };
}

function validNameList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isTournamentName);
}

function isDraftPlayers(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length === 8 &&
    value.every((name) => typeof name === 'string' && name.length <= TOURNAMENT_NAME_MAX_LENGTH)
  );
}

function isTournamentName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= TOURNAMENT_NAME_MAX_LENGTH &&
    value === value.trim()
  );
}

function replaceMatch(
  rounds: readonly (readonly TournamentMatch[])[],
  roundIndex: number,
  matchIndex: number,
  match: TournamentMatch,
): TournamentMatch[][] {
  return rounds.map((round, index) =>
    index === roundIndex
      ? round.map((entry, entryIndex) => (entryIndex === matchIndex ? match : entry))
      : [...round],
  );
}
