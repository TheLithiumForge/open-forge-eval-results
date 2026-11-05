import { useEffect, useRef, useState } from 'react';
import { Board } from './board/Board.tsx';
import type { BoardFocus } from './board/Board.tsx';
import { Controls } from './controls/Controls.tsx';
import { Reproduction } from './controls/Reproduction.tsx';
import { freshBoardCode } from './session/fresh-board.ts';
import { browserStore } from './session/use-saved-preferences.ts';
import { useGame } from './session/use-game.ts';
import { GameStatus } from './status/GameStatus.tsx';
import { TournamentScreen } from './TournamentScreen.tsx';
import {
  activeTournamentMatch,
  advanceTournamentMatch,
  advanceTournamentTurn,
  createTournament,
  decodeTournamentFile,
  encodeTournamentFile,
  recordTournamentTurn,
  startTournamentTurn,
} from './tournament.ts';
import type { Tournament } from './tournament.ts';
import { readTournamentStore, writeTournamentStore } from './tournament-storage.ts';
import type { TournamentStore } from './tournament-storage.ts';
import { isWon } from './game.ts';
import './game.css';

type Screen = 'game' | 'tournament';

export function Game() {
  const controller = useGame();
  const { session } = controller;
  const { game } = session;
  const board = useRef<BoardFocus>(null);
  const [tournamentAccess] = useState(() => {
    const storage = browserStore();
    return { storage, initial: readTournamentStore(storage) };
  });
  const [tournaments, setTournaments] = useState<TournamentStore>(tournamentAccess.initial);
  const [screen, setScreen] = useState<Screen>(
    tournamentAccess.initial.active ? 'tournament' : 'game',
  );
  const [championView, setChampionView] = useState<Tournament | null>(null);
  const restoredActive = useRef<string | null>(null);

  useEffect(() => {
    writeTournamentStore(tournamentAccess.storage, tournaments);
  }, [tournamentAccess.storage, tournaments]);

  useEffect(() => {
    const active = tournaments.active;
    if (!active) {
      restoredActive.current = null;
      return;
    }
    if (restoredActive.current === active.createdAt) return;
    restoredActive.current = active.createdAt;
    const match = activeTournamentMatch(active);
    if (!match?.boardCode) return;
    if (active.turnState === 'playing') {
      // The browser store keeps bracket progress; JSON export carries the exact in-progress game.
      // A saved turn without its exported snapshot restarts from the same deal.
      controller.loadBoard(match.boardCode);
      setTournaments((current) =>
        current.active?.createdAt === active.createdAt
          ? { ...current, active: { ...current.active, turnState: 'ready' } }
          : current,
      );
    } else {
      controller.loadBoard(match.boardCode);
    }
  }, [controller, tournaments.active?.createdAt]);

  useEffect(() => {
    const active = tournaments.active;
    if (!active || active.turnState !== 'playing' || !isWon(game)) return;
    const result = { moves: game.moves, elapsedMs: Math.floor(game.elapsedMs) };
    setTournaments((current) => {
      const currentActive = current.active;
      if (!currentActive || currentActive.turnState !== 'playing') return current;
      const next = recordTournamentTurn(currentActive, result);
      return next === currentActive ? current : { ...current, active: next };
    });
  }, [game, tournaments.active]);

  function openTournament(): void {
    controller.pause();
    setChampionView(null);
    setScreen('tournament');
  }

  function returnToGame(): void {
    setChampionView(null);
    setScreen('game');
    controller.resume();
  }

  function beginTournament(playerCount: 4 | 8, names: readonly string[]): void {
    const boardCode = freshBoardCode(game.size, game.seed);
    const tournament = createTournament(playerCount, names, game.size, boardCode);
    if (!tournament) return;
    controller.loadBoard(boardCode);
    setTournaments((current) => ({ ...current, active: tournament }));
    setChampionView(null);
  }

  function beginTurn(): void {
    const active = tournaments.active;
    const match = active ? activeTournamentMatch(active) : null;
    if (!active || !match?.boardCode) return;
    controller.loadBoard(match.boardCode);
    setTournaments((current) => {
      if (!current.active || current.active.createdAt !== active.createdAt) return current;
      const next = startTournamentTurn(current.active);
      return next === current.active ? current : { ...current, active: next };
    });
  }

  function nextTurn(): void {
    const active = tournaments.active;
    const match = active ? activeTournamentMatch(active) : null;
    if (!active || !match?.boardCode) return;
    const next = advanceTournamentTurn(active);
    if (next === active) return;
    controller.loadBoard(match.boardCode);
    setTournaments((current) =>
      current.active?.createdAt === active.createdAt ? { ...current, active: next } : current,
    );
  }

  function nextMatch(): void {
    const active = tournaments.active;
    if (!active) return;
    const next = advanceTournamentMatch(active, freshBoardCode(active.boardSize));
    if (next === active) return;
    if (next.phase === 'complete') {
      setTournaments((current) => {
        if (current.active?.createdAt !== active.createdAt) return current;
        return {
          active: null,
          past: [next, ...current.past.filter((item) => item.createdAt !== next.createdAt)],
        };
      });
      setChampionView(next);
      return;
    }
    const match = activeTournamentMatch(next);
    if (match?.boardCode) controller.loadBoard(match.boardCode);
    setTournaments((current) =>
      current.active?.createdAt === active.createdAt ? { ...current, active: next } : current,
    );
  }

  function leaveTournament(): void {
    setTournaments((current) => ({ ...current, active: null }));
    setChampionView(null);
    setScreen('game');
    controller.newGame(game.size);
  }

  function exportTournament(tournament: Tournament): string {
    const match = activeTournamentMatch(tournament);
    const snapshot =
      tournaments.active?.createdAt === tournament.createdAt && match?.boardCode === game.boardCode
        ? controller.exportSnapshot()
        : null;
    return encodeTournamentFile(tournament, snapshot);
  }

  function loadTournament(text: string): boolean {
    const file = decodeTournamentFile(text);
    if (!file) return false;
    const { tournament, gameSnapshot } = file;
    if (tournament.phase === 'active') {
      const match = activeTournamentMatch(tournament);
      if (!match?.boardCode) return false;
      let next = tournament;
      if (gameSnapshot) {
        if (!controller.loadTournamentSnapshot(gameSnapshot)) return false;
      } else {
        controller.loadBoard(match.boardCode);
        if (next.turnState === 'playing') next = { ...next, turnState: 'ready' };
      }
      restoredActive.current = next.createdAt;
      setTournaments((current) => ({ ...current, active: next }));
      setChampionView(null);
    } else {
      setTournaments((current) => ({
        active: null,
        past: [
          tournament,
          ...current.past.filter((item) => item.createdAt !== tournament.createdAt),
        ],
      }));
      setChampionView(tournament);
    }
    setScreen('tournament');
    return true;
  }

  function resume(): void {
    board.current?.focusRemembered();
    controller.resume();
  }

  return (
    <main>
      <header>
        <p className="eyebrow">A little focus. A perfect pair.</p>
        <h1>Neon Pairs</h1>
      </header>
      {screen === 'game' ? (
        <>
          <p className="intro">Reveal two cards. Match their shape and marker to keep the pair.</p>
          <Controls
            size={game.size}
            newGame={controller.newGame}
            restart={controller.restart}
            openTournament={openTournament}
          />
          <GameStatus
            game={game}
            best={session.preferences.bestMoves[String(game.size)]}
            celebration={session.celebration}
          />
          <p id="board-help" className="help">
            Use a pointer or Tab to enter the board. Arrow keys move between cards. Enter or Space
            reveals a card.
          </p>
          <div className="game-result">
            <p role="status" aria-live="polite" aria-atomic="true">
              <span key={session.announcement}>{session.feedback}</span>
            </p>
          </div>
          <Board key={session.generation} game={game} activate={controller.activate} ref={board} />
          <Reproduction
            game={game}
            generation={session.generation}
            exportSnapshot={controller.exportSnapshot}
            loadBoard={controller.loadBoard}
            loadSnapshot={controller.loadSnapshot}
            notice={session.loadNotice}
            paused={session.paused}
            resume={resume}
          />
        </>
      ) : (
        <TournamentScreen
          session={session}
          active={tournaments.active}
          championView={championView}
          past={tournaments.past}
          startTournament={beginTournament}
          startTurn={beginTurn}
          nextTurn={nextTurn}
          nextMatch={nextMatch}
          leaveTournament={leaveTournament}
          backToGame={returnToGame}
          setupAnother={() => setChampionView(null)}
          exportTournament={exportTournament}
          loadTournament={loadTournament}
          activate={controller.activate}
        />
      )}
    </main>
  );
}
