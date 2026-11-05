import { useEffect, useRef } from 'react';

interface LeaveDialogProps {
  action: (() => void) | null;
  close(): void;
}

export function LeaveDialog({ action, close }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (action) dialog.current?.showModal();
    else dialog.current?.close();
  }, [action]);
  function keepPlaying(): void {
    dialog.current?.close();
    close();
  }
  return (
    <dialog
      className="tournament-dialog"
      ref={dialog}
      aria-labelledby="leave-title"
      onCancel={(event) => {
        event.preventDefault();
        keepPlaying();
      }}
    >
      <h2 id="leave-title">Leave unfinished play?</h2>
      <p>Your current progress will be discarded.</p>
      <div className="tournament-actions">
        <button type="button" className="control" autoFocus onClick={keepPlaying}>
          Keep playing
        </button>
        <button
          type="button"
          className="control"
          onClick={() => {
            const leave = action;
            dialog.current?.close();
            close();
            leave?.();
          }}
        >
          Leave
        </button>
      </div>
    </dialog>
  );
}
