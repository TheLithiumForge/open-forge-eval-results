import { useCallback, useEffect, useRef, useState } from 'react';

export function useAnnouncer() {
  const [message, setMessage] = useState('');
  const queue = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const pump = useCallback(function deliver() {
    if (!alive.current) return;
    const next = queue.current.shift();
    if (next === undefined) { timer.current = null; return; }
    setMessage('');
    // A distinct empty update lets assistive technology hear identical results again.
    timer.current = setTimeout(() => {
      if (!alive.current) return;
      setMessage(next);
      timer.current = setTimeout(deliver, 100);
    }, 40);
  }, []);
  const announce = useCallback((text: string) => {
    queue.current.push(text);
    if (timer.current === null) pump();
  }, [pump]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);
  return { message, announce };
}
