import { championOf, recordedTurns, roundOf, isFinished, turnAt } from './rules.ts';
import type { Tournament } from './types.ts';

export const TurnPhase = {
  setup: 'setup',
  ready: 'ready',
  playing: 'playing',
  done: 'done',
  complete: 'complete',
} as const;
type TurnPhaseName = (typeof TurnPhase)[keyof typeof TurnPhase];

const TurnText = { playing: 'Now playing', champion: 'Champion', round: 'Round' } as const;

interface TurnView {
  readonly phase: TurnPhaseName;
  // "Now playing: NAME", or "Champion: NAME" at the end. Empty before a tournament starts.
  readonly owner: string;
  // "Round: NAME" for the round being played. Empty when no round is in play.
  readonly round: string;
  // The turn on screen: the next one to play, or the one that just ended.
  readonly match: number | undefined;
  // True when the turn on screen is the second player of its match.
  readonly second: boolean;
}

const SETUP: TurnView = {
  phase: TurnPhase.setup,
  owner: '',
  round: '',
  match: undefined,
  second: false,
};

// `active` says a game exists for the turn on screen. `won` says that game is complete.
export function turnView(
  tournament: Tournament | undefined,
  active: boolean,
  won: boolean,
): TurnView {
  if (!tournament) return SETUP;
  const recorded = recordedTurns(tournament);
  if (isFinished(tournament)) {
    const champion = championOf(tournament);
    const name = champion === undefined ? '' : (tournament.players[champion] ?? '');
    return { ...SETUP, phase: TurnPhase.complete, owner: `${TurnText.champion}: ${name}` };
  }
  const ended = active && won;
  const turn = turnAt(tournament, ended ? recorded - 1 : recorded);
  if (!turn) return SETUP;
  const phase = ended ? TurnPhase.done : active ? TurnPhase.playing : TurnPhase.ready;
  const name = tournament.players[turn.player] ?? '';
  const round = roundOf(tournament.players.length, turn.match);
  return {
    phase,
    owner: `${TurnText.playing}: ${name}`,
    round: `${TurnText.round}: ${round}`,
    match: turn.match,
    second: turn.second,
  };
}
