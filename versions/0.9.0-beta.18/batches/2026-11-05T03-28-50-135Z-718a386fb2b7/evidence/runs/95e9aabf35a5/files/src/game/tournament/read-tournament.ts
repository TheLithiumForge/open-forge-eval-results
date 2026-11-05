import { isValidSize, parseBoardCode } from '../deck.ts';
import { ELAPSED_MAX_MS, MOVES_MAX } from '../game.ts';
import { isJsonObject, isNonnegativeSafeInteger, parseJson } from '../saved-format.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { createTournament } from './tournament.ts';
import type { Tournament } from './tournament.ts';

interface Result {
  moves: number;
  elapsedMs: number;
}

function readResult(value: unknown, minimum: number): value is Result {
  return (
    isJsonObject(value) &&
    isNonnegativeSafeInteger(value.moves) &&
    value.moves >= minimum &&
    value.moves <= MOVES_MAX &&
    isNonnegativeSafeInteger(value.elapsedMs) &&
    value.elapsedMs <= ELAPSED_MAX_MS
  );
}

// Rebuild the bracket from its results so imported participants and winners cannot contradict it.
export function readTournament(
  text: string,
): { tournament: Tournament; snapshot: string | null } | null {
  if (text.length > 200_000) return null;
  const data = parseJson(text);
  if (!isJsonObject(data) || !isJsonObject(data.tournament)) return null;
  const input = data.tournament;
  if (
    input.version !== 1 ||
    typeof input.id !== 'string' ||
    input.id.length === 0 ||
    input.id.length > 100 ||
    !Array.isArray(input.names) ||
    ![4, 8].includes(input.names.length) ||
    !input.names.every(
      (name: unknown) => typeof name === 'string' && name.trim().length > 0 && name.length <= 100,
    ) ||
    typeof input.size !== 'number' ||
    !isValidSize(input.size) ||
    !Array.isArray(input.rounds)
  )
    return null;
  const tournament = createTournament(input.names, input.size, input.id);
  if (input.rounds.length !== tournament.rounds.length) return null;
  let ended = false;
  for (let round = 0; round < tournament.rounds.length; round += 1) {
    const sourceRound: unknown = input.rounds[round];
    const expectedRound = tournament.rounds[round];
    if (
      !Array.isArray(sourceRound) ||
      !expectedRound ||
      sourceRound.length !== expectedRound.length
    )
      return null;
    for (let index = 0; index < expectedRound.length; index += 1) {
      const source: unknown = sourceRound[index];
      const expected = expectedRound[index];
      if (
        !expected ||
        !isJsonObject(source) ||
        !Array.isArray(source.players) ||
        !Array.isArray(source.results) ||
        source.results.length !== 2 ||
        JSON.stringify(source.players) !== JSON.stringify(expected.players)
      )
        return null;
      const [first, second] = source.results;
      if (
        (first !== null && !readResult(first, tournament.size ** 2 / 2)) ||
        (second !== null && !readResult(second, tournament.size ** 2 / 2)) ||
        (second !== null && first === null) ||
        (ended && (first !== null || second !== null))
      )
        return null;
      if (
        source.boardCode !== null &&
        (typeof source.boardCode !== 'string' ||
          parseBoardCode(source.boardCode)?.size !== tournament.size)
      )
        return null;
      if ((first !== null || second !== null) && source.boardCode === null) return null;
      if (first !== null) expected.results[0] = first;
      if (second !== null) {
        expected.results[1] = second;
        const winner =
          first &&
          (first.moves < second.moves ||
            (first.moves === second.moves && first.elapsedMs <= second.elapsedMs))
            ? expected.players[0]
            : expected.players[1];
        expected.winner = winner;
        const following = tournament.rounds[round + 1]?.[Math.floor(index / 2)];
        if (following) following.players[index % 2] = winner;
      } else ended = true;
      if (source.winner !== expected.winner) return null;
      expected.boardCode = source.boardCode;
    }
  }
  if (
    !isNonnegativeSafeInteger(input.round) ||
    !isNonnegativeSafeInteger(input.match) ||
    !['ready', 'playing', 'turnEnd', 'matchEnd', 'complete'].includes(String(input.phase))
  )
    return null;
  const match = tournament.rounds[input.round]?.[input.match];
  if (!match) return null;
  const phase = input.phase;
  if (
    phase !== 'ready' &&
    phase !== 'playing' &&
    phase !== 'turnEnd' &&
    phase !== 'matchEnd' &&
    phase !== 'complete'
  )
    return null;
  if (
    (phase === 'turnEnd' && (!match.results[0] || match.results[1])) ||
    ((phase === 'matchEnd' || phase === 'complete') && !match.winner && match.winner !== 0) ||
    ((phase === 'ready' || phase === 'playing') &&
      (match.results[1] || match.players.includes(null))) ||
    (phase === 'complete' && input.round !== tournament.rounds.length - 1) ||
    (phase === 'matchEnd' && input.round === tournament.rounds.length - 1)
  )
    return null;
  // The current match must be the first unfinished match, or the last completed one.
  const flat = tournament.rounds.flat();
  const position = flat.indexOf(match);
  if (
    flat.slice(0, position).some((item) => item.results[1] === null) ||
    flat.slice(position + 1).some((item) => item.results[0] !== null || item.boardCode !== null)
  )
    return null;
  tournament.round = input.round;
  tournament.match = input.match;
  tournament.phase = phase;
  let snapshot: string | null = null;
  if (phase === 'playing') {
    if (typeof data.snapshot !== 'string') return null;
    const game = decodeSnapshot(data.snapshot);
    if (!game || game.boardCode !== match.boardCode) return null;
    snapshot = data.snapshot;
  } else if (data.snapshot !== null) return null;
  return { tournament, snapshot };
}
