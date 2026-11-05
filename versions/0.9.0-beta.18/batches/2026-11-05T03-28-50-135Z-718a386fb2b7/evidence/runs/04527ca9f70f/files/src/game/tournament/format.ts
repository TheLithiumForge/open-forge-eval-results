import { isJsonObject, hasExactKeys, isWithinBytes, parseJson } from '../saved-format.ts';
import { isWon } from '../game.ts';
import { encodeSnapshot } from '../snapshot.ts';
import { readTournamentState } from './validation.ts';
import type { TournamentImport, TournamentRecord, TournamentState } from './model.ts';

const MAX_TOURNAMENT_BYTES = 262_144;
const FORMAT = 'neon-pairs/tournament';

export function encodeTournament(state: TournamentState | TournamentRecord): string {
  const candidate = 'activeGame' in state ? state.activeGame : null;
  const activeGame = candidate && !isWon(candidate) ? candidate : null;
  const tournament = {
    activeGame: activeGame ? encodeSnapshot(activeGame) : null,
    championSeed: state.championSeed,
    currentMatch: state.currentMatch,
    currentTurn: state.currentTurn,
    matches: state.matches.map((match) => ({
      boardCode: match.boardCode,
      feeders: match.feeders,
      matchNumber: match.matchNumber,
      playerSeeds: match.playerSeeds,
      results: match.results.map((result) =>
        result ? { elapsedMs: result.elapsedMs, moves: result.moves, seed: result.seed } : null,
      ),
      round: match.round,
      size: match.size,
      winnerSeed: match.winnerSeed,
    })),
    players: state.players.map((player) => ({ name: player.name, seed: player.seed })),
    status: state.status,
  };
  return JSON.stringify({ format: FORMAT, tournament, version: 1 }, null, 2);
}

export function encodeTournamentSetup(count: number, names: readonly string[]): string {
  return JSON.stringify(
    {
      format: FORMAT,
      tournament: { kind: 'setup', names, players: count },
      version: 1,
    },
    null,
    2,
  );
}

export function decodeTournament(text: string): TournamentImport | null {
  if (!isWithinBytes(text, MAX_TOURNAMENT_BYTES)) return null;
  const value = parseJson(text);
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['format', 'tournament', 'version']) ||
    value.format !== FORMAT ||
    value.version !== 1
  )
    return null;
  if (isJsonObject(value.tournament) && value.tournament.kind === 'setup') {
    const setup = value.tournament;
    if (!hasExactKeys(setup, ['kind', 'names', 'players'])) return null;
    if (
      (setup.players !== 4 && setup.players !== 8) ||
      !Array.isArray(setup.names) ||
      setup.names.length !== 8
    )
      return null;
    const names: string[] = [];
    for (const name of setup.names) {
      if (typeof name !== 'string') return null;
      names.push(name);
    }
    return { kind: 'setup', count: setup.players, names };
  }
  const state = readTournamentState(value.tournament);
  return state ? { kind: 'event', state } : null;
}
