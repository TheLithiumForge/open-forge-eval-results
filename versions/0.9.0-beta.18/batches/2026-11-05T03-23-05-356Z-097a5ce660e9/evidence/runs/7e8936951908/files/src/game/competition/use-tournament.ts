import { useRef, useState } from 'react';
import { freshBoardCodes } from '../session/fresh-board.ts';
import { browserStore } from '../session/use-saved-preferences.ts';
import {
  activeTournamentMatch,
  beginTournamentTurn,
  createTournament,
  nextTournamentTurn,
  normalizePlayerName,
  playerNamesError,
  tournamentBoardSizes,
} from './tournament.ts';
import { nextTournamentMatch, recordTournamentResult } from './tournament-progress.ts';
import { decodeTournamentJson, encodeTournamentJson } from './tournament-format.ts';
import { readTournamentHistory, writeTournamentHistory } from './tournament-storage.ts';
import type { GameState } from '../game.ts';
import type { Tournament, TournamentMatch } from './tournament.ts';

export function useTournament() {
  const [store] = useState(browserStore);
  const [historyRead] = useState(() => readTournamentHistory(store));
  const [playerCount, setPlayerCount] = useState<4 | 8>(4);
  const [names, setNames] = useState<string[]>(() => Array<string>(8).fill(''));
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [past, setPast] = useState(historyRead.tournaments);
  const pastRef = useRef(past);
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState('');
  const [storageNotice, setStorageNotice] = useState(
    historyRead.available ? '' : "Progress won't be saved on this device.",
  );

  function editName(index: number, value: string): void {
    setNames((current) => current.map((name, position) => (position === index ? value : name)));
  }

  function startTournament(): boolean {
    const acceptedNames = names.slice(0, playerCount).map(normalizePlayerName);
    const error = playerNamesError(acceptedNames);
    if (error) {
      setNotice(error);
      return false;
    }
    const codes = freshBoardCodes(tournamentBoardSizes(playerCount));
    const usedIds = new Set(pastRef.current.map((item) => item.startedAt));
    let startedAt = Date.now();
    while (usedIds.has(startedAt))
      startedAt = startedAt === Number.MAX_SAFE_INTEGER ? 0 : startedAt + 1;
    const next = createTournament(acceptedNames, codes, startedAt);
    if (!next) {
      setNotice('Unable to start tournament.');
      return false;
    }
    setTournament(next);
    setNotice('');
    return true;
  }

  function startTurn(): TournamentMatch | undefined {
    if (!tournament || tournament.phase !== 'ready') return undefined;
    const match = activeTournamentMatch(tournament);
    setTournament(beginTournamentTurn(tournament));
    return match;
  }

  function finishTurn(game: GameState): void {
    setTournament((current) =>
      current ? recordTournamentResult(current, game.moves, game.elapsedMs) : current,
    );
  }

  function nextTurn(): void {
    setTournament((current) => (current ? nextTournamentTurn(current) : current));
  }

  function nextMatch(): void {
    if (!tournament) return;
    const next = nextTournamentMatch(tournament);
    setTournament(next);
    if (next.phase === 'finished') remember(next);
  }

  function remember(finished: Tournament): void {
    if (pastRef.current.some((item) => item.startedAt === finished.startedAt)) return;
    const next = [finished, ...pastRef.current].slice(0, 10);
    pastRef.current = next;
    setPast(next);
    setStorageNotice(
      writeTournamentHistory(store, next) ? '' : "Progress won't be saved on this device.",
    );
  }

  function exportJson(gameSnapshot: string): void {
    setJson(encodeTournamentJson(tournament, playerCount, names, gameSnapshot));
    setNotice('');
  }

  function loadJson():
    | { readonly kind: 'setup' }
    | {
        readonly kind: 'tournament';
        readonly phase: Tournament['phase'];
        readonly boardCode: string;
        readonly game: GameState | null;
      }
    | null {
    const payload = decodeTournamentJson(json);
    if (!payload) {
      setNotice('Invalid tournament.');
      return null;
    }
    setNotice('');
    if (payload.kind === 'setup') {
      setPlayerCount(payload.playerCount);
      setNames([...payload.names, ...Array<string>(8 - payload.names.length).fill('')]);
      setTournament(null);
      return { kind: 'setup' };
    }
    setTournament(payload.tournament);
    if (payload.tournament.phase === 'finished') remember(payload.tournament);
    const match = activeTournamentMatch(payload.tournament);
    if (!match) return null;
    return {
      kind: 'tournament',
      phase: payload.tournament.phase,
      boardCode: match.boardCode,
      game: payload.game,
    };
  }

  function leaveTournament(): void {
    setTournament(null);
    setNotice('');
  }

  return {
    playerCount,
    setPlayerCount: (value: number) => setPlayerCount(value === 8 ? 8 : 4),
    names,
    editName,
    tournament,
    past,
    json,
    setJson,
    notice,
    storageNotice,
    startTournament,
    startTurn,
    finishTurn,
    nextTurn,
    nextMatch,
    exportJson,
    loadJson,
    leaveTournament,
  };
}
