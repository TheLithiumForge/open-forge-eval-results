import { useEffect, useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { useGame } from '../session/use-game.ts';
import {
  advanceTournamentMatch,
  beginTournamentTurn,
  createTournament,
  roundPlan,
  stageSize,
} from './rules.ts';
import { finishTournamentTurn, tournamentPlayer } from './results.ts';
import type { TournamentPlayer, TournamentState } from './types.ts';

interface TournamentOptions {
  readonly announce: (text: string) => void;
  readonly onComplete: (tournament: TournamentState) => void;
}

export function useTournament({ announce, onComplete }: TournamentOptions) {
  const controller = useGame({ persistPreferences: false, recordBest: false, initialSize: 4 });
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const latest = useRef(tournament);
  const previousAnnouncement = useRef(controller.session.announcement);

  function commit(next: TournamentState): void {
    if (next === latest.current) return;
    latest.current = next;
    setTournament(next);
  }

  useEffect(() => {
    if (previousAnnouncement.current === controller.session.announcement) return;
    previousAnnouncement.current = controller.session.announcement;
    if (!isWon(controller.session.game) && controller.session.feedback)
      announce(controller.session.feedback);
  }, [
    announce,
    controller.session.announcement,
    controller.session.feedback,
    controller.session.game,
  ]);

  useEffect(() => {
    const current = latest.current;
    const game = controller.session.game;
    if (!current || current.phase !== 'playing' || !isWon(game)) return;
    const seed = current.matches[current.currentMatchIndex]?.players[current.activePlayer] ?? null;
    const player = tournamentPlayer(current, seed);
    const next = finishTournamentTurn(
      current,
      { moves: game.moves, elapsedMs: game.elapsedMs },
      new Date().toISOString(),
    );
    if (next === current) return;
    commit(next);
    if (next.phase === 'complete') {
      onComplete(next);
      announce(
        `${player?.name ?? 'Player'} finished in ${game.moves} moves and ${formatElapsed(game.elapsedMs)}. ` +
          `Champion: ${tournamentPlayer(next, next.championSeed)?.name ?? ''}`,
      );
      return;
    }
    if (next.phase === 'betweenMatches') {
      const winner = tournamentPlayer(
        next,
        next.matches[next.currentMatchIndex]?.winnerSeed ?? null,
      );
      announce(
        `${player?.name ?? 'Player'} finished in ${game.moves} moves and ${formatElapsed(game.elapsedMs)}. ` +
          `${winner?.name ?? 'Player'} wins the ${current.matches[current.currentMatchIndex]?.round}.`,
      );
      return;
    }
    const nextPlayer = tournamentPlayer(
      next,
      next.matches[next.currentMatchIndex]?.players[1] ?? null,
    );
    announce(
      `${player?.name ?? 'Player'} finished in ${game.moves} moves and ${formatElapsed(game.elapsedMs)}. ` +
        `Now playing: ${nextPlayer?.name ?? ''}`,
    );
  }, [announce, controller.session.game, onComplete]);

  function start(players: readonly TournamentPlayer[]): void {
    const used = new Set<string>();
    const codes = roundPlan(players.length).map((round) => {
      let code = freshBoardCode(stageSize(round));
      while (used.has(code)) code = freshBoardCode(stageSize(round));
      used.add(code);
      return code;
    });
    const next = createTournament(players, codes, new Date().toISOString());
    if (!next) return;
    commit(next);
    announce(
      `Now playing: ${tournamentPlayer(next, next.matches[0]?.players[0] ?? null)?.name ?? ''}`,
    );
  }

  function startTurn(): void {
    const current = latest.current;
    if (!current || (current.phase !== 'ready' && current.phase !== 'betweenTurns')) return;
    const match = current.matches[current.currentMatchIndex];
    const name = tournamentPlayer(current, match?.players[current.activePlayer] ?? null)?.name;
    if (!match || !name || !controller.loadBoard(match.boardCode)) return;
    commit(beginTournamentTurn(current));
    announce(`Now playing: ${name}`);
  }

  function nextMatch(): void {
    const current = latest.current;
    if (!current || current.phase !== 'betweenMatches') return;
    const next = advanceTournamentMatch(current);
    commit(next);
    const match = next.matches[next.currentMatchIndex];
    announce(`Now playing: ${tournamentPlayer(next, match?.players[0] ?? null)?.name ?? ''}`);
  }

  function load(imported: TournamentState): boolean {
    const currentGame = imported.currentGame;
    if (imported.phase === 'playing') {
      if (!currentGame || !controller.loadSnapshot(currentGame)) return false;
      controller.resume();
    } else {
      const match = imported.matches[imported.currentMatchIndex];
      if (!match || !controller.loadBoard(match.boardCode)) return false;
    }
    const restored = { ...imported, currentGame: null };
    commit(restored);
    if (restored.phase === 'complete') onComplete(restored);
    const match = restored.matches[restored.currentMatchIndex];
    const seed =
      restored.phase === 'betweenMatches' ? null : (match?.players[restored.activePlayer] ?? null);
    announce(
      restored.phase === 'complete'
        ? `Champion: ${tournamentPlayer(restored, restored.championSeed)?.name ?? ''}`
        : seed === null
          ? 'Tournament loaded.'
          : `Now playing: ${tournamentPlayer(restored, seed)?.name ?? ''}`,
    );
    return true;
  }

  return { controller, tournament, start, startTurn, nextMatch, load };
}
