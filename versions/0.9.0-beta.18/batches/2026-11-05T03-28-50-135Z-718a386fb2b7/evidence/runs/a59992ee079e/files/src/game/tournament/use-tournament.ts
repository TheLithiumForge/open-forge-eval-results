import { useRef, useState } from 'react';
import { createGame, isWon } from '../game.ts';
import { encodeTournamentJson, decodeTournamentJson } from './exchange.ts';
import type { TournamentDocumentRead } from './exchange.ts';
import { activateSession, initialSession, replaceGame } from '../session/session.ts';
import { useSessionClock } from '../session/use-session-clock.ts';
import { createTournamentDeals } from './deals.ts';
import {
  advanceTournament,
  createTournament,
  currentMatch,
  currentPlayer,
  nextTournamentAction,
  recordTournamentResult,
} from './rules.ts';
import {
  browserTournamentStore,
  prependFinishedTournament,
  readTournamentHistory,
  writeTournamentHistory,
} from './storage.ts';
import type { Session } from '../session/session.ts';
import type { Tournament } from './model.ts';

export function useTournament() {
  const [store] = useState(browserTournamentStore);
  const [loadedHistory] = useState(() => readTournamentHistory(store));
  const [history, setHistory] = useState(loadedHistory.tournaments);
  const [storageAvailable, setStorageAvailable] = useState(loadedHistory.available);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const tournamentRef = useRef(tournament);
  const [turnStarted, setTurnStarted] = useState(false);
  const [turnSession, setTurnSession] = useState(() =>
    initialSession('np1-4-1', { size: 4, bestMoves: {} }),
  );
  const current = useRef(turnSession);
  const [notice, setNotice] = useState('');
  const [announcement, setAnnouncement] = useState(0);

  function commitTournament(next: Tournament | null): void {
    tournamentRef.current = next;
    setTournament(next);
  }

  function commitSession(next: Session): void {
    if (next === current.current) return;
    current.current = next;
    setTurnSession(next);
  }

  const clock = useSessionClock(
    turnSession,
    current,
    commitSession,
    tournament !== null && tournament.status === 'active' && turnStarted,
  );

  function publish(message: string): void {
    setNotice(message);
    setAnnouncement((value) => value + 1);
  }

  function saveFinished(value: Tournament): void {
    const next = prependFinishedTournament(value, history);
    setHistory(next);
    setStorageAvailable(writeTournamentHistory(store, next));
  }

  function start(names: readonly string[], playerCount: 4 | 8): void {
    try {
      const codes = createTournamentDeals(playerCount, history);
      const next = createTournament(names, playerCount, codes);
      clock.reset();
      setTurnStarted(false);
      commitTournament(next);
      const player = currentPlayer(next);
      publish(player ? `Now playing: ${player.name}` : 'Tournament started.');
    } catch {
      publish('Could not create tournament deals.');
    }
  }

  function startTurn(): void {
    const event = tournamentRef.current;
    const match = event ? currentMatch(event) : null;
    const action = event ? nextTournamentAction(event) : null;
    if (!event || event.status !== 'active' || !match || action) return;
    clock.reset();
    commitSession(replaceGame(current.current, createGame(match.boardCode), false));
    setTurnStarted(true);
    const player = currentPlayer(event);
    publish(player ? `Now playing: ${player.name}` : '');
  }

  function advance(): void {
    const event = tournamentRef.current;
    if (!event) return;
    const action = nextTournamentAction(event);
    const next = advanceTournament(event);
    if (next === event) return;
    clock.reset();
    commitTournament(next);
    if (action === 'turn' || action === 'match') setTurnStarted(false);
    const player = currentPlayer(next);
    publish(player ? `Now playing: ${player.name}` : '');
  }

  function activate(index: number): void {
    clock.synchronize();
    const before = current.current;
    const nextSession = activateSession(before, index);
    commitSession(nextSession);
    if (nextSession.announcement !== before.announcement) setNotice('');
    if (nextSession === before || !isWon(nextSession.game) || isWon(before.game)) return;
    const event = tournamentRef.current;
    if (!event) return;
    const completedPlayer = currentPlayer(event);
    const nextTournament = recordTournamentResult(event, {
      elapsedMs: nextSession.game.elapsedMs,
      moves: nextSession.game.moves,
    });
    if (nextTournament === event) return;
    commitTournament(nextTournament);
    if (nextTournament.status === 'finished') {
      saveFinished(nextTournament);
      publish(`Champion: ${nextTournament.champion?.name ?? ''}`);
    } else {
      publish(`${completedPlayer?.name ?? 'Player'} finished their turn.`);
    }
  }

  function exportJson(): string {
    const currentTournament = tournamentRef.current;
    if (currentTournament && turnStarted) clock.synchronize();
    const event = currentTournament ?? history[0] ?? null;
    if (!event) {
      publish('No tournament is available to export.');
      return '';
    }
    const game = currentTournament && turnStarted ? current.current.game : null;
    publish('Tournament exported.');
    return encodeTournamentJson(event, game, Boolean(game));
  }

  function loadJson(text: string): boolean {
    const result: TournamentDocumentRead = decodeTournamentJson(text);
    if (!result.document) {
      publish(result.error ?? 'Invalid tournament JSON.');
      return false;
    }
    const { tournament: loaded, turnGame, turnStarted: hasTurnStarted } = result.document;
    const match = currentMatch(loaded);
    if (!match) {
      publish('Invalid tournament JSON.');
      return false;
    }
    clock.reset();
    commitTournament(loaded);
    setTurnStarted(hasTurnStarted);
    commitSession(replaceGame(current.current, turnGame ?? createGame(match.boardCode), false));
    if (loaded.status === 'finished') saveFinished(loaded);
    const player = currentPlayer(loaded);
    publish(
      loaded.champion
        ? `Champion: ${loaded.champion.name}`
        : player
          ? `Now playing: ${player.name}`
          : nextTournamentAction(loaded) === 'match'
            ? 'Match complete.'
            : 'Tournament loaded.',
    );
    return true;
  }

  return {
    activate,
    advance,
    announcement: `${announcement}-${turnSession.announcement}`,
    exportJson,
    feedback: notice || (turnStarted ? turnSession.feedback : ''),
    history,
    loadJson,
    start,
    report: publish,
    startTurn,
    storageAvailable,
    tournament,
    turnGame: turnStarted ? turnSession.game : null,
    turnStarted,
    turnSession,
    activeMatch: tournament ? currentMatch(tournament) : null,
  };
}
