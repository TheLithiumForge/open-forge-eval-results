import { createGame } from '../game.ts';
import { createTournament, nextTurn, PLAYER_COUNTS, recordTurn } from './bracket.ts';
import { TournamentStage } from './tournament-format.ts';
import type { GameState } from '../game.ts';
import type { Tournament } from './bracket.ts';
import type { SavedTournament, TournamentStageKind } from './tournament-format.ts';

const DRAFT_SLOTS = Math.max(...PLAYER_COUNTS);

export interface TournamentFlow {
  readonly count: number;
  // Every name slot keeps its draft, so switching from 8 players to 4 and back loses no typing.
  readonly draft: readonly string[];
  readonly tournament: Tournament | null;
  readonly phase: TournamentStageKind;
  // The game Start turn opens, kept while that turn is on screen. A loaded turn in progress
  // resumes from it.
  readonly progress: GameState | null;
  // A turn finished in this page keeps its board on screen until Next turn or Next match.
  readonly board: boolean;
  // Counts started turns, so each turn mounts a fresh game and clock.
  readonly turn: number;
}

export function setupFlow(): TournamentFlow {
  return {
    count: PLAYER_COUNTS[0],
    draft: Array.from({ length: DRAFT_SLOTS }, () => ''),
    tournament: null,
    phase: TournamentStage.setup,
    progress: null,
    board: false,
    turn: 0,
  };
}

export function editDraft(flow: TournamentFlow, index: number, name: string): TournamentFlow {
  return { ...flow, draft: flow.draft.map((draft, slot) => (slot === index ? name : draft)) };
}

export function draftNames(flow: TournamentFlow): readonly string[] {
  return flow.draft.slice(0, flow.count).map((name) => name.trim());
}

export function startTournament(
  flow: TournamentFlow,
  boardCodes: readonly string[],
): TournamentFlow {
  return {
    ...flow,
    tournament: createTournament(draftNames(flow), boardCodes),
    phase: TournamentStage.ready,
    progress: null,
    board: false,
  };
}

export function beginTurn(flow: TournamentFlow): TournamentFlow {
  const turn = flow.tournament && nextTurn(flow.tournament);
  const code = turn && flow.tournament?.matches[turn.match]?.boardCode;
  if (!code || flow.phase !== TournamentStage.ready) return flow;
  return {
    ...flow,
    phase: TournamentStage.playing,
    progress: flow.progress ?? createGame(code),
    turn: flow.turn + 1,
  };
}

// Results keep whole milliseconds, as snapshots do.
export function finishTurn(flow: TournamentFlow, game: GameState): TournamentFlow {
  if (!flow.tournament || flow.phase !== TournamentStage.playing) return flow;
  const result = { moves: game.moves, elapsedMs: Math.floor(game.elapsedMs) };
  return {
    ...flow,
    tournament: recordTurn(flow.tournament, result),
    phase: TournamentStage.ended,
    board: true,
  };
}

export function advance(flow: TournamentFlow): TournamentFlow {
  if (flow.phase !== TournamentStage.ended || !flow.tournament || !nextTurn(flow.tournament))
    return flow;
  return { ...flow, phase: TournamentStage.ready, progress: null, board: false };
}

// A loaded turn in progress waits for Start turn, so its player is ready before the clock runs.
export function loadFlow(flow: TournamentFlow, saved: SavedTournament): TournamentFlow {
  const loaded = { ...flow, progress: saved.game, board: false };
  if (saved.stage === TournamentStage.setup)
    return {
      ...loaded,
      count: saved.players.length,
      draft: flow.draft.map((name, slot) => saved.players[slot] ?? name),
      tournament: null,
      phase: TournamentStage.setup,
    };
  return {
    ...loaded,
    tournament: { players: saved.players, matches: saved.matches },
    phase: saved.stage === TournamentStage.playing ? TournamentStage.ready : saved.stage,
  };
}

// Live progress comes from the mounted turn, whose clock can be ahead of this state.
export function savedFlow(flow: TournamentFlow, live: GameState | null): SavedTournament {
  if (!flow.tournament)
    return {
      players: flow.draft.slice(0, flow.count),
      matches: [],
      stage: TournamentStage.setup,
      game: null,
    };
  if (flow.phase === TournamentStage.ended)
    return { ...flow.tournament, stage: TournamentStage.ended, game: null };
  const game = flow.phase === TournamentStage.playing ? (live ?? flow.progress) : flow.progress;
  return game
    ? { ...flow.tournament, stage: TournamentStage.playing, game }
    : { ...flow.tournament, stage: TournamentStage.ready, game: null };
}
