import { useImperativeHandle, useRef } from 'react';
import type { RefObject } from 'react';

export interface LeaveConfirmation {
  ask(action: () => void): void;
}

export function LeaveDialog({ ref }: { ref: RefObject<LeaveConfirmation | null> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const action = useRef<(() => void) | null>(null);
  useImperativeHandle(ref, () => ({
    ask(next) {
      action.current = next;
      dialog.current?.showModal();
      keep.current?.focus();
    },
  }));
  return (
    <dialog
      ref={dialog}
      className="tournament-dialog"
      aria-labelledby="leave-title"
      onCancel={() => {
        action.current = null;
      }}
    >
      <h2 id="leave-title">Leave unfinished work?</h2>
      <div className="tournament-actions">
        <button
          type="button"
          className="control"
          ref={keep}
          onClick={() => {
            action.current = null;
            dialog.current?.close();
          }}
        >
          Keep playing
        </button>
        <button
          type="button"
          className="control"
          onClick={() => {
            const next = action.current;
            action.current = null;
            dialog.current?.close();
            next?.();
          }}
        >
          Leave
        </button>
      </div>
    </dialog>
  );
}
