import { hasExactKeys, isJsonObject, isWithinBytes, parseJson } from '../saved-format.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { hasTournamentChampion, readTournamentRecord } from './record-format.ts';
import { readTournamentProgress } from './progress-format.ts';
import type { TournamentRecord, TournamentWorkspace } from './tournament.ts';

const TOURNAMENT_MAX_BYTES = 16_777_216;

export function encodeTournament(workspace: TournamentWorkspace): string {
  const { active } = workspace;
  return JSON.stringify(
    {
      version: 1,
      active: active
        ? { ...active, game: active.game ? parseJson(encodeSnapshot(active.game)) : null }
        : null,
      past: workspace.past,
    },
    null,
    2,
  );
}

export function decodeTournament(text: string): TournamentWorkspace | null {
  const value = isWithinBytes(text, TOURNAMENT_MAX_BYTES) ? parseJson(text) : undefined;
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['version', 'active', 'past']) ||
    value.version !== 1 ||
    !Array.isArray(value.past)
  )
    return null;
  const past: TournamentRecord[] = [];
  const ids = new Set<string>();
  for (const entry of value.past) {
    const record = readTournamentRecord(entry);
    if (!record || !hasTournamentChampion(record) || ids.has(record.id)) return null;
    ids.add(record.id);
    past.push(record);
  }
  const active = value.active === null ? null : readTournamentProgress(value.active);
  if (value.active !== null && !active) return null;
  return { active, past };
}
