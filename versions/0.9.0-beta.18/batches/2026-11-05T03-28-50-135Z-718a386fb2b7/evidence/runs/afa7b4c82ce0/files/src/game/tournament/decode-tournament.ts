import { parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX, isWon } from '../game.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { isJsonObject, isNonnegativeSafeInteger, parseJson } from '../saved-format.ts';
import { currentMatch } from './tournament.ts';
import type { Match, Result, Tournament } from './tournament.ts';

function readResult(value: unknown, size: number): Result | null {
  if (
    !isJsonObject(value) ||
    !isNonnegativeSafeInteger(value.moves) ||
    value.moves < (size * size) / 2 ||
    value.moves > MOVES_MAX ||
    !isNonnegativeSafeInteger(value.elapsedMs) ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return null;
  return { moves: value.moves, elapsedMs: value.elapsedMs };
}

export function decodeTournament(text: string): Tournament | null {
  if (text.length > 200_000) return null;
  const value = parseJson(text);
  if (
    !isJsonObject(value) ||
    value.version !== 1 ||
    !Array.isArray(value.names) ||
    ![4, 8].includes(value.names.length) ||
    !value.names.every(
      (name) => typeof name === 'string' && name.trim().length > 0 && name.length <= 80,
    ) ||
    typeof value.size !== 'number' ||
    !Array.isArray(value.rounds) ||
    value.rounds.length === 0 ||
    (value.phase !== 'ready' &&
      value.phase !== 'playing' &&
      value.phase !== 'turnFinished' &&
      value.phase !== 'matchFinished' &&
      value.phase !== 'complete')
  )
    return null;
  const names: string[] = value.names;
  const size = value.size;
  let players = names.map((_, index) => index);
  let unfinished = false;
  const rounds: Match[][] = [];
  for (const [roundIndex, rawRound] of value.rounds.entries()) {
    if (!Array.isArray(rawRound) || rawRound.length !== players.length / 2 || players.length < 2)
      return null;
    const winners: number[] = [];
    const round: Match[] = [];
    for (const [index, raw] of rawRound.entries()) {
      const first = players[index * 2];
      const second = players[index * 2 + 1];
      if (
        first === undefined ||
        second === undefined ||
        !isJsonObject(raw) ||
        !Array.isArray(raw.players) ||
        raw.players.length !== 2 ||
        raw.players[0] !== first ||
        raw.players[1] !== second ||
        typeof raw.boardCode !== 'string' ||
        parseBoardCode(raw.boardCode)?.size !== size ||
        !Array.isArray(raw.results) ||
        raw.results.length !== 2
      )
        return null;
      const a = raw.results[0] === null ? null : readResult(raw.results[0], size);
      const b = raw.results[1] === null ? null : readResult(raw.results[1], size);
      if ((raw.results[0] !== null && !a) || (raw.results[1] !== null && !b) || (b && !a))
        return null;
      let winner: number | null = null;
      if (a && b) {
        if (unfinished) return null;
        winner =
          a.moves < b.moves || (a.moves === b.moves && a.elapsedMs <= b.elapsedMs) ? first : second;
        winners.push(winner);
      } else {
        if (unfinished && a) return null;
        unfinished = true;
      }
      if (raw.winner !== winner) return null;
      round.push({ players: [first, second], boardCode: raw.boardCode, results: [a, b], winner });
    }
    if (roundIndex < value.rounds.length - 1 && unfinished) return null;
    rounds.push(round);
    players = winners;
  }
  if (value.snapshot !== null && typeof value.snapshot !== 'string') return null;
  const tournament: Tournament = {
    version: 1,
    names,
    size,
    rounds,
    phase: value.phase,
    snapshot: value.snapshot,
  };
  const match = currentMatch(tournament);
  if (value.phase === 'complete') {
    if (unfinished || rounds.at(-1)?.length !== 1 || value.snapshot !== null) return null;
  } else if (value.phase === 'matchFinished') {
    if (
      !rounds.at(-1)?.some((m) => m.winner !== null) ||
      (unfinished && match.results[0] !== null) ||
      value.snapshot !== null
    )
      return null;
  } else {
    if (!unfinished || (value.phase === 'turnFinished' && match.results[0] === null)) return null;
    // Ready can describe either player's turn after selecting Next turn.
    if (value.phase === 'playing') {
      if (typeof value.snapshot !== 'string') return null;
      const game = decodeSnapshot(value.snapshot);
      if (!game || isWon(game) || game.boardCode !== match.boardCode) return null;
    } else if (value.snapshot !== null) return null;
  }
  return tournament;
}
