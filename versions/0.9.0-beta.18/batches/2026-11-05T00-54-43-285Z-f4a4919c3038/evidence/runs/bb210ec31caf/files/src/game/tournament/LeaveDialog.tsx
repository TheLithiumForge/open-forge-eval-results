import { useEffect, useRef } from 'react';

interface LeaveDialogProps {
  action: (() => void) | null;
  dismiss(): void;
}

export function LeaveDialog({ action, dismiss }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (action) {
      dialog.current?.showModal();
      keep.current?.focus();
    } else dialog.current?.close();
  }, [action]);
  return (
    <dialog
      ref={dialog}
      className="tournament-dialog"
      aria-labelledby="leave-title"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
    >
      <h2 id="leave-title">Leave unfinished play?</h2>
      <p>Keep playing to continue, or Leave to switch screens.</p>
      <div className="tournament-actions">
        <button ref={keep} type="button" className="control" onClick={dismiss}>
          Keep playing
        </button>
        <button
          type="button"
          className="control"
          onClick={() => {
            dialog.current?.close();
            dismiss();
            action?.();
          }}
        >
          Leave
        </button>
      </div>
    </dialog>
  );
}
