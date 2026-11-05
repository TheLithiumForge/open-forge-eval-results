import { useLayoutEffect, useRef } from 'react';

interface LeaveDialogProps {
  leave(): void;
  keepPlaying(): void;
}

export function LeaveDialog({ leave, keepPlaying }: LeaveDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    keep.current?.focus();
    return () => {
      dialog.current?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
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
      <p>Your unfinished progress will be lost.</p>
      <div className="tournament-actions">
        <button type="button" className="control" ref={keep} onClick={keepPlaying}>
          Keep playing
        </button>
        <button type="button" className="control" onClick={leave}>
          Leave
        </button>
      </div>
    </dialog>
  );
}
