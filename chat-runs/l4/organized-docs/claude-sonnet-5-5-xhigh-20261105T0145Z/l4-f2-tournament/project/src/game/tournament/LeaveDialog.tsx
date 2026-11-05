import { useEffect, useRef } from 'react';
import { LeaveDialogControl } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

interface LeaveDialogProps {
  keepPlaying(): void;
  leave(): void;
}

// Leaving unfinished work asks first. Keep playing takes focus and Escape keeps playing.
export function LeaveDialog({ keepPlaying, leave }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!element.open) element.showModal();
    keep.current?.focus();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="leave-dialog"
      aria-labelledby="leave-question"
      onClose={keepPlaying}
    >
      <p id="leave-question">{LeaveDialogControl.question}</p>
      <div className="tournament-row">
        <button
          ref={keep}
          type="button"
          className="control"
          onClick={() => dialog.current?.close()}
        >
          {LeaveDialogControl.keep}
        </button>
        <button type="button" className="control" onClick={leave}>
          {LeaveDialogControl.leave}
        </button>
      </div>
    </dialog>
  );
}
