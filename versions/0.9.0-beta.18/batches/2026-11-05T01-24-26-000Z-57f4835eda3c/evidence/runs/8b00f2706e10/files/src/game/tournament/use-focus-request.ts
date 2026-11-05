import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { BoardFocus } from '../board/Board.tsx';

export const FocusTarget = {
  heading: 'heading',
  board: 'board',
  startTurn: 'startTurn',
  tournament: 'tournament',
  leave: 'leave',
} as const;
type FocusTargetName = (typeof FocusTarget)[keyof typeof FocusTarget];

// Screen changes replace the control that was used. Each action names where focus goes next,
// and the move happens after React has mounted that target.
export function useFocusRequest(board: RefObject<BoardFocus | null>) {
  const heading = useRef<HTMLHeadingElement>(null);
  const startTurn = useRef<HTMLButtonElement>(null);
  const tournament = useRef<HTMLButtonElement>(null);
  const leave = useRef<HTMLButtonElement>(null);
  const pending = useRef<FocusTargetName | null>(null);
  useEffect(() => {
    const target = pending.current;
    if (target === null) return;
    if (target === FocusTarget.board) {
      if (!board.current) return;
      board.current.focusRemembered();
    } else {
      const element = { heading, startTurn, tournament, leave }[target].current;
      if (!element) return;
      element.focus();
    }
    pending.current = null;
  });
  return {
    refs: { heading, startTurn, tournament, leave },
    request(target: FocusTargetName): void {
      pending.current = target;
    },
  };
}
