import { useLayoutEffect, useRef } from 'react';
import { TournamentControl } from './labels.ts';
import '../controls/control.css';
import './tournament.css';

interface LeaveDialogProps {
  // The question while the dialog is open, or null while it is closed.
  question: string | null;
  keepPlaying(): void;
  leave(): void;
}

// Asks before unfinished work is left. Keep playing takes focus, and Escape keeps playing.
export function LeaveDialog({ question, keepPlaying, leave }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (question !== null && !element.open) {
      element.showModal();
      keep.current?.focus();
    } else if (question === null && element.open) element.close();
  }, [question]);
  return (
    <dialog
      ref={dialog}
      className="leave-dialog"
      aria-labelledby="leave-question"
      onClose={() => {
        if (question !== null) keepPlaying();
      }}
    >
      <p id="leave-question">{question}</p>
      <div className="tournament-row">
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
