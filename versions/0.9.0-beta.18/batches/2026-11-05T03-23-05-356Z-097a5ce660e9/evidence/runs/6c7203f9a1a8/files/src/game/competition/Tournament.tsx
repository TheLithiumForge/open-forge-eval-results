import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TournamentHistory } from './TournamentHistory.tsx';
import { TournamentDialog } from './TournamentDialog.tsx';
import { decodeTournamentTransfer } from './format.ts';
import { firstUnknownTournamentField } from './format-unknown-field.ts';
import { validatePlayerNames } from './names.ts';
import { TournamentPlay } from './TournamentPlay.tsx';
import { TournamentSetup } from './TournamentSetup.tsx';
import { TournamentTransferPanel } from './TournamentTransferPanel.tsx';
import { useTournament } from './use-tournament.ts';
import type { FormEvent, RefObject } from 'react';
import type { BoardFocus } from '../board/Board.tsx';
import type { TournamentTransfer } from './format.ts';
import type { TournamentDraft } from './TournamentSetup.tsx';
import type { TournamentPhase } from './rules.ts';
import './tournament.css';

interface TournamentProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onAnnouncement(message: string): void;
  onBack(): void;
}

export function Tournament({ headingRef, onAnnouncement, onBack }: TournamentProps) {
  const [draft, setDraft] = useState<TournamentDraft>(() => ({
    playerCount: 4,
    players: Array.from({ length: 8 }, () => ''),
  }));
  const [json, setJson] = useState('');
  const [confirmation, setConfirmation] = useState<'leave' | 'load' | null>(null);
  const controller = useTournament(onAnnouncement);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const keepButton = useRef<HTMLButtonElement | null>(null);
  const backButton = useRef<HTMLButtonElement | null>(null);
  const startButton = useRef<HTMLButtonElement | null>(null);
  const board = useRef<BoardFocus | null>(null);
  const pendingTransfer = useRef<TournamentTransfer | null>(null);
  const focusStart = useRef(false);
  const focusBoard = useRef(false);
  const focusHeading = useRef(false);
  const previousPhase = useRef<TournamentPhase | undefined>(undefined);
  const tournament = controller.session.tournament;
  const phase = tournament?.phase;

  useEffect(() => {
    if (!confirmation || !dialog.current) return;
    dialog.current.showModal();
    keepButton.current?.focus();
  }, [confirmation]);

  useLayoutEffect(() => {
    if (focusHeading.current && !tournament) {
      headingRef.current?.focus();
      focusHeading.current = false;
    }
    if (focusStart.current && phase === 'ready') {
      startButton.current?.focus();
      focusStart.current = false;
    }
    if (focusBoard.current && controller.session.game) {
      board.current?.focusRemembered();
      focusBoard.current = false;
    }
    if (phase === 'complete' && previousPhase.current === 'playing') backButton.current?.focus();
    previousPhase.current = phase;
  }, [controller.session.game, headingRef, phase, tournament]);

  function start(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const checked = validatePlayerNames(
      draft.players.slice(0, draft.playerCount),
      draft.playerCount,
    );
    if (!checked.ok) {
      onAnnouncement(checked.error);
      return;
    }
    const players = [...checked.names];
    setDraft({
      playerCount: draft.playerCount,
      players: [...players, ...draft.players.slice(players.length)],
    });
    focusStart.current = true;
    if (!controller.begin(draft.playerCount, players)) {
      focusStart.current = false;
      onAnnouncement('Could not start tournament.');
    }
  }

  function requestLoad(): void {
    const unknown = firstUnknownTournamentField(json);
    if (unknown) {
      onAnnouncement(`Unknown field: ${unknown}.`);
      return;
    }
    const transfer = decodeTournamentTransfer(json);
    if (!transfer) {
      onAnnouncement('Invalid tournament.');
      return;
    }
    if (tournament && phase !== 'complete') {
      pendingTransfer.current = transfer;
      setConfirmation('load');
      return;
    }
    setDraft(transfer.setup);
    controller.load(transfer);
  }

  function confirm(): void {
    const action = confirmation;
    setConfirmation(null);
    if (action === 'leave') {
      focusHeading.current = true;
      controller.leave();
    } else if (action === 'load' && pendingTransfer.current) {
      const transfer = pendingTransfer.current;
      pendingTransfer.current = null;
      setDraft(transfer.setup);
      controller.load(transfer);
    }
  }

  function cancel(): void {
    pendingTransfer.current = null;
    setConfirmation(null);
  }

  function exportJson(): void {
    const text = controller.exportTournament(draft);
    if (!text) {
      onAnnouncement('Tournament JSON is too large.');
      return;
    }
    setJson(text);
    onAnnouncement('Tournament exported to JSON box.');
  }

  return (
    <section className="tournament-screen" aria-labelledby="tournament-heading">
      <h2 id="tournament-heading" ref={headingRef} tabIndex={-1}>
        Tournament
      </h2>
      {tournament ? (
        <TournamentPlay
          tournament={tournament}
          game={controller.session.game}
          generation={controller.session.generation}
          board={board}
          startButton={startButton}
          backButton={backButton}
          onActivate={controller.activate}
          onStartTurn={() => {
            focusBoard.current = true;
            controller.startCurrentTurn();
          }}
          onNextTurn={() => {
            focusStart.current = true;
            controller.advanceTurn();
          }}
          onNextMatch={() => {
            focusStart.current = true;
            controller.advanceMatch();
          }}
          onLeave={() => setConfirmation('leave')}
          onBack={onBack}
        />
      ) : (
        <TournamentSetup draft={draft} onChange={setDraft} onStart={start} onBack={onBack} />
      )}
      <TournamentTransferPanel
        json={json}
        onChange={setJson}
        onExport={exportJson}
        onLoad={requestLoad}
      />
      <TournamentHistory
        available={controller.history.available}
        records={controller.history.records}
      />
      <TournamentDialog
        confirmation={confirmation}
        dialog={dialog}
        keepButton={keepButton}
        onCancel={cancel}
        onConfirm={confirm}
        onKeep={cancel}
      />
    </section>
  );
}
