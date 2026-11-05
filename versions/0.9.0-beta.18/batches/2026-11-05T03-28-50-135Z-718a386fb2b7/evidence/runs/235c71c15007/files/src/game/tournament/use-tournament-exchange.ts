import { useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { decodeTournament, encodeTournament, TOURNAMENT_MAX_BYTES } from './tournament-format.ts';
import { findUnknownTournamentField } from './tournament-unknown-field.ts';
import type { Tournament, TournamentDraft, TournamentResult } from './tournament.ts';
import type { TournamentTurnHandle } from './TournamentTurn.tsx';

export type TournamentDialogAction = 'leave' | 'load' | null;

export interface TournamentExchangeOptions {
  readonly draft: TournamentDraft;
  readonly history: readonly Tournament[];
  readonly onBack: () => void;
  readonly result: TournamentResult | null;
  readonly setAutoFocusBoard: Dispatch<SetStateAction<boolean>>;
  readonly setDraft: Dispatch<SetStateAction<TournamentDraft>>;
  readonly setGameFeedback: Dispatch<SetStateAction<{ readonly key: string; readonly number: number; readonly text: string }>>;
  readonly setGameSnapshot: Dispatch<SetStateAction<string | null>>;
  readonly setSaveWhenComplete: Dispatch<SetStateAction<boolean>>;
  readonly setStartButtonVisible: Dispatch<SetStateAction<boolean>>;
  readonly setTournament: Dispatch<SetStateAction<Tournament | null>>;
  readonly setTurnStarted: Dispatch<SetStateAction<boolean>>;
  readonly tournament: Tournament | null;
  readonly turnRef: MutableRefObject<TournamentTurnHandle | null>;
  readonly turnStarted: boolean;
}

export function useTournamentExchange(options: TournamentExchangeOptions) {
  const [json, setJson] = useState('');
  const [notice, setNotice] = useState({ message: '', number: 0 });
  const [dialogAction, setDialogAction] = useState<TournamentDialogAction>(null);
  const [pendingTransfer, setPendingTransfer] = useState<ReturnType<typeof decodeTournament>>(null);

  function publish(message: string): void {
    setNotice((previous) => ({ message, number: previous.number + 1 }));
  }

  function clearNotice(): void {
    setNotice((previous) => ({ ...previous, message: '' }));
  }

  function exportCurrent(): void {
    const tournament = options.tournament ?? options.history[0] ?? null;
    const gameSnapshot =
      options.tournament && options.result === null && options.turnStarted
        ? options.turnRef.current?.exportSnapshot() ?? null
        : null;
    const output = encodeTournament({ draft: options.draft, gameSnapshot, tournament });
    if (new TextEncoder().encode(output).byteLength > TOURNAMENT_MAX_BYTES) {
      publish('Tournament export is too large.');
      return;
    }
    setJson(output);
    publish('Tournament exported to the JSON box.');
  }

  function loadFromJson(): void {
    const unknownField = findUnknownTournamentField(json);
    if (unknownField) {
      publish(`Unknown field: ${unknownField}.`);
      return;
    }
    const transfer = decodeTournament(json);
    if (!transfer) {
      publish('Invalid tournament JSON.');
      return;
    }
    if (options.tournament?.status === 'active') {
      setPendingTransfer(transfer);
      setDialogAction('load');
      return;
    }
    applyTransfer(transfer);
  }

  function applyTransfer(transfer: NonNullable<ReturnType<typeof decodeTournament>>): void {
    options.setDraft(transfer.draft);
    options.setTournament(transfer.tournament);
    options.setGameSnapshot(transfer.gameSnapshot);
    options.setTurnStarted(transfer.gameSnapshot !== null);
    options.setStartButtonVisible(false);
    options.setAutoFocusBoard(false);
    options.setSaveWhenComplete(transfer.tournament !== null);
    options.setGameFeedback({ key: '', number: 0, text: '' });
    publish('Tournament loaded.');
  }

  function requestLeave(): void {
    setDialogAction('leave');
  }

  function cancelDialog(): void {
    setDialogAction(null);
    setPendingTransfer(null);
  }

  function confirmDialog(): void {
    const action = dialogAction;
    setDialogAction(null);
    if (action === 'leave') {
      options.setTournament(null);
      options.setGameSnapshot(null);
      options.setTurnStarted(false);
      options.setSaveWhenComplete(false);
      options.onBack();
      return;
    }
    if (action === 'load' && pendingTransfer) applyTransfer(pendingTransfer);
    setPendingTransfer(null);
  }

  return {
    cancelDialog,
    clearNotice,
    confirmDialog,
    dialogAction,
    exportCurrent,
    json,
    loadFromJson,
    notice,
    publish,
    requestLeave,
    setJson,
  };
}
