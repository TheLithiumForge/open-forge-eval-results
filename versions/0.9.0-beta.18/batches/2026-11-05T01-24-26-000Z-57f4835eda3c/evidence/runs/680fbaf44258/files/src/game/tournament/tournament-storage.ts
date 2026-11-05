import { isJsonObject, parseJson } from '../saved-format.ts';
import { champion } from './bracket.ts';
import { readSavedTournament, tournamentValue, TournamentStage } from './tournament-format.ts';
import type { PreferenceStore } from '../session/storage.ts';
import type { Tournament } from './bracket.ts';

export const PAST_TOURNAMENTS_KEY = 'neon-pairs.tournaments.v1';
export const PAST_TOURNAMENTS_VERSION = 1;
// The list keeps the most recent finished tournaments, so saved data stays small.
export const PAST_TOURNAMENTS_MAX = 50;

// Unreadable saved data gives an empty list, and one damaged entry drops only itself.
export function readPastTournaments(store: PreferenceStore | null): readonly Tournament[] {
  try {
    const value = parseJson(store?.getItem(PAST_TOURNAMENTS_KEY) ?? '');
    if (
      !isJsonObject(value) ||
      value.schemaVersion !== PAST_TOURNAMENTS_VERSION ||
      !Array.isArray(value.tournaments)
    )
      return [];
    return value.tournaments
      .flatMap((entry: unknown) => {
        const saved = readSavedTournament(entry);
        if (!saved || saved.stage !== TournamentStage.ended || champion(saved) === null) return [];
        return [{ players: saved.players, matches: saved.matches }];
      })
      .slice(-PAST_TOURNAMENTS_MAX);
  } catch {
    return [];
  }
}

export function rememberTournament(
  past: readonly Tournament[],
  tournament: Tournament,
): readonly Tournament[] {
  return [...past, tournament].slice(-PAST_TOURNAMENTS_MAX);
}

export function writePastTournaments(
  store: PreferenceStore | null,
  past: readonly Tournament[],
): void {
  try {
    store?.setItem(
      PAST_TOURNAMENTS_KEY,
      JSON.stringify({
        schemaVersion: PAST_TOURNAMENTS_VERSION,
        tournaments: past.map((tournament) =>
          tournamentValue({ ...tournament, stage: TournamentStage.ended, game: null }),
        ),
      }),
    );
  } catch {
    // A blocked browser store keeps the list for this page only.
  }
}
