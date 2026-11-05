import { useEffect, useRef } from 'react';
export function LeaveDialog({
  confirmAction,
  setConfirmAction,
}: {
  confirmAction: (() => void) | null;
  setConfirmAction(action: (() => void) | null): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirmAction) {
      dialog.current?.showModal();
      keep.current?.focus();
    }
  }, [confirmAction]);
  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        dialog.current?.close();
        setConfirmAction(null);
      }}
    >
      <p>Leave unfinished work?</p>
      <div className="exchange-buttons">
        <button
          className="control"
          ref={keep}
          type="button"
          onClick={() => {
            dialog.current?.close();
            setConfirmAction(null);
          }}
        >
          Keep playing
        </button>
        <button
          className="control"
          type="button"
          onClick={() => {
            dialog.current?.close();
            confirmAction?.();
            setConfirmAction(null);
          }}
        >
          Leave
        </button>
      </div>
    </dialog>
  );
}
