import { readRounds } from './format-rounds-read.ts';
import { normalizeName, validateNames } from './names.ts';
import { hasExactKeys, isJsonObject } from '../saved-format.ts';
import type { PlayerCount, TournamentPlayer, TournamentRecord } from './model.ts';

const RECORD_KEYS = ['playerCount', 'players', 'rounds'] as const;
const PLAYER_KEYS = ['name', 'seed'] as const;

export function readTournamentRecord(value: unknown): TournamentRecord | null {
  if (!isJsonObject(value) || !hasExactKeys(value, RECORD_KEYS)) return null;
  if (value.playerCount !== 4 && value.playerCount !== 8) return null;
  const record = readRecordValues(value.playerCount, value.players, value.rounds, true);
  return record && record.rounds.at(-1)?.matches[0]?.winnerSeed ? record : null;
}

export function readRecordValues(
  countValue: unknown,
  playersValue: unknown,
  roundsValue: unknown,
  requireComplete: boolean,
): TournamentRecord | null {
  if (countValue !== 4 && countValue !== 8) return null;
  const count: PlayerCount = countValue;
  const players = readPlayers(playersValue, count, true);
  const rounds = readRounds(roundsValue, count, requireComplete);
  if (!players || !rounds) return null;
  const names = players.map((player) => player.name);
  const normalized = validateNames(names, count);
  if (normalized.error || names.some((name, index) => name !== normalizeName(name))) return null;
  return { playerCount: count, players, rounds };
}

export function readPlayers(
  value: unknown,
  count: PlayerCount,
  requireNames: boolean,
): readonly TournamentPlayer[] | null {
  if (!Array.isArray(value) || value.length !== count) return null;
  const players: TournamentPlayer[] = [];
  for (let index = 0; index < count; index += 1) {
    const player = value[index];
    if (
      !isJsonObject(player) ||
      !hasExactKeys(player, PLAYER_KEYS) ||
      typeof player.name !== 'string' ||
      player.seed !== index + 1
    )
      return null;
    if (requireNames && player.name !== normalizeName(player.name)) return null;
    players.push({ name: player.name, seed: player.seed });
  }
  return players;
}
