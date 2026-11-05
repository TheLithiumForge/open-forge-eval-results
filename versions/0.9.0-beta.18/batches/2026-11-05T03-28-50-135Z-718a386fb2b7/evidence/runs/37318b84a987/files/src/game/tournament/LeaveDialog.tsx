import { useEffect, useRef } from 'react';
export function LeaveDialog({ leave, keep }: { leave(): void; keep(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    button.current?.focus();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        keep();
      }}
    >
      <p>Leave this unfinished game?</p>
      <div className="tournament-actions">
        <button ref={button} className="control" type="button" onClick={keep}>
          Keep playing
        </button>
        <button className="control" type="button" onClick={leave}>
          Leave
        </button>
      </div>
    </dialog>
  );
}
