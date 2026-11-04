import { useRef, useState } from 'react';
import type { Size } from '../boardCode.ts';
import { activateCard, createGame, isWon } from '../state.ts';
import type { GameState } from '../state.ts';
import { decodeSnapshot, encodeSnapshot } from '../snapshot.ts';
import { freshGame } from './deal.ts';
import { readPreferences, writePreferences } from './storage.ts';
import type { BestScores } from './storage.ts';
import { useGameClock } from './clock.ts';
import { turnAnnouncement } from './announcement.ts';

type Notice = { id: number; text: string };
type Session = {
  game: GameState; bests: BestScores; paused: boolean; epoch: number;
  celebrate: boolean; notice: Notice; loadStatus: string;
};

function initialSession(): Session {
  const { size, bests } = readPreferences();
  return { game: freshGame(size), bests, paused: false, epoch: 0, celebrate: false,
    notice: { id: 0, text: '' }, loadStatus: '' };
}

export function useSession() {
  const [session, setSession] = useState(initialSession);
  const ref = useRef(session);
  function commit(next: Session) { ref.current = next; setSession(next); }
  function tick(game: GameState) {
    const previous = ref.current.game;
    const next = { ...ref.current, game };
    ref.current = next;
    // Retain exact logical time; render only when the clock or card presentation changes.
    if (Math.floor(previous.elapsedMs / 1000) !== Math.floor(game.elapsedMs / 1000) ||
      previous.selection.kind !== game.selection.kind) setSession(next);
  }
  const clock = useGameClock({ current: () => ref.current, epoch: session.epoch,
    update: tick });

  function announce(text: string, loadStatus = ref.current.loadStatus) {
    const current = ref.current;
    commit({ ...current, notice: { id: current.notice.id + 1, text }, loadStatus });
  }

  function replace(game: GameState, paused = false, message = '') {
    const current = ref.current;
    writePreferences({ size: game.board.size, bests: current.bests });
    clock.reset();
    commit({ ...current, game, paused, epoch: current.epoch + 1, celebrate: false, loadStatus: message,
      notice: { id: current.notice.id + 1, text: message } });
  }

  function activate(index: number) {
    const before = clock.sync();
    if (ref.current.paused) return;
    const game = activateCard(before, index);
    if (game === before) return;
    if (!before.started) clock.reset();
    let { bests } = ref.current;
    const won = isWon(game);
    if (won) {
      const best = bests[game.board.size];
      if (best === undefined || game.moves < best) {
        bests = { ...bests, [game.board.size]: game.moves };
        writePreferences({ size: game.board.size, bests });
      }
    }
    commit({ ...ref.current, game, bests, celebrate: won });
    const text = turnAnnouncement(before, game);
    if (text) announce(text);
  }

  function newGame(size: Size = ref.current.game.board.size) {
    replace(freshGame(size, ref.current.game.board.seed));
  }

  function restart() {
    const game = createGame(ref.current.game.board.code);
    if (game) replace(game);
  }

  function loadBoard(text: string) {
    const game = createGame(text.trim());
    if (game) replace(game, false, 'Loaded board.');
    else announce('Invalid board code.', 'Invalid board code.');
  }

  function loadSnapshot(text: string) {
    const game = decodeSnapshot(text);
    if (!game) { announce('Invalid snapshot.', 'Invalid snapshot.'); return; }
    const completed = isWon(game);
    replace(game, !completed, completed ? 'Loaded completed snapshot.' : 'Loaded snapshot. Select Resume to continue.');
  }

  function resume() {
    clock.reset();
    commit({ ...ref.current, paused: false, loadStatus: '' });
  }

  function exportSnapshot() { return encodeSnapshot(clock.sync()); }

  return { ...session, activate, newGame, restart, loadBoard, loadSnapshot, resume, exportSnapshot };
}
