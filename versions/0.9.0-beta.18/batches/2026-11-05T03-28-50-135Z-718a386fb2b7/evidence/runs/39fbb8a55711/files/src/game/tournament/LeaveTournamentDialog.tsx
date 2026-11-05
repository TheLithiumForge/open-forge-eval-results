import { useEffect, useRef } from 'react';

interface LeaveTournamentDialogProps {
  close(): void;
  leave(): void;
  open: boolean;
}

export function LeaveTournamentDialog({ open, close, leave }: LeaveTournamentDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepPlaying = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!open || !element || element.open) return;
    element.showModal();
    keepPlaying.current?.focus();
  }, [open]);

  function confirmLeave(): void {
    dialog.current?.close();
    leave();
  }

  return (
    <dialog className="tournament-dialog" ref={dialog} onClose={close}>
      <h3>Leave tournament?</h3>
      <p>The unfinished tournament will be discarded.</p>
      <div className="tournament-actions">
        <button
          ref={keepPlaying}
          className="control"
          type="button"
          onClick={() => dialog.current?.close()}
        >
          Keep playing
        </button>
        <button className="control" type="button" onClick={confirmLeave}>
          Leave
        </button>
      </div>
    </dialog>
  );
}
