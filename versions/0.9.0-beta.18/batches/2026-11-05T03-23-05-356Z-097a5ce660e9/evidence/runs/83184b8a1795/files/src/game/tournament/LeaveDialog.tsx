import { useEffect, useRef } from 'react';
export function LeaveDialog({ leave, keep }: { leave(): void; keep(): void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    button.current?.focus();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        keep();
      }}
    >
      <p>Leave unfinished play?</p>
      <div className="tournament-actions">
        <button className="control" ref={button} onClick={keep}>
          Keep playing
        </button>
        <button className="control" onClick={leave}>
          Leave
        </button>
      </div>
    </dialog>
  );
}
