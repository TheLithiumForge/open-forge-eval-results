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
  return (
    <dialog ref={dialog} className="leave-dialog" onCancel={close} aria-labelledby="leave-title">
      <h2 id="leave-title">Leave unfinished work?</h2>
      <p>Your unfinished game or tournament will be discarded.</p>
      <div className="tournament-actions">
        <button ref={keep} type="button" className="control" onClick={close}>
          Keep playing
        </button>
        <button
          type="button"
          className="control"
          onClick={() => {
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
