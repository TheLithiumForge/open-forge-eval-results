import { useCallback, useEffect, useRef, useState } from 'react';

// Clearing between events gives identical consecutive messages their own live update.
export function useAnnouncement() {
  const [text, setText] = useState('');
  const pending = useRef<string[]>([]);
  const busy = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const announce = useCallback((message: string) => {
    pending.current.push(message);
    if (busy.current) return;
    busy.current = true;
    const deliver = () => {
      if (!pending.current.length) { busy.current = false; return; }
      setText('');
      timer.current = window.setTimeout(() => {
        setText(pending.current.shift() ?? '');
        timer.current = window.setTimeout(deliver, 180);
      }, 60);
    };
    deliver();
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { announcement: text, announce };
}
