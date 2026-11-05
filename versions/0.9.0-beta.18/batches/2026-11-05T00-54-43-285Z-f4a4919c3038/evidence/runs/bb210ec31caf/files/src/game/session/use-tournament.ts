import { useRef, useState } from 'react';
import { createGame, isWon } from '../game.ts';
import { freshBoardCode } from './fresh-board.ts';
import { activateSession, initialSession } from './session.ts';
import { useSessionClock } from './use-session-clock.ts';
import {
  createTournament,
  nextTournamentTurn,
  recordTournamentResult,
  tournamentStages,
  TournamentPhase,
} from '../tournament/rules.ts';
import { encodeTournament } from '../tournament/format.ts';
import type { TournamentArchive } from '../tournament/format.ts';
import type { TournamentState } from '../tournament/rules.ts';
import type { Session } from './session.ts';

interface TournamentSession extends Session {
  readonly tournament: TournamentState | null;
}

export function useTournament(save: (archive: TournamentArchive) => void, visible: boolean) {
  const [session, setSession] = useState<TournamentSession>(() => ({
    ...initialSession('np1-4-1', { size: 4, bestMoves: {} }),
    paused: true,
    tournament: null,
  }));
  const current = useRef(session);
  function commit(next: TournamentSession): void {
    current.current = next;
    setSession(next);
  }
  const clock = useSessionClock(session, current, commit, visible);

  function notice(feedback: string): void {
    commit({
      ...current.current,
      feedback,
      loadNotice: feedback,
      announcement: current.current.announcement + 1,
    });
  }
  function restore(archive: TournamentArchive, imported = true): void {
    clock.reset();
    const old = current.current;
    const tournament =
      archive.tournament?.phase === TournamentPhase.playing
        ? { ...archive.tournament, phase: TournamentPhase.ready }
        : archive.tournament;
    const match = tournament?.matches[tournament.matchIndex];
    const player = match?.players[tournament?.turn ?? 0];
    const feedback =
      tournament?.phase === TournamentPhase.complete
        ? `Champion: ${tournament.players[tournament.matches.at(-1)?.winner ?? -1]}`
        : tournament && player !== null && player !== undefined
          ? `Now playing: ${tournament.players[player]}`
          : '';
    commit({
      ...initialSession(archive.game?.boardCode ?? 'np1-4-1', old.preferences),
      game: archive.game ?? createGame('np1-4-1'),
      tournament,
      paused: true,
      generation: old.generation + 1,
      announcement: old.announcement + 1,
      feedback: imported ? `Loaded tournament. ${feedback}`.trim() : feedback,
      loadNotice: imported ? 'Loaded tournament.' : '',
    });
    if (imported && tournament?.phase === TournamentPhase.complete)
      save({ tournament, game: archive.game });
  }
  function start(names: readonly string[]): void {
    const codes: string[] = [];
    for (const [index, stage] of tournamentStages(names.length).entries()) {
      for (let count = 0; count < names.length / 2 ** (index + 1); count += 1) {
        let code = freshBoardCode(stage.size);
        while (codes.includes(code)) code = freshBoardCode(stage.size);
        codes.push(code);
      }
    }
    const tournament = createTournament(names, codes);
    const code = tournament.matches[0]?.boardCode;
    if (code) restore({ tournament, game: createGame(code) }, false);
  }
  function startTurn(): void {
    const old = current.current;
    if (old.tournament?.phase !== TournamentPhase.ready) return;
    clock.reset();
    commit({
      ...old,
      paused: false,
      tournament: { ...old.tournament, phase: TournamentPhase.playing },
      loadNotice: '',
      announcement: old.announcement + 1,
    });
  }
  function activate(index: number): void {
    if (current.current.tournament?.phase !== TournamentPhase.playing) return;
    clock.synchronize();
    let next = activateSession(current.current, index, false);
    if (next !== current.current && isWon(next.game) && next.tournament) {
      const tournament = recordTournamentResult(next.tournament, {
        moves: next.game.moves,
        elapsedMs: next.game.elapsedMs,
      });
      next = { ...next, tournament };
      if (tournament.phase === TournamentPhase.complete) {
        next = {
          ...next,
          feedback: `${next.feedback} Champion: ${tournament.players[tournament.matches.at(-1)?.winner ?? -1]}`,
        };
        save({ tournament, game: next.game });
      }
    }
    commit(next);
  }
  function nextTurn(): void {
    const old = current.current.tournament;
    if (!old) return;
    const tournament = nextTournamentTurn(old);
    const code = tournament.matches[tournament.matchIndex]?.boardCode;
    if (tournament !== old && code) restore({ tournament, game: createGame(code) }, false);
  }
  function exportTournament(): string {
    clock.synchronize();
    return encodeTournament(
      current.current.tournament,
      current.current.tournament ? current.current.game : null,
    );
  }
  function clear(): void {
    restore({ tournament: null, game: null }, false);
  }
  return {
    session,
    start,
    startTurn,
    activate,
    nextTurn,
    restore,
    exportTournament,
    notice,
    clear,
  };
}
