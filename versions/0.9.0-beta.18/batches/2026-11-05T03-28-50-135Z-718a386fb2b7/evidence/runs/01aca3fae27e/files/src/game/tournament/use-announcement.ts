import { useState } from 'react';
export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState({ text: '', id: 0 });
  function announce(text: string) {
    setAnnouncement((old) => ({ text, id: old.id + 1 }));
  }
  return { announcement, announce };
}
