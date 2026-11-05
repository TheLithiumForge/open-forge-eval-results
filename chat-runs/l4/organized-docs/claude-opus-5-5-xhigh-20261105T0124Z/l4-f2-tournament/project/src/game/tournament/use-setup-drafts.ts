import { useState } from 'react';
import { acceptedName } from './names.ts';

const MAX_PLAYERS = 8;
const DEFAULT_PLAYERS = 4;

// The player count and typed name drafts. They stay while the page is open, ready for a rematch.
export function useSetupDrafts() {
  const [count, setCount] = useState(DEFAULT_PLAYERS);
  const [drafts, setDrafts] = useState(() => Array.from({ length: MAX_PLAYERS }, () => ''));
  return {
    count,
    drafts,
    setCount,
    setDraft(index: number, draft: string): void {
      setDrafts((old) => old.map((value, at) => (at === index ? draft : value)));
    },
    // The accepted names of the selected number of players, in entry order.
    names(): string[] {
      return drafts.slice(0, count).map(acceptedName);
    },
  };
}
