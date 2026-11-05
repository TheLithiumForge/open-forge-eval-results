import { useEffect, useRef } from 'react';

interface LeaveDialogProps {
  action: (() => void) | null;
  close(): void;
}

export function LeaveDialog({ action, close }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!action) return;
    dialog.current?.showModal();
    keep.current?.focus();
  }, [action]);
  function keepPlaying(): void {
    dialog.current?.close();
    close();
  }
  if (!action) return null;
  return (
    <dialog
      ref={dialog}
      aria-labelledby="leave-heading"
      onCancel={(event) => {
        event.preventDefault();
        keepPlaying();
      }}
    >
      <h2 id="leave-heading">Leave unfinished play?</h2>
      <div className="tournament-actions">
        <button className="control" type="button" ref={keep} onClick={keepPlaying}>
          Keep playing
        </button>
        <button
          className="control"
          type="button"
          onClick={() => {
            action();
            close();
          }}
        >
          Leave
        </button>
      </div>
    </dialog>
  );
}
