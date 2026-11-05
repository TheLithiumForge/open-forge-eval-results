import type { RefObject } from 'react';

export function LeaveDialog({
  ref,
  leave,
}: {
  ref: RefObject<HTMLDialogElement | null>;
  leave(): void;
}) {
  return (
    <dialog
      ref={ref}
      onKeyDown={(event) => {
        if (event.key === 'Escape') ref.current?.close();
      }}
    >
      <p>Leave unfinished work?</p>
      <div className="tournament-actions">
        <button className="control" type="button" autoFocus onClick={() => ref.current?.close()}>
          Keep playing
        </button>
        <button
          className="control"
          type="button"
          onClick={() => {
            ref.current?.close();
            leave();
          }}
        >
          Leave
        </button>
      </div>
    </dialog>
  );
}
