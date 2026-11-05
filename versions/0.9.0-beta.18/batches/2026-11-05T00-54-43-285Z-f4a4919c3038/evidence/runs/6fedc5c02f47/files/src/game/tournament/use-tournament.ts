import { useEffect, useState } from 'react';
import { parseBoardCode } from '../deck.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { browserStore } from '../session/use-saved-preferences.ts';
import { readPastTournaments, writePastTournaments } from './storage.ts';
import { decodeTournament, encodeTournament } from './tournament-format.ts';
import {
  advanceTournament,
  createTournament,
  finishTournamentTurn,
  startTournamentTurn,
} from './tournament.ts';
import type { GameState } from '../game.ts';
import type { TournamentRecord, TournamentWorkspace } from './tournament.ts';

function remember(
  past: readonly TournamentRecord[],
  record: TournamentRecord,
): readonly TournamentRecord[] {
  return [record, ...past.filter((entry) => entry.id !== record.id)];
}

export function useTournament(size: number) {
  const [store] = useState(browserStore);
  const [workspace, setWorkspace] = useState<TournamentWorkspace>(() => ({
    active: null,
    past: readPastTournaments(store),
  }));
  const [notice, setNotice] = useState('');
  useEffect(() => writePastTournaments(store, workspace.past), [store, workspace.past]);

  function start(players: readonly string[]): void {
    const codes = new Set<string>();
    while (codes.size < players.length - 1) codes.add(freshBoardCode(size));
    const active = createTournament(players, [...codes], crypto.randomUUID(), Date.now());
    setWorkspace((previous) => ({ ...previous, active }));
    setNotice('');
  }

  function startTurn(): void {
    setWorkspace((previous) => ({
      ...previous,
      active: previous.active ? startTournamentTurn(previous.active) : null,
    }));
  }

  function finishTurn(game: GameState): void {
    setWorkspace((previous) => {
      if (!previous.active) return previous;
      const active = finishTournamentTurn(previous.active, game);
      return {
        active,
        past:
          active.phase === 'complete' ? remember(previous.past, active.tournament) : previous.past,
      };
    });
  }

  function advance(): void {
    const code = workspace.active?.tournament.matches[workspace.active.matchIndex]?.boardCode;
    const board = code ? parseBoardCode(code) : null;
    if (!board) return;
    const replayCode = freshBoardCode(board.size, board.seed);
    setWorkspace((previous) => ({
      ...previous,
      active: previous.active ? advanceTournament(previous.active, replayCode) : null,
    }));
  }

  function exportTournament(game: GameState | null): string {
    setNotice('Tournament exported.');
    const active = workspace.active;
    return encodeTournament({
      ...workspace,
      active: active && game && active.phase === 'playing' ? { ...active, game } : active,
    });
  }

  function loadTournament(text: string): void {
    const loaded = decodeTournament(text);
    if (!loaded) {
      setNotice('Invalid tournament JSON.');
      return;
    }
    setWorkspace((previous) => {
      let past = previous.past;
      for (const record of [...loaded.past].reverse()) past = remember(past, record);
      const active = loaded.active;
      if (active?.phase === 'complete') past = remember(past, active.tournament);
      return {
        past,
        active: active?.phase === 'playing' ? { ...active, phase: 'ready' } : active,
      };
    });
    setNotice('Tournament loaded.');
  }

  function view(record: TournamentRecord): void {
    setWorkspace((previous) => ({
      ...previous,
      active: {
        tournament: record,
        matchIndex: record.matches.length - 1,
        phase: 'complete',
        game: null,
      },
    }));
    setNotice('');
  }

  function setup(): void {
    setWorkspace((previous) => ({ ...previous, active: null }));
    setNotice('');
  }

  return {
    workspace,
    notice,
    start,
    startTurn,
    finishTurn,
    advance,
    exportTournament,
    loadTournament,
    view,
    setup,
  };
}
