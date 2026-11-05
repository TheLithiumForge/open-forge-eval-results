import type { RefObject } from 'react';
export function LeaveDialog({
  dialog,
  pending,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  pending: RefObject<(() => void) | null>;
}) {
  return (
    <dialog
      ref={dialog}
      onCancel={() => {
        pending.current = null;
      }}
    >
      <p>Leave this tournament?</p>
      <button type="button" className="control" autoFocus onClick={() => dialog.current?.close()}>
        Keep playing
      </button>
      <button
        type="button"
        className="control"
        onClick={() => {
          dialog.current?.close();
          pending.current?.();
          pending.current = null;
        }}
      >
        Leave
      </button>
    </dialog>
  );
}
