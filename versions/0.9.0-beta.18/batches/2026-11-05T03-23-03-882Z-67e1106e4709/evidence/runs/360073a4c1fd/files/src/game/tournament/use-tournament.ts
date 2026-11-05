import { useState } from 'react';
import { freshBoardCode } from '../session/fresh-board.ts';
import { browserStore } from '../session/use-saved-preferences.ts';
import {
  createTournament,
  finishTurn,
  matchPlayers,
  matchSizes,
  matchWinner,
  nameProblem,
  nextTurn,
  TournamentPhase,
} from './rules.ts';
import { decodeTournament } from './format.ts';
import { readTournaments, retainTournament, writeTournaments } from './storage.ts';
import type { GameState } from '../game.ts';
import type { Tournament } from './rules.ts';

export function useTournament(
  announce: (text: string) => void,
  confirm: (action: () => void) => void,
) {
  const [store] = useState(browserStore);
  const [history, setHistory] = useState(() => readTournaments(store));
  const [players, setPlayers] = useState<readonly string[]>(['', '', '', '']);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [restored, setRestored] = useState<GameState | null>(null);
  const [generation, setGeneration] = useState(0);
  const [notice, setNotice] = useState('');

  function notify(text: string): void {
    setNotice(text);
    announce(text);
  }
  function save(completed: Tournament): void {
    const items = retainTournament(history.items, completed);
    const { available } = writeTournaments(store, items);
    setHistory({ items, available });
  }
  function showTurn(next: Tournament): void {
    const match = next.matches[next.matchIndex];
    const player = matchPlayers(next, next.matchIndex)[match?.results.length ?? 0];
    setTournament(next);
    setNotice('');
    announce(`Now playing: ${player == null ? '' : next.players[player]}`);
  }
  function start(): void {
    const problem = nameProblem(players);
    if (problem) {
      notify(problem);
      return;
    }
    const codes: string[] = [];
    for (const size of matchSizes(players.length)) {
      let code = freshBoardCode(size);
      while (codes.includes(code)) code = freshBoardCode(size);
      codes.push(code);
    }
    setRestored(null);
    setGeneration(generation + 1);
    showTurn(createTournament(players, codes));
  }
  function begin(): void {
    if (!tournament || tournament.phase !== TournamentPhase.ready) return;
    showTurn({ ...tournament, phase: TournamentPhase.playing });
  }
  function finish(game: GameState, feedback: string): void {
    if (!tournament) return;
    const next = finishTurn(tournament, game);
    if (next === tournament) return;
    setRestored(null);
    setTournament(next);
    const winner = matchWinner(next, next.matchIndex);
    const outcome =
      next.phase === TournamentPhase.complete
        ? `Champion: ${winner == null ? '' : next.players[winner]}`
        : winner == null
          ? 'Select Next turn.'
          : `Winner: ${next.players[winner]}. Select Next match.`;
    announce(`${feedback} ${outcome}`);
    if (next.phase === TournamentPhase.complete) save(next);
  }
  function advance(): void {
    if (tournament) showTurn(nextTurn(tournament));
    setGeneration(generation + 1);
  }
  function load(text: string): void {
    const result = decodeTournament(text);
    if (!result.data) {
      notify(result.error);
      return;
    }
    const data = result.data;
    const apply = () => {
      setTournament(data.tournament);
      setPlayers(data.players);
      setRestored(data.game);
      setGeneration(generation + 1);
      const loaded = data.tournament;
      const match = loaded?.matches[loaded.matchIndex];
      const player = loaded
        ? matchPlayers(loaded, loaded.matchIndex)[match?.results.length ?? 0]
        : null;
      const owner =
        loaded &&
        player != null &&
        (loaded.phase === TournamentPhase.ready || loaded.phase === TournamentPhase.playing)
          ? ` Now playing: ${loaded.players[player]}`
          : '';
      notify(
        (data.game ? 'Loaded tournament. Select Start turn to continue.' : 'Loaded tournament.') +
          owner,
      );
      if (data.tournament?.phase === TournamentPhase.complete) save(data.tournament);
    };
    if (tournament && tournament.phase !== TournamentPhase.complete) confirm(apply);
    else apply();
  }
  function reset(): void {
    setTournament(null);
    setRestored(null);
    setNotice('');
    setGeneration(generation + 1);
  }
  return {
    players,
    setPlayers,
    tournament,
    restored,
    generation,
    notice,
    history,
    start,
    begin,
    finish,
    advance,
    load,
    reset,
  };
}
