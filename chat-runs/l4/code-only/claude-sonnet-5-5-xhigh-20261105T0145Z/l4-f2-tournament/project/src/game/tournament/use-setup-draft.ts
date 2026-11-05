import { useState } from 'react';
import { PLAYER_COUNTS } from './tournament.ts';

const FIRST_COUNT = PLAYER_COUNTS[0];
const MOST_PLAYERS = Math.max(...PLAYER_COUNTS);

// The typed names stay when the player count changes, and they are what Export saves before a start.
export function useSetupDraft() {
  const [count, setCount] = useState<number>(FIRST_COUNT);
  const [entries, setEntries] = useState<readonly string[]>(() =>
    Array.from({ length: MOST_PLAYERS }, () => ''),
  );
  function setEntry(position: number, value: string): void {
    setEntries((names) => names.map((name, index) => (index === position ? value : name)));
  }
  return { count, entries, setCount, setEntry };
}
