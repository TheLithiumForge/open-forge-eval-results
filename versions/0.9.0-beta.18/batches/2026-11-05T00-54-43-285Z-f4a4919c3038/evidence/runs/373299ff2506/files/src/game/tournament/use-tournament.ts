import { useEffect, useState } from 'react';
import { freshBoardCode } from '../session/fresh-board.ts';
import { browserStore } from '../session/use-saved-preferences.ts';
import { decodeTournamentDocument, encodeTournamentDocument } from './tournament-document.ts';
import { readPastTournaments, writePastTournaments } from './tournament-storage.ts';
import {
  advanceTournament,
  createTournament,
  finishTournamentTurn,
  startTournamentTurn,
} from './tournament.ts';
import type { TournamentDocument, TournamentSetupState } from './tournament-document.ts';
import type { Tournament } from './tournament.ts';
import type { GameState } from '../game.ts';

function remember(past: readonly Tournament[], tournament: Tournament | null) {
  if (tournament?.stage !== 'complete') return past;
  return past.some(({ id }) => id === tournament.id)
    ? past.map((entry) => (entry.id === tournament.id ? tournament : entry))
    : [tournament, ...past];
}

export function useTournament(size: number) {
  const [store] = useState(browserStore);
  const [document, setDocument] = useState<TournamentDocument>(() => ({
    setup: { playerCount: 4, names: Array.from({ length: 8 }, () => ''), size },
    tournament: null,
    pastTournaments: readPastTournaments(store),
  }));
  const [revision, setRevision] = useState(0);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    writePastTournaments(store, document.pastTournaments);
  }, [store, document.pastTournaments]);

  function update(tournament: Tournament): void {
    setImported(false);
    setDocument((current) => ({
      ...current,
      tournament,
      pastTournaments: remember(current.pastTournaments, tournament),
    }));
  }

  function setup(next: TournamentSetupState): void {
    setDocument((current) => ({ ...current, setup: next }));
  }

  function start(): void {
    const players = document.setup.names
      .slice(0, document.setup.playerCount)
      .map((name) => name.trim());
    if (players.some((name) => !name)) return;
    const codes = Array.from({ length: players.length - 1 }, () =>
      freshBoardCode(document.setup.size),
    );
    update(createTournament(crypto.randomUUID(), players, codes));
  }

  function startTurn(): void {
    if (document.tournament) update(startTournamentTurn(document.tournament));
  }

  function next(): void {
    if (document.tournament) update(advanceTournament(document.tournament));
  }

  function finish(game: GameState): void {
    if (document.tournament) update(finishTournamentTurn(document.tournament, game));
  }

  function load(text: string): boolean {
    const loaded = decodeTournamentDocument(text);
    if (!loaded) return false;
    setImported(true);
    setRevision((current) => current + 1);
    setDocument((current) => {
      let past = current.pastTournaments;
      for (const tournament of [...loaded.pastTournaments].reverse())
        past = remember(past, tournament);
      return { ...loaded, pastTournaments: remember(past, loaded.tournament) };
    });
    return true;
  }

  function exportTournament(game?: GameState): string {
    const tournament = document.tournament;
    return encodeTournamentDocument({
      ...document,
      tournament: tournament && game ? { ...tournament, game } : tournament,
    });
  }

  return {
    document,
    revision,
    imported,
    setup,
    start,
    startTurn,
    next,
    finish,
    load,
    update,
    exportTournament,
  };
}
