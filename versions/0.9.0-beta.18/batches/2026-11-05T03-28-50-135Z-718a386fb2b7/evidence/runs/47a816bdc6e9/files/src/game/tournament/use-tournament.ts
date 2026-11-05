import { useEffect, useRef, useState } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import { isWon } from '../game.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { useGame } from '../session/use-game.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import {
  createTournament,
  currentMatch,
  currentPlayer,
  nextMatch,
  normalizeNames,
  recordResult,
  roundSize,
} from './rules.ts';
import type { Tournament } from './rules.ts';
import { readHistory, saveHistory } from './storage.ts';
import { decodeSetup, encodeSetup } from './setup-format.ts';
function deals(size: number, count: number, used: string[]): string[] {
  const codes = [...used];
  for (let i = 0; i < count; i++) {
    let code: string;
    do {
      code = freshBoardCode(size);
    } while (codes.includes(code));
    codes.push(code);
  }
  return codes.slice(used.length);
}
export function useTournament() {
  const game = useGame(true);
  const board = useRef<BoardFocus>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const pending = useRef<(() => void) | null>(null);
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(Array<string>(8).fill(''));
  const [event, setEvent] = useState<Tournament | null>(null);
  const [history, setHistory] = useState(readHistory);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [announcement, setAnnouncement] = useState(0);
  function announce(message: string) {
    setNotice(message);
    setAnnouncement((n) => n + 1);
  }
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (event?.phase !== 'playing' || !isWon(game.session.game)) return;
    const finished = recordResult(event, {
      moves: game.session.game.moves,
      elapsedMs: game.session.game.elapsedMs,
    });
    setEvent(finished);
    if (finished.phase === 'complete') {
      setHistory((old) => {
        const items = [finished, ...old.items].slice(0, 10);
        return { items, blocked: saveHistory(items).blocked };
      });
      announce(`Champion: ${finished.names[currentMatch(finished).winner!]}`);
    } else
      announce(
        finished.phase === 'turn'
          ? `Now playing: ${finished.names[currentPlayer(finished)]}`
          : `Winner: ${
              finished.names[
                finished.rounds
                  .at(-1)!
                  .filter((m) => m.winner !== null)
                  .at(-1)!.winner!
              ]
            }`,
      );
  }, [event, game.session.game]);
  function confirm(action: () => void) {
    if (!event || event.phase === 'complete') {
      action();
      return;
    }
    pending.current = action;
    dialog.current?.showModal();
    keep.current?.focus();
  }
  function start() {
    const result = normalizeNames(names.slice(0, count));
    if (result.error) {
      announce(result.error);
      return;
    }
    setEvent(createTournament(result.names, deals(roundSize(count / 2), count / 2, [])));
    announce(`Now playing: ${result.names[0]}`);
  }
  function startTurn() {
    if (!event) return;
    setNotice('');
    game.startDeal(currentMatch(event).code);
    setEvent({ ...event, phase: 'playing' });
  }
  function advance() {
    if (!event) return;
    if (event.phase === 'turn') {
      const next = { ...event, phase: 'ready' as const };
      setEvent(next);
      announce(`Now playing: ${next.names[currentPlayer(next)]}`);
      return;
    }
    const last = event.rounds.at(-1)!;
    const used = event.rounds.flatMap((r) => r.map((m) => m.code));
    const next = nextMatch(
      event,
      last.every((m) => m.winner !== null)
        ? deals(roundSize(last.length / 2), last.length / 2, used)
        : [],
    );
    setEvent(next);
    announce(`Now playing: ${next.names[currentPlayer(next)]}`);
  }
  function exportEvent() {
    if (!event) {
      setDraft(encodeSetup(count, names));
      announce('Tournament exported.');
      return;
    }
    setDraft(
      encodeTournament(
        event.phase === 'playing' ? { ...event, ...game.exportTournamentSnapshot() } : event,
      ),
    );
    announce('Tournament exported.');
  }
  function load() {
    const setup = decodeSetup(draft);
    if (setup) {
      if (!setup.setup) {
        announce(setup.error);
        return;
      }
      const loaded = setup.setup;
      confirm(() => {
        setCount(loaded.players);
        setNames(loaded.names);
        setEvent(null);
        announce('Tournament loaded.');
      });
      return;
    }
    const result = decodeTournament(draft);
    if (!result.tournament) {
      announce(result.error);
      return;
    }
    const loaded = result.tournament;
    confirm(() => {
      if (loaded.phase === 'playing' && loaded.snapshot)
        game.loadSnapshot(loaded.snapshot, loaded.elapsedMs ?? undefined);
      setEvent(loaded);
      announce('Tournament loaded.');
    });
  }
  const match = event && currentMatch(event);
  return {
    game,
    board,
    heading,
    dialog,
    keep,
    pending,
    count,
    setCount,
    names,
    setNames,
    event,
    setEvent,
    history,
    draft,
    setDraft,
    notice,
    setNotice,
    announcement,
    announce,
    confirm,
    start,
    startTurn,
    advance,
    exportEvent,
    load,
    match,
  };
}
