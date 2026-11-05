import { createGame } from '../game.ts';
import { initialSession } from '../session/session.ts';
import { DEFAULT_SIZE } from '../session/storage.ts';
import type { Session } from '../session/session.ts';

// Tournament games run in a session of their own. Its preferences are never read from or written
// to the browser, so a tournament can't change the saved size or a best score.
const IDLE_CODE = 'np1-4-1';

export function idleTurn(): Session {
  return initialSession(IDLE_CODE, { size: DEFAULT_SIZE, bestMoves: {} });
}

// A new hidden game for the turn. The generation moves on, so timer work from an earlier turn
// can't touch it.
export function beginTurn(session: Session, boardCode: string): Session {
  return {
    ...session,
    game: createGame(boardCode),
    paused: false,
    generation: session.generation + 1,
    feedback: '',
    loadNotice: '',
    celebration: false,
  };
}

// Clears the last turn result without publishing anything, as a new deal does.
export function clearTurn(session: Session): Session {
  return { ...session, feedback: '', loadNotice: '', celebration: false };
}

export function noticeTurn(session: Session, text: string): Session {
  return { ...session, feedback: text, loadNotice: text, announcement: session.announcement + 1 };
}

// Back to no turn at all: a fresh idle session whose counters keep moving forward.
export function resetTurn(session: Session): Session {
  return {
    ...idleTurn(),
    generation: session.generation + 1,
    announcement: session.announcement,
  };
}
