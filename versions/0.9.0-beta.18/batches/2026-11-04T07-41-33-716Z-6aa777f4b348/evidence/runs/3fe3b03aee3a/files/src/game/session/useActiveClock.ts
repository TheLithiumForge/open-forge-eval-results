import { useEffect, useRef, useState, type MutableRefObject } from "react";

export const clockTickMs = 32;

export type ActiveClock = Readonly<{
  visibleRef: MutableRefObject<boolean>;
  syncAt(now: number): void;
  startAt(now: number): void;
  stop(): void;
}>;

export function useActiveClock(
  started: boolean,
  won: boolean,
  paused: boolean,
  revision: number,
  advance: (milliseconds: number) => void
): ActiveClock {
  const [isVisible, setIsVisible] = useState(() => typeof document === "undefined" || document.visibilityState !== "hidden");
  const visibleRef = useRef(isVisible);
  const canRunRef = useRef(started && !won && !paused);
  const active = useRef(false);
  const lastTime = useRef(0);
  const currentRevision = useRef(revision);
  const advanceRef = useRef(advance);
  visibleRef.current = isVisible;
  canRunRef.current = started && !won && !paused;
  currentRevision.current = revision;
  advanceRef.current = advance;

  function syncAt(now: number): void {
    if (!active.current) return;
    const elapsed = Math.max(0, now - lastTime.current);
    lastTime.current = now;
    if (elapsed > 0) advanceRef.current(elapsed);
  }

  function startAt(now: number): void {
    if (!visibleRef.current) return;
    lastTime.current = now;
    active.current = true;
  }

  function stop(): void {
    active.current = false;
  }

  useEffect(() => {
    if (!started || won || paused || !isVisible) return;
    const token = revision;
    if (!active.current) startAt(performance.now());
    const timer = window.setInterval(() => {
      if (currentRevision.current === token && active.current) syncAt(performance.now());
    }, clockTickMs);
    return () => window.clearInterval(timer);
  }, [started, won, paused, revision, isVisible]);

  useEffect(() => {
    function visibilityChanged(): void {
      const showing = document.visibilityState !== "hidden";
      if (!showing) {
        syncAt(performance.now());
        stop();
      }
      visibleRef.current = showing;
      setIsVisible(showing);
      if (showing && canRunRef.current) startAt(performance.now());
    }
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => document.removeEventListener("visibilitychange", visibilityChanged);
  }, []);

  useEffect(() => () => {
    currentRevision.current += 1;
    active.current = false;
  }, []);

  return { visibleRef, syncAt, startAt, stop };
}
