import { useEffect, useRef } from 'react';

interface LeaveDialogProps {
  leave: (() => void) | null;
  close(): void;
}

export function LeaveDialog({ leave, close }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (leave) {
      dialog.current?.showModal();
      keep.current?.focus();
    } else dialog.current?.close();
  }, [leave]);
  function keepPlaying(): void {
    dialog.current?.close();
    close();
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="leave-title"
      onCancel={(event) => {
        event.preventDefault();
        keepPlaying();
      }}
    >
      <h2 id="leave-title">Leave unfinished play?</h2>
      <p>Your unfinished game or tournament will be left.</p>
      <div className="tournament-actions">
        <button className="control" type="button" ref={keep} onClick={keepPlaying}>
          Keep playing
        </button>
        <button
          className="control"
          type="button"
          onClick={() => {
            keepPlaying();
            leave?.();
          }}
        >
          Leave
        </button>
      </div>
    </dialog>
  );
}
