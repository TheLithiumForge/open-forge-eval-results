import { useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { currentMatch, type Tournament, type TournamentDraft, type TournamentResult } from './tournament.ts';
import { encodeTournament } from './tournament-format.ts';
import {
  browserTournamentStore,
  readTournamentHistory,
  writeTournamentHistory,
  type TournamentStore,
} from './tournament-storage.ts';
import { tournamentStatusKey, tournamentStatusText } from './tournament-status.ts';
import { useTournamentExchange, type TournamentDialogAction } from './use-tournament-exchange.ts';
import { useTournamentPlay } from './use-tournament-play.ts';
import type { TournamentTurnHandle } from './TournamentTurn.tsx';

export interface TournamentController {
  readonly actionLabel: string | null;
  readonly activeTurnKey: string;
  readonly autoFocusBoard: boolean;
  readonly current: Tournament['current'];
  readonly dialogAction: TournamentDialogAction;
  readonly draft: TournamentDraft;
  readonly gameSnapshot: string | null;
  readonly history: readonly Tournament[];
  readonly json: string;
  readonly match: ReturnType<typeof currentMatch>;
  readonly notice: string;
  readonly player: Tournament['entrants'][number] | null;
  readonly result: TournamentResult | null;
  readonly setDraft: Dispatch<SetStateAction<TournamentDraft>>;
  readonly setJson: Dispatch<SetStateAction<string>>;
  readonly startButtonVisible: boolean;
  readonly status: string;
  readonly statusKey: string;
  readonly storageAvailable: boolean;
  readonly tournament: Tournament | null;
  readonly turn: RefObject<TournamentTurnHandle | null>;
  readonly turnStarted: boolean;
  cancelDialog(): void;
  confirmDialog(): void;
  exportCurrent(): void;
  loadFromJson(): void;
  onBoardFocused(): void;
  onComplete(result: TournamentResult): void;
  onFeedback(text: string, number: number): void;
  requestLeave(): void;
  startTournament(): void;
  turnAction(): void;
}

export function useTournament(onBack: () => void): TournamentController {
  const [store] = useState<TournamentStore | null>(browserTournamentStore);
  const [initialHistory] = useState(() => readTournamentHistory(store));
  const [history, setHistory] = useState<readonly Tournament[]>(initialHistory.items);
  const [storageAvailable, setStorageAvailable] = useState(initialHistory.available);
  const play = useTournamentPlay();
  const turn = useRef<TournamentTurnHandle>(null);

  useEffect(() => {
    if (!play.saveWhenComplete || play.tournament?.status !== 'complete') return;
    const identity = encodeTournament({ draft: play.draft, gameSnapshot: null, tournament: play.tournament });
    const alreadySaved = history.some(
      (item) => encodeTournament({ draft: play.draft, gameSnapshot: null, tournament: item }) === identity,
    );
    if (!alreadySaved) {
      const next = [play.tournament, ...history].slice(0, 10);
      setHistory(next);
      setStorageAvailable(writeTournamentHistory(store, next));
    }
    play.setSaveWhenComplete(false);
  }, [history, play.draft, play.saveWhenComplete, play.setSaveWhenComplete, play.tournament, store]);

  const current = play.current;
  const match = play.match;
  const player = play.player;
  const result = play.result;
  const activeTurnKey = current ? `${current.round}-${current.match}-${current.turn}` : '';
  const turnKeyRef = useRef('');
  turnKeyRef.current = activeTurnKey;
  const exchange = useTournamentExchange({
    draft: play.draft,
    history,
    onBack,
    result,
    setAutoFocusBoard: play.setAutoFocusBoard,
    setDraft: play.setDraft,
    setGameFeedback: play.setGameFeedback,
    setGameSnapshot: play.setGameSnapshot,
    setSaveWhenComplete: play.setSaveWhenComplete,
    setStartButtonVisible: play.setStartButtonVisible,
    setTournament: play.setTournament,
    setTurnStarted: play.setTurnStarted,
    tournament: play.tournament,
    turnRef: turn,
    turnStarted: play.turnStarted,
  });
  const onFeedback = (text: string, number: number): void => {
    play.setGameFeedback({ key: turnKeyRef.current, number, text });
    exchange.clearNotice();
  };
  const startTournament = (): void => play.startTournament(exchange.publish, exchange.clearNotice);
  const turnAction = (): void => play.turnAction(exchange.clearNotice);

  const actionLabel = play.tournament?.status === 'active'
    ? match?.winner
      ? 'Next match'
      : current?.turn === 0 && match?.results[0]
        ? 'Next turn'
        : !play.turnStarted || play.startButtonVisible
          ? 'Start turn'
          : null
    : null;
  const status = tournamentStatusText(
    play.tournament,
    player,
    match,
    current,
    result,
    play.gameFeedback,
    activeTurnKey,
    exchange.notice.message,
  );
  const statusKey = tournamentStatusKey(
    play.tournament,
    player,
    match,
    current,
    result,
    play.gameFeedback,
    activeTurnKey,
    exchange.notice,
  );

  return {
    actionLabel,
    activeTurnKey,
    autoFocusBoard: play.autoFocusBoard,
    cancelDialog: exchange.cancelDialog,
    confirmDialog: exchange.confirmDialog,
    current,
    dialogAction: exchange.dialogAction,
    draft: play.draft,
    exportCurrent: exchange.exportCurrent,
    gameSnapshot: play.gameSnapshot,
    history,
    json: exchange.json,
    loadFromJson: exchange.loadFromJson,
    match,
    notice: exchange.notice.message,
    onBoardFocused: play.onBoardFocused,
    onComplete: play.onComplete,
    onFeedback,
    player,
    requestLeave: exchange.requestLeave,
    result,
    setDraft: play.setDraft,
    setJson: exchange.setJson,
    startButtonVisible: play.startButtonVisible,
    startTournament,
    status,
    statusKey,
    storageAvailable,
    tournament: play.tournament,
    turn,
    turnAction,
    turnStarted: play.turnStarted,
  };
}
