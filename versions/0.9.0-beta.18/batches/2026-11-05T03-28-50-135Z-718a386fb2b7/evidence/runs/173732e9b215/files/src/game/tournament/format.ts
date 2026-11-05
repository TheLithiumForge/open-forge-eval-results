import { isValidSize, parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { isJsonObject, isNonnegativeSafeInteger, parseJson } from '../saved-format.ts';
import { currentMatch } from './tournament.ts';
import type { Match, Score, TournamentData } from './tournament.ts';

function isScore(value: unknown): value is Score {
  return (
    isJsonObject(value) &&
    isNonnegativeSafeInteger(value.moves) &&
    value.moves <= MOVES_MAX &&
    isNonnegativeSafeInteger(value.elapsedMs) &&
    value.elapsedMs <= ELAPSED_MAX_MS
  );
}

export function readTournament(text: string): TournamentData | null {
  const value = text.length <= 1_000_000 ? parseJson(text) : undefined;
  if (
    !isJsonObject(value) ||
    value.version !== 1 ||
    typeof value.size !== 'number' ||
    !isValidSize(value.size) ||
    !Array.isArray(value.names) ||
    ![4, 8].includes(value.names.length) ||
    !value.names.every(
      (name: unknown) => typeof name === 'string' && name.trim().length > 0 && name.length <= 100,
    ) ||
    !Array.isArray(value.rounds) ||
    value.rounds.length !== Math.log2(value.names.length) ||
    !isNonnegativeSafeInteger(value.round) ||
    !isNonnegativeSafeInteger(value.match) ||
    (value.turn !== 0 && value.turn !== 1) ||
    !['ready', 'playing', 'turnDone', 'matchDone', 'complete'].includes(String(value.phase)) ||
    !(value.snapshot === null || typeof value.snapshot === 'string')
  )
    return null;
  const names: string[] = value.names;
  const rounds: Match[][] = [];
  for (let r = 0; r < value.rounds.length; r++) {
    const input: unknown = value.rounds[r];
    if (!Array.isArray(input) || input.length !== names.length / 2 ** (r + 1)) return null;
    const round: Match[] = [];
    for (const item of input) {
      if (
        !isJsonObject(item) ||
        !Array.isArray(item.players) ||
        item.players.length !== 2 ||
        !item.players.every(
          (p: unknown) => p === null || (isNonnegativeSafeInteger(p) && p < names.length),
        ) ||
        !Array.isArray(item.scores) ||
        item.scores.length !== 2 ||
        !item.scores.every((s: unknown) => s === null || isScore(s)) ||
        !(
          item.winner === null ||
          (isNonnegativeSafeInteger(item.winner) && item.players.includes(item.winner))
        ) ||
        !(
          item.boardCode === null ||
          (typeof item.boardCode === 'string' &&
            parseBoardCode(item.boardCode)?.size === value.size)
        )
      )
        return null;
      round.push({
        players: [item.players[0], item.players[1]],
        scores: [item.scores[0] ?? null, item.scores[1] ?? null],
        winner: item.winner,
        boardCode: item.boardCode,
      });
    }
    rounds.push(round);
  }
  const round = value.rounds[value.round];
  if (!Array.isArray(round) || value.match >= round.length) return null;
  const phase = value.phase;
  if (
    phase !== 'ready' &&
    phase !== 'playing' &&
    phase !== 'turnDone' &&
    phase !== 'matchDone' &&
    phase !== 'complete'
  )
    return null;
  const data: TournamentData = {
    version: 1,
    size: value.size,
    names,
    rounds,
    round: value.round,
    match: value.match,
    turn: value.turn,
    phase,
    snapshot: value.snapshot,
  };
  const match = currentMatch(data);
  if (
    match.players.some((p) => p === null) ||
    (phase === 'playing' && (!match.boardCode || !data.snapshot)) ||
    (phase === 'turnDone' && (!match.scores[0] || data.turn !== 0)) ||
    ((phase === 'matchDone' || phase === 'complete') && match.winner === null)
  )
    return null;
  if (data.snapshot) {
    const game = decodeSnapshot(data.snapshot);
    if (!game || game.boardCode !== match.boardCode || phase !== 'playing') return null;
  }
  return isConsistent(data) ? data : null;
}

function isConsistent(data: TournamentData): boolean {
  const current = currentMatch(data);
  if (data.phase === 'complete' && data.round !== data.rounds.length - 1) return false;
  for (let r = 0; r < data.rounds.length; r++) {
    const round = data.rounds[r];
    if (!round) return false;
    for (let m = 0; m < round.length; m++) {
      const match = round[m];
      if (!match) return false;
      const order = r - data.round || m - data.match;
      for (let p = 0; p < 2; p++) {
        const source = data.rounds[r - 1]?.[m * 2 + p];
        const sourcePlayed =
          r > 0 && (r - 1 < data.round || (r - 1 === data.round && m * 2 + p < data.match));
        const expected = r === 0 ? m * 2 + p : sourcePlayed ? source?.winner : null;
        if (match.players[p] !== expected) return false;
      }
      const [first, second] = match.scores;
      if (
        (first && first.moves < data.size ** 2 / 2) ||
        (second && second.moves < data.size ** 2 / 2)
      )
        return false;
      if (order < 0 || (order === 0 && (data.phase === 'matchDone' || data.phase === 'complete'))) {
        if (!first || !second || !match.boardCode || match.winner === null) return false;
        const comparison = first.moves - second.moves || first.elapsedMs - second.elapsedMs;
        if (!comparison || match.winner !== match.players[comparison < 0 ? 0 : 1]) return false;
      } else if (
        order > 0 &&
        (first || second || match.winner !== null || match.boardCode !== null)
      )
        return false;
    }
  }
  if (data.phase === 'matchDone' || data.phase === 'complete') return data.turn === 1;
  if (current.winner !== null || current.scores[1] !== null) return false;
  if (data.phase === 'turnDone')
    return data.turn === 0 && current.scores[0] !== null && current.boardCode !== null;
  if (data.turn === 0 && current.scores[0] !== null) return false;
  if (data.turn === 1 && (!current.scores[0] || !current.boardCode)) return false;
  return true;
}
