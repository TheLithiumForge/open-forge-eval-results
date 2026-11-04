import { useEffect, useRef } from 'react';
import type { Announcement } from './sessionController.ts';

export interface LiveAnnouncementProps { readonly announcement: Announcement | null }

export function LiveAnnouncement({ announcement }: LiveAnnouncementProps) {
  const region = useRef<HTMLDivElement>(null);
  const pending = useRef<Announcement[]>([]);
  const lastId = useRef(0);
  const busy = useRef(false);
  const timer = useRef<number | null>(null);

  function drain(): void {
    if (busy.current) return;
    const next = pending.current.shift();
    if (!next || !region.current) return;
    busy.current = true;
    region.current.textContent = '';
    // Separate mutations let consecutive identical results be announced again.
    timer.current = window.setTimeout(() => {
      if (region.current) region.current.textContent = next.text;
      timer.current = window.setTimeout(() => { busy.current = false; drain(); }, 100);
    }, 40);
  }

  useEffect(() => {
    if (!announcement) {
      pending.current = [];
      busy.current = false;
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (region.current) region.current.textContent = '';
      return;
    }
    if (announcement.id !== lastId.current) {
      lastId.current = announcement.id;
      pending.current.push(announcement);
      drain();
    }
  }, [announcement]);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  return <div ref={region} className="visually-hidden" aria-live="polite" aria-atomic="true" />;
}
