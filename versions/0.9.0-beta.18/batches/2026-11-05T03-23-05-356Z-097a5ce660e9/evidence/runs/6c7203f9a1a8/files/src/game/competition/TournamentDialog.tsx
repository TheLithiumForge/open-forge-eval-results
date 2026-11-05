import type { RefObject } from 'react';

interface TournamentDialogProps {
  confirmation: 'leave' | 'load' | null;
  dialog: RefObject<HTMLDialogElement | null>;
  keepButton: RefObject<HTMLButtonElement | null>;
  onCancel(): void;
  onConfirm(): void;
  onKeep(): void;
}

export function TournamentDialog({
  confirmation,
  dialog,
  keepButton,
  onCancel,
  onConfirm,
  onKeep,
}: TournamentDialogProps) {
  return (
    <dialog
      ref={dialog}
      className="tournament-dialog"
      aria-labelledby="tournament-confirmation"
      onCancel={onCancel}
    >
      <p id="tournament-confirmation">
        {confirmation === 'leave'
          ? 'Leave this unfinished tournament? Its bracket won’t be saved.'
          : 'Load this tournament and leave the current tournament?'}
      </p>
      <div className="tournament-actions">
        <button
          ref={keepButton}
          type="button"
          className="control"
          onClick={() => {
            dialog.current?.close();
            onKeep();
          }}
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
          {confirmation === 'leave' ? 'Leave' : 'Load tournament'}
        </button>
      </div>
    </dialog>
  );
}
