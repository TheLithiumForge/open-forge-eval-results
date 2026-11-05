import { useEffect, useRef, useState } from 'react';
import { winner } from './tournament.ts';
import type { Session } from '../session/session.ts';
import type { TournamentState } from './tournament.ts';

export function useTournamentAnnouncements(event: TournamentState | null, session: Session) {
  const [announcement, setAnnouncement] = useState({ id: 0, text: '' });
  const lastResult = useRef(session.announcement);
  function announce(text: string) {
    setAnnouncement((previous) => ({ id: previous.id + 1, text }));
  }
  useEffect(() => {
    if (lastResult.current === session.announcement) return;
    lastResult.current = session.announcement;
    if (session.feedback) announce(session.feedback);
  }, [session.announcement, session.feedback]);
  useEffect(() => {
    if (!event) return;
    const match = event.matches[event.matches.length - 1];
    if (!match) return;
    if (event.phase === 'ready')
      announce(`Now playing: ${event.names[match.players[match.results.length]!]}`);
    if (event.phase === 'champion') announce(`Champion: ${event.names[winner(match)]}`);
  }, [event]);
  return { announcement, announce };
}
