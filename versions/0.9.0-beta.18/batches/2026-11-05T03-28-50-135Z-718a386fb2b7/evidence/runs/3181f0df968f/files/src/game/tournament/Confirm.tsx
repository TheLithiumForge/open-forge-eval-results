import { useEffect, useRef } from 'react';
import './tournament.css';

export function Confirm({ leave, cancel }: { leave(): void; cancel(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    keep.current?.focus();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
    >
      <p>Leave this unfinished game?</p>
      <div className="tournament-actions">
        <button className="control" ref={keep} onClick={cancel}>
          Keep playing
        </button>
        <button className="control" onClick={leave}>
          Leave
        </button>
      </div>
    </dialog>
  );
}
