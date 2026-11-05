import { ELAPSED_MAX_MS, isWon } from '../game.ts';
import { hasExactKeys, isJsonObject, isNonnegativeSafeInteger } from '../saved-format.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { tournamentBracket } from './bracket.ts';
import { readTournamentRecord } from './record-format.ts';
import type { GameState } from '../game.ts';
import type { TournamentProgress } from './tournament.ts';

function readTurnGame(value: unknown): GameState | null {
  const game = decodeSnapshot(JSON.stringify(value));
  if (game) return game;
  // Start turn starts the clock before a card is revealed. Solo snapshots start on revelation.
  if (
    !isJsonObject(value) ||
    value.started !== true ||
    !isNonnegativeSafeInteger(value.elapsedMs) ||
    value.elapsedMs > ELAPSED_MAX_MS
  )
    return null;
  const unplayed = decodeSnapshot(JSON.stringify({ ...value, started: false, elapsedMs: 0 }));
  return unplayed ? { ...unplayed, started: true, elapsedMs: value.elapsedMs } : null;
}

export function readTournamentProgress(value: unknown): TournamentProgress | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['tournament', 'matchIndex', 'phase', 'game']) ||
    !isNonnegativeSafeInteger(value.matchIndex)
  )
    return null;
  const tournament = readTournamentRecord(value.tournament);
  if (!tournament) return null;
  const match = tournament.matches[value.matchIndex];
  if (!match) return null;
  const bracket = tournamentBracket(tournament);
  if (
    bracket.slice(0, value.matchIndex).some((entry) => entry.winner === null) ||
    tournament.matches.slice(value.matchIndex + 1).some((entry) => entry.results.length > 0)
  )
    return null;
  const { phase } = value;
  const count = match.results.length;
  if (phase === 'complete') {
    if (value.matchIndex !== tournament.matches.length - 1 || bracket.at(-1)?.winner === null)
      return null;
  } else if (phase === 'match-complete') {
    if (
      count !== 2 ||
      (value.matchIndex === tournament.matches.length - 1 && bracket.at(-1)?.winner !== null)
    )
      return null;
  } else if (phase === 'turn-complete') {
    if (count !== 1) return null;
  } else if (phase === 'ready' || phase === 'playing') {
    if (count > 1) return null;
  } else return null;
  const game = value.game === null ? null : readTurnGame(value.game);
  if (value.game !== null && (!game || isWon(game) || game.boardCode !== match.boardCode))
    return null;
  if ((phase === 'playing' && !game) || (phase !== 'ready' && phase !== 'playing' && game))
    return null;
  return { tournament, matchIndex: value.matchIndex, phase, game };
}
