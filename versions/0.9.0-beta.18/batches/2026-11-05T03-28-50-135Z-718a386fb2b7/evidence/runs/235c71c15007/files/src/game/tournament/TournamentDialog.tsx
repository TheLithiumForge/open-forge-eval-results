import { useEffect, useRef } from 'react';
import type { SyntheticEvent } from 'react';

interface TournamentDialogProps {
  readonly action: 'leave' | 'load' | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly open: boolean;
}

export function TournamentDialog({ action, open, onCancel, onConfirm }: TournamentDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  function cancel(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault();
    onCancel();
  }

  return (
    <dialog
      ref={dialog}
      className="tournament-dialog"
      aria-labelledby="tournament-dialog-title"
      aria-describedby="tournament-dialog-description"
      onCancel={cancel}
    >
      <h3 id="tournament-dialog-title">
        {action === 'load' ? 'Load another tournament?' : 'Leave this unfinished tournament?'}
      </h3>
      <p id="tournament-dialog-description">
        {action === 'load'
          ? 'Your current tournament will be replaced by the tournament in the JSON box.'
          : 'Your current tournament will stop.'}
      </p>
      <div className="tournament-actions">
        <button className="control" type="button" autoFocus onClick={onCancel}>Keep playing</button>
        <button className="control" type="button" onClick={onConfirm}>
          {action === 'load' ? 'Load tournament' : 'Leave'}
        </button>
      </div>
    </dialog>
  );
}
