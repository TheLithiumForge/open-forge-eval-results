import { useEffect, useRef } from 'react';
import './tournament.css';

interface ConfirmationProps {
  action: 'leave' | 'load' | null;
  onClose(): void;
  onConfirm(): void;
}

export function TournamentConfirmation({ action, onClose, onConfirm }: ConfirmationProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepPlaying = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (action && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
      keepPlaying.current?.focus();
    }
  }, [action]);

  return (
    <dialog
      ref={dialog}
      className="tournament-confirmation"
      aria-labelledby="tournament-confirmation-heading"
      aria-describedby="tournament-confirmation-message"
      onClose={onClose}
    >
      <h3 id="tournament-confirmation-heading">
        {action === 'load' ? 'Replace this tournament?' : 'Leave this tournament?'}
      </h3>
      <p id="tournament-confirmation-message">
        {action === 'load'
          ? 'Loading will replace the active tournament.'
          : 'Unfinished tournament progress will be discarded.'}
      </p>
      <div className="tournament-actions">
        <button
          ref={keepPlaying}
          type="button"
          className="control"
          onClick={() => dialog.current?.close()}
        >
          Keep playing
        </button>
        <button
          type="button"
          className="control"
          onClick={() => {
            dialog.current?.close();
            onConfirm();
          }}
        >
          {action === 'load' ? 'Load tournament' : 'Leave tournament'}
        </button>
      </div>
    </dialog>
  );
}
