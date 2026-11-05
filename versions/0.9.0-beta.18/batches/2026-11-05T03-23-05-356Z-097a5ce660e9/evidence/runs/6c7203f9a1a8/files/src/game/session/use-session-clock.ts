import { useGameClock } from './use-game-clock.ts';
import { tickSession } from './session.ts';
import type { RefObject } from 'react';
import type { Session } from './session.ts';

export function useSessionClock(
  session: Session,
  current: RefObject<Session>,
  commit: (next: Session) => void,
  active = true,
) {
  return useGameClock(session, current, commit, tickSession, active);
}
