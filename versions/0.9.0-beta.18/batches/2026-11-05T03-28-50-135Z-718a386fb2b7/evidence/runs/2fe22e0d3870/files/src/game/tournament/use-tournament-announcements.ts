import { useCallback, useEffect, useRef, useState } from 'react';
import { currentMatch, currentPlayer } from './bracket.ts';
import type { TournamentState } from './model.ts';

export function useTournamentAnnouncements(state: TournamentState | null, generation: number) {
  const [announcement, setAnnouncement] = useState('');
  const [announcementId, setAnnouncementId] = useState(0);
  const lastKey = useRef('');
  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    setAnnouncementId((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!state) {
      lastKey.current = '';
      return;
    }
    const match = currentMatch(state);
    const results = match.results
      .map((result) => (result ? `${result.moves}/${result.elapsedMs}` : '-'))
      .join(':');
    const key = `${generation}:${state.status}:${state.currentRound}:${state.currentMatch}:${state.currentTurn}:${match.boardCode}:${results}:${match.winnerSeed}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (state.status === 'complete') return;
    const player = currentPlayer(state);
    const winner = state.players.find((entry) => entry.seed === match.winnerSeed);
    const result = match.results[state.currentTurn];
    const message =
      match.winnerSeed !== null
        ? `Match complete. ${winner?.name} wins.`
        : result
          ? `${player?.name} finished in ${result.moves} moves. Select Next turn when ready.`
          : `Now playing: ${player?.name}`;
    announce(message);
  }, [announce, generation, state]);

  return { announce, announcement, announcementId };
}
