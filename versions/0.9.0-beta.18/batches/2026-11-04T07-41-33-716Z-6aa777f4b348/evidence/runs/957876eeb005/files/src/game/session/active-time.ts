import { advanceGame } from '../advance-game.ts';
import { isWon } from '../is-won.ts';
import type { SessionState } from './session-state.ts';

export const CLOCK_RENDER_MS = 100;

export function advanceSession(session: SessionState, now: number): SessionState {
  const atMs = Math.max(session.atMs, now);
  const game = session.visible && !session.paused
    ? advanceGame(session.game, atMs - session.atMs)
    : session.game;
  return { ...session, game, atMs };
}

export function setSessionVisibility(session: SessionState, now: number, visible: boolean): SessionState {
  return { ...advanceSession(session, now), visible };
}

export function resumeSession(session: SessionState, now: number): SessionState {
  return { ...advanceSession(session, now), paused: false, loadStatus: '' };
}

export function isClockRunning(session: SessionState): boolean {
  return session.visible && !session.paused && session.game.started && !isWon(session.game);
}

export function nextClockDelay(session: SessionState): number {
  return session.game.selection.kind === 'mismatch'
    ? Math.max(1, Math.min(CLOCK_RENDER_MS, Math.ceil(session.game.selection.remainingMs)))
    : CLOCK_RENDER_MS;
}
