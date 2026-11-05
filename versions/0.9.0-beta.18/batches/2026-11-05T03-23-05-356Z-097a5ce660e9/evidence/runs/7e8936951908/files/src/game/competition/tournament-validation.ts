import { isJsonObject, hasExactKeys, isNonnegativeSafeInteger } from '../saved-format.ts';
import { createTournament, normalizePlayerName, playerNamesError } from './tournament.ts';
import { readTournamentMatch } from './tournament-validation-match.ts';
import {
  isTournamentProgressValid,
  isTournamentPhaseValid,
  readTournamentPhase,
} from './tournament-validation-state.ts';
import type { Tournament, TournamentMatch, TournamentPlayer } from './tournament.ts';

export function decodeTournament(value: unknown): Tournament | null {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, [
      'startedAt',
      'players',
      'matches',
      'currentMatch',
      'turn',
      'phase',
      'champion',
    ])
  )
    return null;
  if (
    !isNonnegativeSafeInteger(value.startedAt) ||
    !Array.isArray(value.players) ||
    !Array.isArray(value.matches)
  )
    return null;
  const players: TournamentPlayer[] = [];
  for (const player of value.players) {
    if (
      !isJsonObject(player) ||
      !hasExactKeys(player, ['seed', 'name']) ||
      typeof player.name !== 'string' ||
      player.seed !== players.length + 1 ||
      normalizePlayerName(player.name) !== player.name
    )
      return null;
    players.push({ seed: player.seed, name: player.name });
  }
  const names = players.map((player) => player.name);
  if (playerNamesError(names)) return null;
  const count = names.length;
  if (count !== 4 && count !== 8) return null;
  const codes: string[] = [];
  for (const match of value.matches) {
    if (!isJsonObject(match) || typeof match.boardCode !== 'string') return null;
    codes.push(match.boardCode);
  }
  const initial = createTournament(names, codes, value.startedAt);
  if (!initial || value.matches.length !== initial.matches.length) return null;
  const matches: TournamentMatch[] = [];
  for (let index = 0; index < value.matches.length; index += 1) {
    const match = readTournamentMatch(value.matches[index], initial.matches[index]);
    if (!match) return null;
    matches.push(match);
  }
  if (!isTournamentProgressValid(matches, count)) return null;
  if (!isNonnegativeSafeInteger(value.currentMatch) || value.currentMatch >= matches.length)
    return null;
  if (value.turn !== 0 && value.turn !== 1) return null;
  const phase = readTournamentPhase(value.phase);
  if (!phase) return null;
  if (value.champion !== null && !isNonnegativeSafeInteger(value.champion)) return null;
  const tournament: Tournament = {
    startedAt: value.startedAt,
    players,
    matches,
    currentMatch: value.currentMatch,
    turn: value.turn,
    phase,
    champion: value.champion,
  };
  return isTournamentPhaseValid(tournament) ? tournament : null;
}
