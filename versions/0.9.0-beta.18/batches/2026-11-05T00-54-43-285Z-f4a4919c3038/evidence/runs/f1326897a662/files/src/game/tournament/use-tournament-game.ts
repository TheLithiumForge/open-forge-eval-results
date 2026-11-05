import { useLayoutEffect, useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { currentPlayer, matchWinner, TournamentPhase } from './rules.ts';
import { useTournament } from './use-tournament.ts';
import { encodeTournament } from './format.ts';
import type { useGame } from '../session/use-game.ts';
import type { LeaveRequest } from './LeaveDialog.tsx';
import type { TournamentDocument } from './format.ts';

export function useTournamentGame(controller: ReturnType<typeof useGame>) {
  const tournament = useTournament(controller.announce);
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [returned, setReturned] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const { session } = controller;
  const event = tournament.tournament;
  const playing = tournament.open && event?.phase === TournamentPhase.playing && !session.paused;
  useLayoutEffect(() => {
    if (!tournament.open && returned) heading.current?.focus();
  }, [tournament.open, returned]);

  function confirm(action: () => void, unfinished: boolean): void {
    if (unfinished) setRequest({ proceed: action, trigger: document.activeElement });
    else action();
  }

  function enter(): void {
    confirm(
      () => {
        controller.enterTournament();
        tournament.enter();
      },
      session.game.started && !isWon(session.game),
    );
  }

  function leave(): void {
    confirm(
      () => {
        controller.leaveTournament();
        tournament.leave();
        setReturned(true);
      },
      event !== null && event.phase !== TournamentPhase.completed,
    );
  }

  function startTurn(): void {
    if (!event) return;
    if (event.phase === TournamentPhase.playing && session.paused) controller.resume();
    else {
      const code = tournament.begin();
      if (!code) return;
      controller.startTournamentTurn(code);
    }
    controller.announce(`Now playing: ${currentPlayer(event)}`);
  }

  function activate(index: number): void {
    const next = controller.activate(index);
    if (!playing || !isWon(next)) return;
    const finished = tournament.finish(next);
    if (finished?.phase === TournamentPhase.completed) {
      const winner = matchWinner(finished, finished.currentMatch);
      controller.announce(
        `Pair found. All pairs found in ${next.moves} moves and ${formatElapsed(next.elapsedMs)}. Champion: ${winner == null ? '' : finished.players[winner - 1]}`,
      );
    }
  }

  function load(document: TournamentDocument): void {
    confirm(
      () => {
        controller.pause();
        tournament.load(document);
        if (document.game) {
          controller.startTournamentTurn(document.game.boardCode, document.game);
          const player = document.tournament ? currentPlayer(document.tournament) : '';
          controller.announce(
            `Loaded tournament. Now playing: ${player}. Select Start turn to continue.`,
          );
        }
      },
      event !== null && event.phase !== TournamentPhase.completed,
    );
  }

  function exportTournament(): string {
    const snapshot = event?.phase === TournamentPhase.playing ? controller.exportSnapshot() : null;
    return encodeTournament(tournament.setup, event, snapshot);
  }

  return {
    tournament,
    returned,
    heading,
    request,
    playing,
    enter,
    leave,
    startTurn,
    activate,
    load,
    exportTournament,
    clearRequest: () => setRequest(null),
  };
}
