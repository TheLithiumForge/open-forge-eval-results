import { useLayoutEffect, useRef } from 'react';
import { TournamentControl, TournamentText } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

interface LeaveDialogProps {
  open: boolean;
  keep(): void;
  leave(): void;
}

// Leaving an unfinished tournament asks first. Keep playing takes focus, and Escape keeps playing.
// Closing returns focus to the control that opened the dialog. Turns keep their clock meanwhile.
export function LeaveDialog({ open, keep, leave }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element || element.open === open) return;
    if (!open) return element.close();
    element.showModal();
    keepButton.current?.focus();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="leave-dialog"
      aria-labelledby="leave-title"
      aria-describedby="leave-detail"
      onClose={keep}
    >
      <h3 id="leave-title">{TournamentText.leaveTitle}</h3>
      <p id="leave-detail">{TournamentText.leaveDetail}</p>
      <div className="tournament-actions">
        <button ref={keepButton} type="button" className="control" onClick={keep}>
          {TournamentControl.keepPlaying}
        </button>
        <button type="button" className="control" onClick={leave}>
          {TournamentControl.confirmLeave}
        </button>
      </div>
    </dialog>
  );
}
