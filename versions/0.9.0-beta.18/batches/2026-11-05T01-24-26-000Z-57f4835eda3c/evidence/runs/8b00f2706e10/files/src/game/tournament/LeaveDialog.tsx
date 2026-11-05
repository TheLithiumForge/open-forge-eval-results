import { useLayoutEffect, useRef } from 'react';
import { LeaveQuestion } from './tournament-labels.ts';
import '../controls/control.css';
import './tournament.css';

interface LeaveDialogProps {
  question: string;
  keep(): void;
  leave(): void;
}

// A native modal that opens with Keep playing focused. Escape keeps playing too.
export function LeaveDialog({ question, keep, leave }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    keepButton.current?.focus();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="leave-dialog"
      aria-labelledby="leave-question"
      onCancel={(event) => {
        event.preventDefault();
        keep();
      }}
    >
      <p id="leave-question">{question}</p>
      <div className="tournament-actions">
        <button ref={keepButton} type="button" className="control" onClick={keep}>
          {LeaveQuestion.keep}
        </button>
        <button type="button" className="control" onClick={leave}>
          {LeaveQuestion.leave}
        </button>
      </div>
    </dialog>
  );
}
