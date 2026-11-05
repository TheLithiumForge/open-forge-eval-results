import { useEffect, useRef } from 'react';
import { TournamentControl } from './tournament-labels.ts';
import '../controls/control.css';

interface LeaveDialogProps {
  keep(): void;
  leave(): void;
}

// Leaving unfinished work asks first. Keep playing takes focus, and Escape keeps playing.
export function LeaveDialog({ keep, leave }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
    keepButton.current?.focus();
  }, []);
  return (
    <dialog ref={dialog} className="leave-dialog" aria-labelledby="leave-title" onClose={keep}>
      <p id="leave-title">Leave the tournament? Its results so far will be lost.</p>
      <div className="tournament-actions">
        <button
          ref={keepButton}
          type="button"
          className="control"
          onClick={() => dialog.current?.close()}
        >
          {TournamentControl.keep}
        </button>
        <button type="button" className="control" onClick={leave}>
          {TournamentControl.confirmLeave}
        </button>
      </div>
    </dialog>
  );
}
