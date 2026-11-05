import { useEffect, useRef, useState } from 'react';
import { isWon } from '../game.ts';
import { freshBoardCode } from '../session/fresh-board.ts';
import { useGame } from '../session/use-game.ts';
import { decodeTournament, encodeTournament } from './format.ts';
import {
  createTournament,
  nameError,
  normalizeName,
  playerIndex,
  recordResult,
  roundSize,
} from './rules.ts';
import { readHistory, saveHistory } from './storage.ts';
import type { Tournament } from './rules.ts';

export function useTournament() {
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(Array<string>(8).fill(''));
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [history, setHistory] = useState(readHistory);
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState<null | (() => void)>(null);
  const [announcement, setAnnouncement] = useState('');
  const wasPaused = useRef(false);
  const controller = useGame(true);
  const { session } = controller;
  const match = tournament?.matches[tournament.current];
  const active = tournament?.phase === 'playing';
  useEffect(() => {
    if (!tournament || tournament.phase !== 'playing' || !isWon(session.game)) return;
    const next = recordResult(tournament, {
      moves: session.game.moves,
      elapsedMs: session.game.elapsedMs,
    });
    setTournament(next);
    if (next.phase === 'complete') {
      const items = [next, ...history.items].slice(0, 10);
      setHistory({ items, unavailable: !saveHistory(items).saved });
      setAnnouncement(`Champion: ${next.names[next.matches[next.current]?.winner ?? 0]}`);
    } else setAnnouncement(next.phase === 'turnDone' ? 'Turn complete.' : 'Match complete.');
  }, [tournament, session.game, history.items]);

  function start(): void {
    const cleaned = names.slice(0, count).map(normalizeName);
    const error = nameError(cleaned);
    if (error) {
      setNotice(error);
      setAnnouncement(error);
      return;
    }
    const codes: string[] = [];
    for (let i = 0; i < count - 1; i++) {
      let code: string;
      do {
        code = freshBoardCode(roundSize(count, i));
      } while (codes.includes(code));
      codes.push(code);
    }
    const next = createTournament(cleaned, codes);
    setTournament(next);
    setNotice('');
    setAnnouncement(`Now playing: ${cleaned[next.matches[0]?.players[0] ?? 0]}`);
  }
  function begin(): void {
    if (!tournament || !match) return;
    controller.loadBoard(match.code);
    setTournament({ ...tournament, phase: 'playing' });
    setAnnouncement(`Now playing: ${tournament.names[match.players[playerIndex(match)] ?? 0]}`);
  }
  function confirm(action: () => void): void {
    if (tournament && tournament.phase !== 'complete') {
      if (active) {
        wasPaused.current = session.paused;
        controller.setPaused(true);
      }
      setDialog(() => action);
    } else action();
  }
  function keep(): void {
    setDialog(null);
    if (active && !wasPaused.current) controller.setPaused(false);
  }
  function load(): void {
    const result = decodeTournament(json);
    if (!result.document) {
      setNotice(result.error);
      setAnnouncement(result.error);
      return;
    }
    const doc = result.document;
    confirm(() => {
      if (doc.snapshot) controller.loadSnapshot(doc.snapshot);
      setTournament(doc.tournament);
      if (doc.tournament?.phase === 'complete') {
        const loaded = encodeTournament({ tournament: doc.tournament, snapshot: null });
        const remaining = history.items.filter(
          (item) => encodeTournament({ tournament: item, snapshot: null }) !== loaded,
        );
        const items = [doc.tournament, ...remaining].slice(0, 10);
        setHistory({ items, unavailable: !saveHistory(items).saved });
      }
      setNotice('Tournament loaded.');
      setAnnouncement('Tournament loaded.');
      setDialog(null);
    });
  }
  const player = match && tournament ? match.players[playerIndex(match)] : null;
  function exportCurrent(): void {
    setJson(
      encodeTournament({ tournament, snapshot: active ? controller.exportSnapshot() : null }),
    );
    setNotice('Tournament exported.');
  }
  function exportPast(item: Tournament): void {
    setJson(encodeTournament({ tournament: item, snapshot: null }));
    setNotice('Tournament exported.');
  }
  return {
    count,
    setCount,
    names,
    setNames,
    tournament,
    setTournament,
    history,
    json,
    setJson,
    notice,
    dialog,
    announcement,
    setAnnouncement,
    controller,
    session,
    match,
    active,
    player,
    start,
    begin,
    confirm,
    keep,
    load,
    exportCurrent,
    exportPast,
  };
}
