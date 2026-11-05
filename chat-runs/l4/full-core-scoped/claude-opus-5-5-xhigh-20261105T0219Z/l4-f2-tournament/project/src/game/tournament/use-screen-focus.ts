import { useLayoutEffect, useRef } from 'react';
import type { BoardFocus } from '../board/Board.tsx';

export const FocusTarget = {
  gameHeading: 'gameHeading',
  tournamentHeading: 'tournamentHeading',
  action: 'action',
  board: 'board',
} as const;
type Target = (typeof FocusTarget)[keyof typeof FocusTarget];

// An action names where focus goes once its render commits. A replaced screen focuses its h2.
// A removed button hands focus to the control that replaces it, or to the board's tab stop.
export function useScreenFocus() {
  const gameHeading = useRef<HTMLHeadingElement>(null);
  const tournamentHeading = useRef<HTMLHeadingElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const board = useRef<BoardFocus>(null);
  const pending = useRef<Target | null>(null);
  useLayoutEffect(() => {
    const target = pending.current;
    pending.current = null;
    if (target === FocusTarget.board) board.current?.focusRemembered();
    else if (target === FocusTarget.action) action.current?.focus();
    else if (target === FocusTarget.tournamentHeading) tournamentHeading.current?.focus();
    else if (target === FocusTarget.gameHeading) gameHeading.current?.focus();
  });
  function request(target: Target): void {
    pending.current = target;
  }
  return { gameHeading, tournamentHeading, action, board, request };
}
