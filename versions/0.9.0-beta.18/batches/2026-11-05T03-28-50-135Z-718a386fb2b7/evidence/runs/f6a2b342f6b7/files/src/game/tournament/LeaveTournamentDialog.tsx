import { useLayoutEffect, useRef } from 'react';

interface LeaveTournamentDialogProps {
  open: boolean;
  loading: boolean;
  confirm(): void;
  cancel(): void;
}

export function LeaveTournamentDialog({
  open,
  loading,
  confirm,
  cancel,
}: LeaveTournamentDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepPlaying = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      keepPlaying.current?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="tournament-dialog"
      aria-labelledby="leave-tournament-heading"
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
    >
      <h3 id="leave-tournament-heading">
        {loading ? 'Load another tournament?' : 'Leave unfinished tournament?'}
      </h3>
      <p>
        {loading
          ? 'Loading this tournament will replace the current tournament.'
          : 'The current tournament will stop.'}
      </p>
      <div className="tournament-actions">
        <button type="button" className="control" ref={keepPlaying} onClick={cancel}>
          Keep playing
        </button>
        <button type="button" className="control" onClick={confirm}>
          Leave
        </button>
      </div>
    </dialog>
  );
}
