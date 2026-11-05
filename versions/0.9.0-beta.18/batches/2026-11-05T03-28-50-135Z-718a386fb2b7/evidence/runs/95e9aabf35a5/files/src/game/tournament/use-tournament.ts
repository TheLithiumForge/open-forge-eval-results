import { useEffect, useState } from 'react';
import { isWon } from '../game.ts';
import { isJsonObject, parseJson } from '../saved-format.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import {
  advanceTournament,
  createTournament,
  currentMatch,
  finishTurn,
  startTurn,
} from './tournament.ts';
import { readTournament } from './read-tournament.ts';
import type { Tournament } from './tournament.ts';
import type { useGame } from '../session/use-game.ts';

const STORAGE_KEY = 'neon-pairs.tournaments.v1';

function readPast(): Tournament[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item: unknown) => {
      const parsed = readTournament(JSON.stringify(item));
      return parsed?.tournament.phase === 'complete' ? [parsed.tournament] : [];
    });
  } catch {
    return [];
  }
}

export function useTournament(controller: ReturnType<typeof useGame>) {
  const [open, setOpen] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [past, setPast] = useState(readPast);
  const game = controller.session.game;

  useEffect(() => {
    if (tournament?.phase !== 'playing' || !isWon(game)) return;
    setTournament((current) =>
      current?.phase === 'playing'
        ? finishTurn(current, { moves: game.moves, elapsedMs: Math.floor(game.elapsedMs) })
        : current,
    );
  }, [game, tournament]);

  useEffect(() => {
    if (tournament?.phase !== 'complete') return;
    setPast((previous) => {
      if (previous.some((item) => item.id === tournament.id)) return previous;
      const next = [tournament, ...previous];
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(next.map((item) => ({ tournament: item, snapshot: null }))),
        );
      } catch {
        /* Storage may be unavailable. */
      }
      return next;
    });
  }, [tournament]);

  function start(names: string[]): void {
    setTournament(createTournament(names, game.size, crypto.randomUUID()));
  }
  function beginTurn(): void {
    if (!tournament || tournament.phase !== 'ready') return;
    const code = currentMatch(tournament).boardCode ?? freshBoardCode(tournament.size);
    controller.loadBoard(code);
    setTournament(startTurn(tournament, code));
  }
  function next(): void {
    if (tournament) setTournament(advanceTournament(tournament));
  }
  function leave(): void {
    setOpen(false);
    setTournament(null);
    controller.newGame();
  }
  function exportTournament(): string {
    if (!tournament) return JSON.stringify({ tournament: null, snapshot: null }, null, 2);
    return JSON.stringify(
      { tournament, snapshot: tournament.phase === 'playing' ? controller.exportSnapshot() : null },
      null,
      2,
    );
  }
  function load(text: string): boolean {
    const value = parseJson(text);
    if (isJsonObject(value) && value.tournament === null && value.snapshot === null) {
      setTournament(null);
      return true;
    }
    const parsed = readTournament(text);
    if (!parsed) return false;
    if (parsed.snapshot) {
      controller.loadSnapshot(parsed.snapshot);
      controller.resume();
    }
    setTournament(parsed.tournament);
    return true;
  }
  return {
    open,
    setOpen,
    tournament,
    past,
    start,
    beginTurn,
    next,
    leave,
    exportTournament,
    load,
    setTournament,
  };
}
