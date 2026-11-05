import { useState } from 'react';
import { readHistory } from './history.ts';
import type { Tournament } from './model.ts';

export function useTournamentHistory() {
  const [initial] = useState(readHistory);
  const [items, setItems] = useState(initial.items);
  const [blocked, setBlocked] = useState(initial.blocked);
  function save(tournament: Tournament) {
    const next = [tournament, ...items].slice(0, 10);
    setItems(next);
    try {
      localStorage.setItem('np3:tournaments', JSON.stringify({ v: 3, items: next }));
    } catch {
      setBlocked(true);
    }
  }
  return { items, blocked, save };
}
