import { useEffect } from "react";
import type { MutableRefObject } from "react";
import { isWon } from "../transitions.ts";
import { SELECTION_KIND, type GameState, type SelectionKind } from "../types.ts";
import type { ActiveClock } from "./useActiveClock.ts";

export function useSessionClock(
  gameRef: MutableRefObject<GameState>,
  pausedRef: MutableRefObject<boolean>,
  visibleRef: MutableRefObject<boolean>,
  dealRevisionRef: MutableRefObject<number>,
  dealRevision: number,
  paused: boolean,
  started: boolean,
  selectionKind: SelectionKind,
  clockRef: MutableRefObject<ActiveClock>,
): void {
  useEffect(() => {
    visibleRef.current = !document.hidden;
    if (!visibleRef.current) clockRef.current.suspend();
    let active = true;
    let timer: number | null = null;
    const isCurrentDeal = () => active && dealRevisionRef.current === dealRevision;

    const scheduleTick = (): void => {
      if (!isCurrentDeal() || !visibleRef.current || pausedRef.current) return;
      const current = gameRef.current;
      if (!current.started || isWon(current)) return;
      const delay = current.selection.kind === SELECTION_KIND.MISMATCH
        ? Math.min(50, current.selection.remainingMs)
        : 50;
      timer = window.setTimeout(() => {
        timer = null;
        if (!isCurrentDeal()) return;
        clockRef.current.tickAt(performance.now());
        scheduleTick();
      }, delay);
    };

    function onVisibilityChange(): void {
      if (!isCurrentDeal()) return;
      const now = performance.now();
      if (document.hidden) {
        if (visibleRef.current) clockRef.current.tickAt(now);
        visibleRef.current = false;
        if (timer !== null) window.clearTimeout(timer);
        timer = null;
        clockRef.current.suspend();
      } else {
        visibleRef.current = true;
        const current = gameRef.current;
        if (!pausedRef.current && current.started && !isWon(current)) clockRef.current.resumeAt(now);
        scheduleTick();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    scheduleTick();
    return () => {
      active = false;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [dealRevision, paused, started, selectionKind]);
}
