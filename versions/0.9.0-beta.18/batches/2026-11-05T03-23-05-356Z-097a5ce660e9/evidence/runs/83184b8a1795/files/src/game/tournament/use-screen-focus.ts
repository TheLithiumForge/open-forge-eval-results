import { useEffect, useRef } from 'react';
import type { TournamentState } from './model.ts';
export function useScreenFocus(
  playing: boolean,
  handoff: boolean,
  tournament: TournamentState | null,
  champion: number | null,
) {
  const heading = useRef<HTMLHeadingElement>(null);
  const matches = tournament?.matches.length ?? 0;
  useEffect(() => {
    heading.current?.focus();
  }, [playing, handoff, matches, champion]);
  return heading;
}
