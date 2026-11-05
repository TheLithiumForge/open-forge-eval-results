import { hasExactKeys, isJsonObject } from '../saved-format.ts';
import { roundDefinitions, type Tournament, type TournamentPlayer, type TournamentPlayerCount, type TournamentRound } from './tournament.ts';
import {
  readTournamentCurrent,
  readTournamentMatch,
  readTournamentPlayer,
  validTournamentPairings,
  validTournamentProgress,
} from './tournament-validation-entries.ts';

export function isValidTournament(value: unknown): value is Tournament {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['champion', 'current', 'entrants', 'playerCount', 'rounds', 'status']) ||
    (value.playerCount !== 4 && value.playerCount !== 8) ||
    (value.status !== 'active' && value.status !== 'complete') ||
    !Array.isArray(value.entrants) ||
    !Array.isArray(value.rounds)
  )
    return false;
  const playerCount = value.playerCount as TournamentPlayerCount;
  if (value.entrants.length !== playerCount) return false;
  const entrants = value.entrants.map((entry) => readTournamentPlayer(entry, playerCount));
  if (entrants.some((entry) => entry === undefined)) return false;
  const validEntrants = entrants as TournamentPlayer[];
  if (validEntrants.some((entry, index) => entry.seed !== index + 1)) return false;
  if (new Set(validEntrants.map((entry) => entry.name.toLowerCase())).size !== playerCount) return false;

  const definitions = roundDefinitions(playerCount);
  if (value.rounds.length !== definitions.length) return false;
  const usedCodes = new Set<string>();
  const rounds: TournamentRound[] = [];
  for (let roundIndex = 0; roundIndex < definitions.length; roundIndex += 1) {
    const rawRound = value.rounds[roundIndex];
    const definition = definitions[roundIndex]!;
    if (
      !isJsonObject(rawRound) ||
      !hasExactKeys(rawRound, ['matches', 'name', 'size']) ||
      rawRound.name !== definition.name ||
      rawRound.size !== definition.size ||
      !Array.isArray(rawRound.matches) ||
      rawRound.matches.length !== definition.matchCount
    )
      return false;
    const matches: TournamentRound['matches'][number][] = [];
    for (const rawMatch of rawRound.matches) {
      const match = readTournamentMatch(rawMatch, playerCount, definition.size);
      if (!match || usedCodes.has(match.boardCode)) return false;
      usedCodes.add(match.boardCode);
      matches.push(match);
    }
    rounds.push({ matches, name: definition.name, size: definition.size });
  }
  if (!validTournamentPairings(validEntrants, rounds, playerCount)) return false;

  const champion = readTournamentPlayer(value.champion, playerCount, true);
  const current = readTournamentCurrent(value.current, rounds);
  if (champion === undefined || current === undefined) return false;
  const tournament = {
    champion,
    current,
    entrants: validEntrants,
    playerCount,
    rounds,
    status: value.status,
  } as Tournament;
  return validTournamentProgress(tournament);
}
