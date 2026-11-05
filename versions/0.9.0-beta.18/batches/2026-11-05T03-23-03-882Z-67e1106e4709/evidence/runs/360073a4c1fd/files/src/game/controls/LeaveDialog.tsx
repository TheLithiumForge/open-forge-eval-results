import { useEffect, useRef } from 'react';
import './control.css';
import './leave-dialog.css';

interface LeaveDialogProps {
  action: (() => void) | null;
  close(): void;
}

export function LeaveDialog({ action, close }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (action) {
      dialog.current?.showModal();
      keep.current?.focus();
    } else dialog.current?.close();
  }, [action]);
  return (
    <dialog ref={dialog} aria-labelledby="leave-title" onCancel={close}>
      <h2 id="leave-title">Leave unfinished play?</h2>
      <p>Your current progress will be lost.</p>
      <div className="leave-actions">
        <button className="control" ref={keep} onClick={close}>
          Keep playing
        </button>
        <button
          className="control"
          onClick={() => {
            dialog.current?.close();
            close();
            action?.();
          }}
        >
          Leave
        </button>
      </div>
    </dialog>
  );
}
