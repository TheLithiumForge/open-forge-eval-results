import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { isWon } from '../game.ts';
import {
  isJsonObject,
  isNonnegativeSafeInteger,
  isWithinBytes,
  parseJson,
} from '../saved-format.ts';
import { TournamentPhase } from './rules.ts';
import { readTournamentRecord, tournamentFields } from './validation.ts';
import type { GameState } from '../game.ts';
import type { TournamentRecord } from './rules.ts';

export interface TournamentRun {
  readonly event: TournamentRecord;
  readonly matchIndex: number;
  readonly phase: TournamentPhase;
  readonly game: GameState | null;
}
export interface TournamentSetup {
  readonly count: number;
  readonly names: readonly string[];
}
export interface TournamentDocument {
  readonly setup: TournamentSetup;
  readonly run: TournamentRun | null;
}
export const TOURNAMENT_MAX_BYTES = 65_536;

export function encodeTournament(document: TournamentDocument): string {
  const { run, setup } = document;
  const value = {
    format: 'neon-pairs/tournament',
    run: run ? { ...run, game: run.game ? parseJson(encodeSnapshot(run.game)) : null } : null,
    setup,
    version: 1,
  };
  return JSON.stringify(
    value,
    (_key, item: unknown) => {
      if (!isJsonObject(item)) return item;
      return Object.fromEntries(
        Object.keys(item)
          .sort()
          .map((key) => [key, item[key]]),
      );
    },
    2,
  );
}

function readGame(value: unknown): GameState {
  const game = tournamentFields(value, [
    'version',
    'boardCode',
    'matched',
    'selection',
    'moves',
    'elapsedMs',
    'started',
  ]);
  if (isJsonObject(game.selection)) {
    const keys =
      game.selection.kind === 'closed'
        ? ['kind']
        : game.selection.kind === 'one'
          ? ['kind', 'index']
          : ['kind', 'first', 'second', 'remainingMs'];
    tournamentFields(game.selection, keys);
  }
  const decoded = decodeSnapshot(JSON.stringify(game));
  if (!decoded || isWon(decoded)) throw new Error('Invalid tournament game.');
  return decoded;
}

function readRun(value: unknown): TournamentRun {
  const run = tournamentFields(value, ['event', 'matchIndex', 'phase', 'game']);
  const event = readTournamentRecord(run.event);
  const { matchIndex, phase } = run;
  if (!isNonnegativeSafeInteger(matchIndex) || matchIndex >= event.matches.length)
    throw new Error('Invalid tournament match.');
  if (
    phase !== TournamentPhase.ready &&
    phase !== TournamentPhase.playing &&
    phase !== TournamentPhase.turnResult &&
    phase !== TournamentPhase.matchResult &&
    phase !== TournamentPhase.complete
  )
    throw new Error('Invalid tournament phase.');
  const match = event.matches[matchIndex];
  if (
    !match ||
    event.matches.slice(0, matchIndex).some((match) => match.results.length !== 2) ||
    event.matches.slice(matchIndex + 1).some((match) => match.results.length !== 0)
  )
    throw new Error('Invalid tournament progression.');
  const count = match.results.length;
  if (
    phase === TournamentPhase.ready || phase === TournamentPhase.playing
      ? count >= 2
      : phase === TournamentPhase.turnResult
        ? count !== 1
        : count !== 2
  )
    throw new Error('Invalid tournament progression.');
  const final = matchIndex === event.matches.length - 1;
  if (
    (phase === TournamentPhase.complete && !final) ||
    (phase === TournamentPhase.matchResult && final)
  )
    throw new Error('Invalid tournament progression.');
  const game = run.game === null ? null : readGame(run.game);
  if (
    (phase === TournamentPhase.playing && !game) ||
    (game &&
      (game.boardCode !== match.boardCode ||
        (phase !== TournamentPhase.ready && phase !== TournamentPhase.playing)))
  )
    throw new Error('Invalid tournament game.');
  return {
    event,
    matchIndex,
    phase: phase === TournamentPhase.playing ? TournamentPhase.ready : phase,
    game,
  };
}

export function decodeTournament(text: string): TournamentDocument | string {
  try {
    if (!isWithinBytes(text, TOURNAMENT_MAX_BYTES)) throw new Error('Invalid tournament.');
    const root = tournamentFields(parseJson(text), ['format', 'version', 'setup', 'run']);
    if (root.format !== 'neon-pairs/tournament' || root.version !== 1)
      throw new Error('Invalid tournament format or version.');
    const setup = tournamentFields(root.setup, ['count', 'names']);
    if (
      (setup.count !== 4 && setup.count !== 8) ||
      !Array.isArray(setup.names) ||
      setup.names.length !== 8
    )
      throw new Error('Invalid tournament setup.');
    const names: string[] = [];
    for (const name of setup.names) {
      if (typeof name !== 'string') throw new Error('Invalid tournament name.');
      names.push(name);
    }
    return {
      setup: { count: setup.count, names },
      run: root.run === null ? null : readRun(root.run),
    };
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid tournament.';
  }
}
