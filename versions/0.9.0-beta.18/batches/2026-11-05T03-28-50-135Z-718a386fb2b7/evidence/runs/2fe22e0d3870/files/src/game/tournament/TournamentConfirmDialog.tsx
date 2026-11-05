import { useEffect, useRef } from 'react';
import type { SyntheticEvent } from 'react';
import type { TournamentLoad } from './format-read.ts';
import './tournament.css';

interface TournamentConfirmDialogProps {
  pending: TournamentLoad | 'leave' | null;
  cancel(): void;
  confirm(): void;
}

export function TournamentConfirmDialog({
  pending,
  cancel,
  confirm,
}: TournamentConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepPlaying = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pending) {
      if (dialog.current?.open) dialog.current.close();
      return;
    }
    if (!dialog.current?.open) dialog.current?.showModal();
    keepPlaying.current?.focus();
  }, [pending]);

  function cancelDecision(event?: SyntheticEvent<HTMLDialogElement>): void {
    event?.preventDefault();
    if (dialog.current?.open) dialog.current.close();
    cancel();
  }

  function confirmDecision(): void {
    if (dialog.current?.open) dialog.current.close();
    confirm();
  }

  return (
    <dialog ref={dialog} aria-labelledby="tournament-confirm-title" onCancel={cancelDecision}>
      <h3 id="tournament-confirm-title">
        {pending === 'leave' ? 'Leave tournament?' : 'Load this tournament?'}
      </h3>
      <p>
        {pending === 'leave'
          ? 'Current tournament progress will be discarded.'
          : 'Current tournament progress will be replaced.'}
      </p>
      <div className="tournament-actions">
        <button
          ref={keepPlaying}
          className="control"
          type="button"
          onClick={() => cancelDecision()}
        >
          {pending === 'leave' ? 'Keep playing' : 'Keep tournament'}
        </button>
        <button className="control" type="button" onClick={confirmDecision}>
          {pending === 'leave' ? 'Leave' : 'Load tournament'}
        </button>
      </div>
    </dialog>
  );
}
