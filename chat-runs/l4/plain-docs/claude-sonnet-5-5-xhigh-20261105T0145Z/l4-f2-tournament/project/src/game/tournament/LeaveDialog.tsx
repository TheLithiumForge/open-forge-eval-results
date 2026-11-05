import { useEffect, useRef } from 'react';
import { TournamentControl, TournamentText } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

interface LeaveDialogProps {
  open: boolean;
  keepPlaying(): void;
  leave(): void;
}

// Leaving unfinished work asks first. Keep playing takes focus and Escape keeps playing.
export function LeaveDialog({ open, keepPlaying, leave }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      keep.current?.focus();
    }
    if (!open && element.open) element.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="leave-dialog"
      aria-labelledby="leave-title"
      onClose={keepPlaying}
    >
      <h3 id="leave-title">{TournamentText.leaveTitle}</h3>
      <p>{TournamentText.leaveBody}</p>
      <div className="control-row">
        <button ref={keep} type="button" className="control" onClick={keepPlaying}>
          {TournamentControl.keepPlaying}
        </button>
        <button type="button" className="control" onClick={leave}>
          {TournamentControl.confirmLeave}
        </button>
      </div>
    </dialog>
  );
}
