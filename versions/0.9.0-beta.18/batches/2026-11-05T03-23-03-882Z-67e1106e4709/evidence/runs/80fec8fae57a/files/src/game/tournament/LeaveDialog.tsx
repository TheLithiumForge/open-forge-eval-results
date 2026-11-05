import { useLayoutEffect, useRef } from 'react';

interface LeaveDialogProps {
  leave(): void;
  keepPlaying(): void;
}

export function LeaveDialog({ leave, keepPlaying }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    keep.current?.focus();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="leave-dialog"
      aria-labelledby="leave-title"
      onCancel={(event) => {
        event.preventDefault();
        keepPlaying();
      }}
    >
      <h2 id="leave-title">Leave unfinished play?</h2>
      <p>You can keep playing or leave this screen.</p>
      <div className="tournament-actions">
        <button ref={keep} type="button" className="control" onClick={keepPlaying}>
          Keep playing
        </button>
        <button type="button" className="control" onClick={leave}>
          Leave
        </button>
      </div>
    </dialog>
  );
}
