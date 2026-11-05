import { useLayoutEffect, useRef } from 'react';
import { TournamentControl } from './tournament-labels.ts';

interface LeaveDialogProps {
  keep(): void;
  leave(): void;
}

// Leaving unfinished work asks first. Keep playing takes focus, and Escape keeps playing too.
// Nothing changes until the dialog closes with a decision.
export function LeaveDialog({ keep, leave }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  const leaving = useRef(false);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    keepButton.current?.focus();
  }, []);
  function close(confirmed: boolean): void {
    leaving.current = confirmed;
    dialog.current?.close();
  }
  return (
    <dialog
      ref={dialog}
      className="leave-dialog"
      aria-labelledby="leave-title"
      aria-describedby="leave-text"
      onClose={() => (leaving.current ? leave() : keep())}
    >
      <h3 id="leave-title">Leave this tournament?</h3>
      <p id="leave-text">Leaving ends it now. Its results so far won't be kept.</p>
      <div className="tournament-actions">
        <button ref={keepButton} type="button" className="control" onClick={() => close(false)}>
          {TournamentControl.keepPlaying}
        </button>
        <button type="button" className="control" onClick={() => close(true)}>
          {TournamentControl.confirmLeave}
        </button>
      </div>
    </dialog>
  );
}
