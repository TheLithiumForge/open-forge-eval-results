import { useLayoutEffect, useRef } from 'react';

export function LeaveDialog({ leave, cancel }: { leave(): void; cancel(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="leave-dialog"
      aria-labelledby="leave-title"
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
    >
      <h2 id="leave-title">Leave unfinished work?</h2>
      <p>Your current progress will be discarded.</p>
      <div className="tournament-actions">
        <button className="control" type="button" autoFocus onClick={cancel}>
          Keep playing
        </button>
        <button className="control" type="button" onClick={leave}>
          Leave
        </button>
      </div>
    </dialog>
  );
}
