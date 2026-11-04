import { useEffect } from 'react';

type ClockOptions = Readonly<{
  dealId: number;
  running: boolean;
  settle: (expectedDeal?: number) => void;
  setVisible: (visible: boolean) => void;
  delay: () => number;
}>;

export function useSessionClock({ dealId, running, settle, setVisible, delay }: ClockOptions): void {
  useEffect(() => {
    let disposed = false;
    let timer: number | undefined;
    function schedule() {
      if (!disposed && running && document.visibilityState !== 'hidden') {
        timer = window.setTimeout(tick, delay());
      }
    }
    function tick() {
      if (disposed) return;
      settle(dealId);
      schedule();
    }
    function onVisibility() {
      if (disposed) return;
      settle(dealId);
      setVisible(document.visibilityState !== 'hidden');
      if (timer !== undefined) window.clearTimeout(timer);
      schedule();
    }
    document.addEventListener('visibilitychange', onVisibility);
    schedule();
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [dealId, running, settle, setVisible, delay]);
}
