import { useEffect, useRef } from 'react';

interface LeaveDialogProps {
  leave: (() => void) | null;
  close(): void;
}

export function LeaveDialog({ leave, close }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!leave) return;
    const trigger = document.activeElement;
    dialog.current?.showModal();
    keep.current?.focus();
    return () => {
      dialog.current?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, [leave]);
  return (
    <dialog
      ref={dialog}
      className="leave-dialog"
      aria-labelledby="leave-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <h2 id="leave-title">Leave unfinished play?</h2>
      <p>Your current progress will be lost.</p>
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
