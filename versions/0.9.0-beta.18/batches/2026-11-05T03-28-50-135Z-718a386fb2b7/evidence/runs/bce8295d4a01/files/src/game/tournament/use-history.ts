import { useCallback, useRef, useState } from 'react';
import { readTournaments, retainTournaments, writeTournaments } from './storage.ts';
import type { TournamentStore } from './storage.ts';
import type { TournamentState } from './types.ts';

export function useTournamentHistory() {
  const [store] = useState(browserTournamentStore);
  const [initial] = useState(() => readTournaments(store));
  const [items, setItems] = useState(initial.items);
  const latest = useRef(items);
  const [available, setAvailable] = useState(initial.available);

  const add = useCallback(
    (tournament: TournamentState): void => {
      const next = retainTournaments([tournament, ...latest.current]);
      latest.current = next;
      setItems(next);
      const saved = writeTournaments(store, next);
      setAvailable((wasAvailable) => wasAvailable && saved.success);
    },
    [store],
  );

  return { items, available, add };
}

function browserTournamentStore(): TournamentStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
