import { decodeSnapshot } from '../snapshot.ts';
import { isJsonObject, hasExactKeys, parseJson } from '../saved-format.ts';
import { decodeTournament } from './tournament-validation.ts';
import type { GameState } from '../game.ts';
import type { Tournament } from './tournament.ts';

export { decodeTournament } from './tournament-validation.ts';

export type TournamentPayload =
  | { readonly kind: 'setup'; readonly playerCount: 4 | 8; readonly names: readonly string[] }
  | {
      readonly kind: 'tournament';
      readonly tournament: Tournament;
      readonly game: GameState | null;
    };

export function encodeTournamentJson(
  tournament: Tournament | null,
  playerCount: 4 | 8,
  names: readonly string[],
  gameSnapshot: string,
): string {
  if (!tournament) {
    return JSON.stringify(
      { version: 1, type: 'setup', playerCount, names: names.slice(0, playerCount) },
      null,
      2,
    );
  }
  const game = tournament.phase === 'playing' ? parseJson(gameSnapshot) : null;
  return JSON.stringify({ version: 1, type: 'tournament', tournament, game }, null, 2);
}

export function decodeTournamentJson(text: string): TournamentPayload | null {
  if (new TextEncoder().encode(text).byteLength > 65_536) return null;
  const value = parseJson(text);
  if (!isJsonObject(value) || value.version !== 1 || typeof value.type !== 'string') return null;
  if (value.type === 'setup') {
    if (!hasExactKeys(value, ['version', 'type', 'playerCount', 'names'])) return null;
    if (
      (value.playerCount !== 4 && value.playerCount !== 8) ||
      !stringArray(value.names, value.playerCount)
    )
      return null;
    return { kind: 'setup', playerCount: value.playerCount, names: value.names };
  }
  if (
    value.type !== 'tournament' ||
    !hasExactKeys(value, ['version', 'type', 'tournament', 'game'])
  )
    return null;
  const tournament = decodeTournament(value.tournament);
  if (!tournament) return null;
  if (value.game === null)
    return tournament.phase === 'playing' ? null : { kind: 'tournament', tournament, game: null };
  if (tournament.phase !== 'playing') return null;
  const game = decodeSnapshot(JSON.stringify(value.game));
  const match = tournament.matches[tournament.currentMatch];
  if (!game || !match || game.boardCode !== match.boardCode) return null;
  return { kind: 'tournament', tournament, game };
}

function stringArray(value: unknown, length: number): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((item) => typeof item === 'string')
  );
}
