import type { RefObject } from 'react';
interface Props {
  dialog: RefObject<HTMLDialogElement | null>;
  keep: RefObject<HTMLButtonElement | null>;
  pending: RefObject<(() => void) | null>;
}
export function TournamentDialog({ dialog, keep, pending }: Props) {
  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        dialog.current?.close();
        pending.current = null;
      }}
    >
      <p>Leave this unfinished tournament?</p>
      <div className="tournament-actions">
        <button
          ref={keep}
          className="control"
          onClick={() => {
            dialog.current?.close();
            pending.current = null;
          }}
        >
          Keep playing
        </button>
        <button
          className="control"
          onClick={() => {
            dialog.current?.close();
            const action = pending.current;
            pending.current = null;
            action?.();
          }}
        >
          Leave
        </button>
      </div>
    </dialog>
  );
}
