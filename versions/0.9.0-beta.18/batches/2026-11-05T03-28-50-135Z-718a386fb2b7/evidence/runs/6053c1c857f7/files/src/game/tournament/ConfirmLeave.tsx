import { useEffect, useRef } from 'react';

export function ConfirmLeave({ keep, leave }: { keep(): void; leave(): void }) {
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
      <p>Leave unfinished work?</p>
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
