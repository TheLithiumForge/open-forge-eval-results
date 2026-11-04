import type { Announcement } from '../session/model.ts';

export interface LiveAnnouncementProps { readonly event: Announcement | null }

export function LiveAnnouncement({ event }: LiveAnnouncementProps) {
  return (
    <div className="visually-hidden" aria-live="polite" aria-atomic="true">
      {event && <span key={event.id}>{event.text}</span>}
    </div>
  );
}
