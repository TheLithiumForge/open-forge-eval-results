import { useRef, useState } from 'react';
import { createGame, isWon } from '../game.ts';
import { formatElapsed } from '../elapsed-time.ts';
import { decodeSnapshot } from '../snapshot.ts';
import { freshBoardCode } from './fresh-board.ts';
import { useTournamentHistory } from './use-tournament-history.ts';
import {
  createTournament,
  matchPlayers,
  matchWinner,
  nameProblem,
  normalizeName,
  recordTournamentResult,
  tournamentRound,
  TournamentPhase,
} from '../tournament/rules.ts';
import { decodeTournament, encodeTournament } from '../tournament/format.ts';
import type { useGame } from './use-game.ts';
import type { TournamentDocument, TournamentRun } from '../tournament/format.ts';
import type { TournamentRecord } from '../tournament/rules.ts';

export function useTournament(
  controller: ReturnType<typeof useGame>,
  confirm: (action: () => void) => void,
) {
  const { history, save } = useTournamentHistory();
  const [document, setDocument] = useState<TournamentDocument>({
    setup: { count: 4, names: Array.from({ length: 8 }, () => '') },
    run: null,
  });
  const current = useRef(document);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');

  function commit(next: TournamentDocument, focus = true): void {
    current.current = next;
    setDocument(next);
    if (focus) setRevision((value) => value + 1);
  }

  function publish(text: string, showNotice = false): void {
    setNotice(showNotice ? text : '');
    controller.notice(text);
  }

  function updateSetup(count: number, names: readonly string[]): void {
    commit({ ...current.current, setup: { count, names } }, false);
  }

  function start(): void {
    const setup = current.current.setup;
    const names = setup.names.slice(0, setup.count).map(normalizeName);
    const error = nameProblem(names);
    if (error) {
      publish(error, true);
      return;
    }
    const codes: string[] = [];
    for (let index = 0; index < names.length - 1; index += 1) {
      const size = tournamentRound(names.length, index).size;
      let code: string;
      do {
        code = freshBoardCode(size);
      } while (codes.includes(code));
      codes.push(code);
    }
    const event = createTournament(names, codes);
    commit({
      setup: { ...setup, names: setup.names.map(normalizeName) },
      run: { event, matchIndex: 0, phase: TournamentPhase.ready, game: null },
    });
    publish(`Now playing: ${names[0]}`);
  }

  function playerName(run: TournamentRun): string {
    const turn = run.event.matches[run.matchIndex]?.results.length ?? 0;
    const seed = matchPlayers(run.event, run.matchIndex)[Math.min(turn, 1)];
    return seed == null ? '' : (run.event.players[seed - 1] ?? '');
  }

  function startTurn(): void {
    const run = current.current.run;
    const match = run?.event.matches[run.matchIndex];
    if (!run || !match || run.phase !== TournamentPhase.ready) return;
    controller.startTournamentGame(run.game ?? createGame(match.boardCode));
    commit({ ...current.current, run: { ...run, phase: TournamentPhase.playing, game: null } });
    publish(`Now playing: ${playerName(run)}`);
  }

  function activate(index: number): void {
    const run = current.current.run;
    if (!run || run.phase !== TournamentPhase.playing) return;
    const game = controller.activate(index);
    if (!isWon(game)) return;
    const event = recordTournamentResult(run.event, run.matchIndex, {
      moves: game.moves,
      elapsedMs: game.elapsedMs,
    });
    const finished = event.matches[run.matchIndex]?.results.length === 2;
    const complete = finished && run.matchIndex === event.matches.length - 1;
    const phase = complete
      ? TournamentPhase.complete
      : finished
        ? TournamentPhase.matchResult
        : TournamentPhase.turnResult;
    commit({ ...current.current, run: { ...run, event, phase } });
    if (complete) {
      save(event);
      const seed = matchWinner(event, run.matchIndex);
      publish(
        `Pair found. All pairs found in ${game.moves} moves and ${formatElapsed(game.elapsedMs)}. Champion: ${seed == null ? '' : event.players[seed - 1]}`,
      );
    }
  }

  function next(): void {
    const run = current.current.run;
    if (
      !run ||
      (run.phase !== TournamentPhase.turnResult && run.phase !== TournamentPhase.matchResult)
    )
      return;
    const matchIndex = run.matchIndex + (run.phase === TournamentPhase.matchResult ? 1 : 0);
    const nextRun = { ...run, matchIndex, phase: TournamentPhase.ready, game: null };
    commit({ ...current.current, run: nextRun });
    publish(`Now playing: ${playerName(nextRun)}`);
  }

  function exportDocument(): string {
    const run = current.current.run;
    const game =
      run?.phase === TournamentPhase.playing
        ? decodeSnapshot(controller.exportSnapshot())
        : run?.game;
    return encodeTournament({
      ...current.current,
      run: run ? { ...run, game: game ?? null } : null,
    });
  }

  function load(text: string): void {
    const decoded = decodeTournament(text);
    if (typeof decoded === 'string') {
      publish(decoded, true);
      return;
    }
    const replace = () => {
      controller.suspend();
      commit(decoded);
      if (decoded.run?.phase === TournamentPhase.complete) save(decoded.run.event);
      publish('Loaded tournament.', true);
    };
    if (current.current.run && current.current.run.phase !== TournamentPhase.complete)
      confirm(replace);
    else replace();
  }

  function viewPast(event: TournamentRecord): void {
    commit({
      ...current.current,
      run: {
        event,
        matchIndex: event.matches.length - 1,
        phase: TournamentPhase.complete,
        game: null,
      },
    });
    publish(`Champion: ${event.players[(matchWinner(event, event.matches.length - 1) ?? 1) - 1]}`);
  }

  function reset(): void {
    controller.suspend();
    commit({ ...current.current, run: null });
    publish('');
  }

  return {
    ...document,
    history,
    notice,
    revision,
    updateSetup,
    start,
    startTurn,
    activate,
    next,
    exportDocument,
    load,
    viewPast,
    reset,
    playerName,
  };
}
